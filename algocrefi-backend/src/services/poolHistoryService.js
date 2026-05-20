const PoolTvlSnapshot = require("../models/poolTvlSnapshotModel");
const { getPoolInfo, getTotalShares, getAppId } = require("./appService");

const POOL_TVL_MIN_INTERVAL_SECONDS = Math.max(
  5,
  Number(process.env.POOL_TVL_MIN_INTERVAL_SECONDS || 30)
);
const POOL_TVL_MAX_POINTS = Math.max(
  500,
  Number(process.env.POOL_TVL_MAX_POINTS || 25000)
);

function toEpochSeconds(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

async function snapshotPoolTvl() {
  const [poolBalanceMicro, totalShares] = await Promise.all([getPoolInfo(), getTotalShares()]);
  const sharePriceMicroAlgo = Number(totalShares || 0) > 0 ? Math.floor(poolBalanceMicro / totalShares) : 1;

  return {
    appId: Number(getAppId()),
    poolBalanceMicro: Number(poolBalanceMicro || 0),
    poolBalanceAlgo: Number(poolBalanceMicro || 0) / 1_000_000,
    totalShares: Number(totalShares || 0),
    sharePriceMicroAlgo: Number(sharePriceMicroAlgo || 1),
  };
}

async function persistPoolTvlSnapshot(snapshot, options = {}) {
  if (!snapshot || !Number.isFinite(Number(snapshot.poolBalanceMicro)) || Number(snapshot.poolBalanceMicro) < 0) {
    return { saved: false, reason: "invalid snapshot" };
  }

  const appId = Number(snapshot.appId || getAppId());
  const observedAtMs =
    Number.isFinite(Number(options.observedAtMs)) && Number(options.observedAtMs) > 0
      ? Number(options.observedAtMs)
      : Date.now();
  const observedAt = new Date(observedAtMs);
  const force = options.force === true;

  if (!force) {
    const last = await PoolTvlSnapshot.findOne({ appId }).sort({ observedAt: -1 }).lean();
    if (last?.observedAt) {
      const elapsedSeconds = (observedAtMs - new Date(last.observedAt).getTime()) / 1000;
      if (elapsedSeconds < POOL_TVL_MIN_INTERVAL_SECONDS) {
        return { saved: false, reason: "throttled" };
      }
    }
  }

  const doc = await PoolTvlSnapshot.create({
    appId,
    poolBalanceMicro: Number(snapshot.poolBalanceMicro || 0),
    poolBalanceAlgo: Number(snapshot.poolBalanceAlgo || 0),
    totalShares: Number(snapshot.totalShares || 0),
    sharePriceMicroAlgo: Number(snapshot.sharePriceMicroAlgo || 1),
    observedAt,
  });

  return { saved: true, id: String(doc._id) };
}

async function getStoredPoolTvlHistory({ appId = getAppId(), fromTs, toTs, limit = 1500 } = {}) {
  const numericAppId = Number(appId || getAppId());
  const filter = { appId: numericAppId };

  const from = toEpochSeconds(fromTs);
  const to = toEpochSeconds(toTs);
  if (from != null || to != null) {
    filter.observedAt = {};
    if (from != null) filter.observedAt.$gte = new Date(from * 1000);
    if (to != null) filter.observedAt.$lte = new Date(to * 1000);
  }

  const cappedLimit = Math.min(Math.max(Number(limit) || 1500, 1), POOL_TVL_MAX_POINTS);
  const rows = await PoolTvlSnapshot.find(filter).sort({ observedAt: -1 }).limit(cappedLimit).lean();

  return rows
    .reverse()
    .map((row) => ({
      time: Math.floor(new Date(row.observedAt).getTime() / 1000),
      value: Number(row.poolBalanceAlgo || 0),
      poolBalanceMicro: Number(row.poolBalanceMicro || 0),
      totalShares: Number(row.totalShares || 0),
      sharePriceMicroAlgo: Number(row.sharePriceMicroAlgo || 1),
    }))
    .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.value) && p.value >= 0);
}

module.exports = {
  snapshotPoolTvl,
  persistPoolTvlSnapshot,
  getStoredPoolTvlHistory,
};
