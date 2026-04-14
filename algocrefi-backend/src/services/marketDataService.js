const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const algosdk = require("algosdk");

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

async function getTinymanPoolSnapshot() {
  const poolAddress =
    process.env.TINYMAN_POOL_ADDRESS ||
    "JOEPFUDG7NS4EEUM7WZW7GA6VLD3STS5DDCJWKSGB2QLHIWDF2CJMXEFTM";
  const quoteAssetId = Number(process.env.USDC_ASA_ID || process.env.TINYMAN_QUOTE_ASA_ID || 10458941);
  const quoteDecimals = Number(process.env.USDC_DECIMALS || process.env.TINYMAN_QUOTE_DECIMALS || 6);
  const algod = new algosdk.Algodv2(
    process.env.ALGOD_TOKEN || "",
    process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
    process.env.ALGOD_PORT || ""
  );

  const account = await algod.accountInformation(poolAddress).do();
  const algoRaw = BigInt(account.amount || 0);
  const holdings = Array.isArray(account.assets) ? account.assets : [];
  const quoteHolding = holdings.find((item) => Number(item.assetId || 0) === quoteAssetId);
  const quoteRaw = BigInt(quoteHolding?.amount || 0);

  const algo = Number(formatUnits(algoRaw, 6));
  const quote = Number(formatUnits(quoteRaw, quoteDecimals));
  const usdcPerAlgo = algo > 0 ? quote / algo : 0;

  return {
    poolAddress,
    algoReserve: algo,
    quoteReserve: quote,
    quoteAssetId,
    quoteSymbol: quoteAssetId === 10458941 ? "USDC" : `ASA-${quoteAssetId}`,
    usdcPerAlgo,
    round: Number(account.round || 0),
  };
}

module.exports = {
  getOhlc,
  getMarketStats,
  getTinymanPoolSnapshot,
};
