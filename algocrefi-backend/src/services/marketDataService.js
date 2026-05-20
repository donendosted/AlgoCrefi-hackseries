const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const algosdk = require("algosdk");
const { poolUtils } = require("@tinymanorg/tinyman-js-sdk");
const PoolSnapshot = require("../models/poolSnapshotModel");

const indexerClient = new algosdk.Indexer(
  process.env.INDEXER_TOKEN || "",
  process.env.INDEXER_SERVER || "https://testnet-idx.algonode.cloud",
  process.env.INDEXER_PORT || ""
);

function getAlgodClient() {
  return new algosdk.Algodv2(
    process.env.ALGOD_TOKEN || "",
    process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
    process.env.ALGOD_PORT || ""
  );
}

function getTinymanNetwork() {
  return process.env.TINYMAN_NETWORK || "testnet";
}

function getTinymanAnalyticsBase() {
  const explicit = String(process.env.TINYMAN_ANALYTICS_BASE_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  return getTinymanNetwork() === "mainnet"
    ? "https://mainnet.analytics.tinyman.org/api"
    : "https://testnet.analytics.tinyman.org/api";
}

const poolConfigCache = { data: null, ts: 0 };
const POOL_CONFIG_TTL_MS = 60 * 1000;

function normalizeAddress(value) {
  return String(value || "").trim().toUpperCase();
}

function getPoolAddress(pool) {
  if (typeof pool?.account?.address !== "function") return "";
  return String(pool.account.address()?.toString?.() || "").trim();
}

async function fetchPoolReserves(algod, pool) {
  try {
    return await poolUtils.v2.getPoolReserves(algod, pool);
  } catch {
    return poolUtils.v1_1.getPoolReserves(algod, pool);
  }
}

async function getPairPools(algod, network, quoteAssetId) {
  const [v1Pool, v2Pool] = await poolUtils.getPoolsForPair({
    client: algod,
    network,
    asset1ID: quoteAssetId,
    asset2ID: 0,
  });

  return [v1Pool, v2Pool].filter((pool) => poolUtils.isPoolReady(pool));
}

async function resolveTinymanPoolConfig() {
  const quoteAssetId = Number(process.env.USDC_ASA_ID || process.env.TINYMAN_QUOTE_ASA_ID || 10458941);
  const quoteDecimals = Number(process.env.USDC_DECIMALS || process.env.TINYMAN_QUOTE_DECIMALS || 6);
  const network = getTinymanNetwork();
  const now = Date.now();
  if (poolConfigCache.data && now - poolConfigCache.ts < POOL_CONFIG_TTL_MS) {
    return poolConfigCache.data;
  }

  const envAddress = String(process.env.TINYMAN_POOL_ADDRESS || process.env.TINYMAN_POOL_ID || "").trim();
  if (envAddress) {
    const resolved = {
      poolAddress: envAddress,
      quoteAssetId,
      quoteDecimals,
      quoteSymbol: quoteAssetId === 10458941 ? "USDC" : `ASA-${quoteAssetId}`,
    };
    poolConfigCache.data = resolved;
    poolConfigCache.ts = now;
    return resolved;
  }

  const algod = getAlgodClient();
  const candidates = await getPairPools(algod, network, quoteAssetId);
  if (!candidates.length) {
    throw new Error(`Tinyman pool is not ready for asset ${quoteAssetId}`);
  }

  let bestPool = candidates[0];
  let bestQuoteReserve = -1n;
  for (const pool of candidates) {
    try {
      const reserves = await fetchPoolReserves(algod, pool);
      const quoteReserve = BigInt(pool.asset1ID === quoteAssetId ? reserves.asset1 : reserves.asset2);
      if (quoteReserve > bestQuoteReserve) {
        bestQuoteReserve = quoteReserve;
        bestPool = pool;
      }
    } catch {
      continue;
    }
  }

  const accountAddress =
    typeof bestPool?.account?.address === "function"
      ? bestPool.account.address()?.toString?.() || ""
      : "";
  const resolvedAddress = String(accountAddress).trim();

  if (!resolvedAddress) {
    throw new Error(`Unable to resolve Tinyman pool address for asset ${quoteAssetId}`);
  }

  const resolved = {
    poolAddress: resolvedAddress,
    quoteAssetId,
    quoteDecimals,
    quoteSymbol: quoteAssetId === 10458941 ? "USDC" : `ASA-${quoteAssetId}`,
  };
  poolConfigCache.data = resolved;
  poolConfigCache.ts = now;
  return resolved;
}

async function resolvePoolForSnapshot(algod, network, quoteAssetId, configuredPoolAddress) {
  const candidates = await getPairPools(algod, network, quoteAssetId);
  if (!candidates.length) {
    throw new Error(`Tinyman pool is not ready for asset ${quoteAssetId}`);
  }

  const expected = normalizeAddress(configuredPoolAddress);
  if (expected) {
    const matched = candidates.find((pool) => normalizeAddress(getPoolAddress(pool)) === expected);
    if (!matched) {
      throw new Error(`Configured Tinyman pool not found for pair ALGO/${quoteAssetId}: ${configuredPoolAddress}`);
    }
    return matched;
  }

  let bestPool = candidates[0];
  let bestQuoteReserve = -1n;
  for (const pool of candidates) {
    try {
      const reserves = await fetchPoolReserves(algod, pool);
      const quoteReserve = BigInt(pool.asset1ID === quoteAssetId ? reserves.asset1 : reserves.asset2);
      if (quoteReserve > bestQuoteReserve) {
        bestQuoteReserve = quoteReserve;
        bestPool = pool;
      }
    } catch {
      continue;
    }
  }

  return bestPool;
}

const INTERVAL_SECONDS = {
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

function resolveBucketSeconds(interval) {
  return INTERVAL_SECONDS[interval] || INTERVAL_SECONDS["1h"];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Market provider request failed with status ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function toVolumeMap(totalVolumes) {
  const map = new Map();
  if (!Array.isArray(totalVolumes)) return map;

  for (const row of totalVolumes) {
    const [tsMs, vol] = row;
    const tsSec = Math.floor(Number(tsMs) / 1000);
    map.set(tsSec, Number(vol) || 0);
  }

  return map;
}

function buildCandles(prices, totalVolumes, fromTs, toTs, interval) {
  const bucketSeconds = resolveBucketSeconds(interval);
  const volumeByTs = toVolumeMap(totalVolumes);
  const buckets = new Map();

  for (const row of prices || []) {
    const [tsMs, rawPrice] = row;
    const tsSec = Math.floor(Number(tsMs) / 1000);
    const price = Number(rawPrice);

    if (!Number.isFinite(tsSec) || !Number.isFinite(price)) continue;
    if (tsSec < fromTs || tsSec > toTs) continue;

    const bucketTs = Math.floor(tsSec / bucketSeconds) * bucketSeconds;
    const existing = buckets.get(bucketTs);
    const pointVolume = volumeByTs.get(tsSec) || 0;

    if (!existing) {
      buckets.set(bucketTs, {
        time: bucketTs,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: pointVolume,
      });
      continue;
    }

    existing.high = Math.max(existing.high, price);
    existing.low = Math.min(existing.low, price);
    existing.close = price;
    existing.volume += pointVolume;
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

const ohlcCache = new Map();
const OHLC_CACHE_TTL_MS = 5 * 60 * 1000;

async function getOhlc({ interval, fromTs, toTs }) {
  const cacheKey = `${interval}_${fromTs}_${toTs}`;
  const cached = ohlcCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < OHLC_CACHE_TTL_MS) {
    return cached.candles;
  }

  const rangeSeconds = Math.max(3600, toTs - fromTs);
  const days = clamp(Math.ceil(rangeSeconds / 86400), 1, 90);
  const marketChartUrl = `${COINGECKO_BASE}/coins/algorand/market_chart?vs_currency=usd&days=${days}&interval=hourly`;
  const data = await fetchJson(marketChartUrl);

  const candles = buildCandles(data.prices || [], data.total_volumes || [], fromTs, toTs, interval);
  ohlcCache.set(cacheKey, { candles, ts: Date.now() });
  if (ohlcCache.size > 20) {
    const oldest = [...ohlcCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    ohlcCache.delete(oldest[0]);
  }
  return candles;
}

const marketStatsCache = { data: null, ts: 0 };
const MARKET_STATS_CACHE_TTL_MS = 5 * 60 * 1000;
const POOL_HISTORY_MIN_INTERVAL_SECONDS = Math.max(
  5,
  Number(process.env.POOL_HISTORY_MIN_INTERVAL_SECONDS || 30)
);
const POOL_HISTORY_MAX_POINTS = Math.max(
  500,
  Number(process.env.POOL_HISTORY_MAX_POINTS || 25000)
);

async function getMarketStats() {
  const now = Date.now();
  if (marketStatsCache.data && now - marketStatsCache.ts < MARKET_STATS_CACHE_TTL_MS) {
    return marketStatsCache.data;
  }
  const marketsUrl = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=algorand&price_change_percentage=24h`;
  const rows = await fetchJson(marketsUrl);
  const row = Array.isArray(rows) ? rows[0] : null;

  if (!row) {
    throw new Error("No market stats returned by provider");
  }

  const data = {
    price: Number(row.current_price || 0),
    change24h: Number(row.price_change_percentage_24h || 0),
    volume24h: Number(row.total_volume || 0),
    liquidity: Number(row.market_cap || 0),
    high24h: Number(row.high_24h || 0),
    low24h: Number(row.low_24h || 0),
  };

  marketStatsCache.data = data;
  marketStatsCache.ts = now;
  return data;
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toEpochSeconds(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

async function fetchTinymanPairMetrics({ poolAddress }) {
  const base = getTinymanAnalyticsBase();
  const candidates = [
    `${base}/pools/${poolAddress}`,
    `${base}/v1/pools/${poolAddress}`,
  ];

  for (const url of candidates) {
    try {
      const payload = await fetchJson(url);
      const source = payload?.pool || payload?.asset || payload?.data || payload;
      if (!source || typeof source !== "object") continue;

      const liquidityUsd =
        toFiniteNumber(source.liquidity_in_usd) ??
        toFiniteNumber(source.liquidity) ??
        toFiniteNumber(source.tvl_in_usd) ??
        toFiniteNumber(source.total_liquidity_in_usd);
      const volume24hUsd =
        toFiniteNumber(source.last_day_volume_in_usd) ??
        toFiniteNumber(source.volume_24h_in_usd) ??
        toFiniteNumber(source.volume_24h) ??
        toFiniteNumber(source.last_24h_volume);
      const change24hPctRaw =
        toFiniteNumber(source.last_day_price_change) ??
        toFiniteNumber(source.price_change_24h) ??
        toFiniteNumber(source.change_24h);
      const change24hPct =
        change24hPctRaw == null
          ? null
          : (Math.abs(change24hPctRaw) <= 1 ? change24hPctRaw * 100 : change24hPctRaw);

      if (liquidityUsd != null || volume24hUsd != null || change24hPct != null) {
        return {
          liquidityUsd: liquidityUsd ?? undefined,
          volume24hUsd: volume24hUsd ?? undefined,
          priceChange24hPct: change24hPct ?? undefined,
        };
      }
    } catch {
      continue;
    }
  }

  return {};
}

function formatUnits(raw, decimals) {
  const value = BigInt(raw || 0);
  if (decimals <= 0) return value.toString();
  const sign = value < 0n ? "-" : "";
  const base = sign ? (-value).toString() : value.toString();
  const padded = base.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
}

function parseTinymanActivity(tx, poolAddress, quoteAssetId) {
  const txType = String(tx?.["tx-type"] || tx?.type || "");
  const sender = String(tx?.sender || "");
  const txid = String(tx?.id || tx?.txId || "");
  const round = Number(tx?.["confirmed-round"] || tx?.confirmedRound || 0);
  const timestamp = Number(tx?.["round-time"] || tx?.roundTime || 0);
  const note = tx?.note ? Buffer.from(tx.note, "base64").toString("utf8") : "";
  const assetTransfer = tx?.["asset-transfer-transaction"] || tx?.assetTransfer || null;
  const payment = tx?.["payment-transaction"] || tx?.payment || null;
  // Do not treat raw transfer amounts as market price; frontend will anchor to pool snapshot price.
  const priceHint = null;

  if (!txid || !round || !timestamp) return null;
  if (sender !== poolAddress && String(assetTransfer?.receiver || "") !== poolAddress && String(payment?.receiver || "") !== poolAddress) {
    return null;
  }

  return {
    txid,
    round,
    timestamp,
    txType,
    sender,
    receiver: String(assetTransfer?.receiver || payment?.receiver || ""),
    assetId: Number(assetTransfer?.["asset-id"] || assetTransfer?.assetId || quoteAssetId),
    amount: Number(assetTransfer?.amount || payment?.amount || 0),
    note,
    priceHint,
  };
}

async function getTinymanPoolSnapshot() {
  const { poolAddress: configuredPoolAddress, quoteAssetId, quoteDecimals, quoteSymbol } = await resolveTinymanPoolConfig();
  const algod = getAlgodClient();
  const network = getTinymanNetwork();

  const pool = await resolvePoolForSnapshot(algod, network, quoteAssetId, configuredPoolAddress);
  const poolAddress = getPoolAddress(pool);
  if (!poolAddress) {
    throw new Error("Unable to resolve Tinyman pool address for snapshot");
  }

  const reserves = await fetchPoolReserves(algod, pool);
  const asset1Id = Number(pool.asset1ID || 0);
  const asset2Id = Number(pool.asset2ID || 0);
  const asset1Reserve = BigInt(reserves.asset1 || 0);
  const asset2Reserve = BigInt(reserves.asset2 || 0);

  const quoteRaw =
    asset1Id === quoteAssetId ? asset1Reserve : asset2Id === quoteAssetId ? asset2Reserve : 0n;
  const algoRaw =
    asset1Id === 0 ? asset1Reserve : asset2Id === 0 ? asset2Reserve : 0n;

  const algo = Number(formatUnits(algoRaw, 6));
  const quote = Number(formatUnits(quoteRaw, quoteDecimals));
  const usdcPerAlgo = algo > 0 ? quote / algo : 0;

  const metrics = await fetchTinymanPairMetrics({ poolAddress }).catch(() => ({}));
  const reserveRound = Number(reserves?.round || 0);
  let accountRound = 0;
  if (!reserveRound) {
    const account = await algod.accountInformation(poolAddress).do();
    accountRound = Number(account.round || 0);
  }

  return {
    poolAddress,
    algoReserve: algo,
    quoteReserve: quote,
    quoteAssetId,
    quoteSymbol,
    usdcPerAlgo,
    round: reserveRound || accountRound,
    liquidityUsd: Number(metrics.liquidityUsd || 0),
    volume24hUsd: Number(metrics.volume24hUsd || 0),
    priceChange24hPct: Number(metrics.priceChange24hPct || 0),
  };
}

async function persistPoolSnapshotHistory(snapshot, options = {}) {
  if (!snapshot || !Number.isFinite(Number(snapshot.usdcPerAlgo)) || Number(snapshot.usdcPerAlgo) <= 0) {
    return { saved: false, reason: "invalid snapshot" };
  }

  const pair = String(options.pair || "ALGO_USDC").trim().toUpperCase();
  const observedAtMs =
    Number.isFinite(Number(options.observedAtMs)) && Number(options.observedAtMs) > 0
      ? Number(options.observedAtMs)
      : Date.now();
  const observedAt = new Date(observedAtMs);
  const force = options.force === true;

  if (!force) {
    const last = await PoolSnapshot.findOne({ pair }).sort({ observedAt: -1 }).lean();
    if (last?.observedAt) {
      const elapsedSeconds = (observedAtMs - new Date(last.observedAt).getTime()) / 1000;
      if (elapsedSeconds < POOL_HISTORY_MIN_INTERVAL_SECONDS) {
        return { saved: false, reason: "throttled" };
      }
    }
  }

  const doc = await PoolSnapshot.create({
    pair,
    poolAddress: String(snapshot.poolAddress || "").trim().toUpperCase(),
    quoteAssetId: Number(snapshot.quoteAssetId || 0),
    quoteSymbol: String(snapshot.quoteSymbol || "USDC").trim(),
    usdcPerAlgo: Number(snapshot.usdcPerAlgo || 0),
    algoReserve: Number(snapshot.algoReserve || 0),
    quoteReserve: Number(snapshot.quoteReserve || 0),
    round: Number(snapshot.round || 0),
    liquidityUsd: Number(snapshot.liquidityUsd || 0),
    volume24hUsd: Number(snapshot.volume24hUsd || 0),
    priceChange24hPct: Number(snapshot.priceChange24hPct || 0),
    observedAt,
  });

  return { saved: true, id: String(doc._id) };
}

async function getStoredPoolHistory({ pair = "ALGO_USDC", fromTs, toTs, limit = 1000 } = {}) {
  const normalizedPair = String(pair || "ALGO_USDC").trim().toUpperCase();
  const filter = { pair: normalizedPair };

  const from = toEpochSeconds(fromTs);
  const to = toEpochSeconds(toTs);
  if (from != null || to != null) {
    filter.observedAt = {};
    if (from != null) filter.observedAt.$gte = new Date(from * 1000);
    if (to != null) filter.observedAt.$lte = new Date(to * 1000);
  }

  const cappedLimit = Math.min(Math.max(Number(limit) || 1000, 1), POOL_HISTORY_MAX_POINTS);
  const rows = await PoolSnapshot.find(filter)
    .sort({ observedAt: -1 })
    .limit(cappedLimit)
    .lean();

  return rows
    .reverse()
    .map((row) => ({
      time: Math.floor(new Date(row.observedAt).getTime() / 1000),
      price: Number(row.usdcPerAlgo || 0),
      algoReserve: Number(row.algoReserve || 0),
      quoteReserve: Number(row.quoteReserve || 0),
      round: Number(row.round || 0),
    }))
    .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.price) && p.price > 0);
}

async function getTinymanSwapEvents({ limit = 25 } = {}) {
  const { poolAddress, quoteAssetId } = await resolveTinymanPoolConfig();

  const response = await indexerClient
    .searchForTransactions()
    .address(poolAddress)
    .limit(Math.min(Math.max(Number(limit) || 25, 1), 100))
    .txType("pay")
    .do();

  const transactions = Array.isArray(response.transactions) ? response.transactions : [];
  return transactions
    .map((tx) => parseTinymanActivity(tx, poolAddress, quoteAssetId))
    .filter(Boolean)
    .slice(0, limit);
}

module.exports = {
  getOhlc,
  getMarketStats,
  getTinymanPoolSnapshot,
  getTinymanSwapEvents,
  persistPoolSnapshotHistory,
  getStoredPoolHistory,
};
