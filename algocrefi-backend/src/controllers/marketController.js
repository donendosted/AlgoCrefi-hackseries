const { getMarketStats, getOhlc, getTinymanPoolSnapshot } = require("../services/marketDataService");

function parseUnix(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

exports.getOhlc = async (req, res) => {
  try {
    const interval = String(req.query.interval || "1h");
    const now = Math.floor(Date.now() / 1000);
    const toTs = parseUnix(req.query.to, now);
    const fromTs = parseUnix(req.query.from, now - 60 * 3600);

    if (toTs <= fromTs) {
      return res.status(400).json({ error: "Invalid time range" });
    }

    const candles = await getOhlc({ interval, fromTs, toTs });
    return res.json({ candles });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch OHLC" });
  }
};

exports.getStats = async (_req, res) => {
  try {
    const stats = await getMarketStats();
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch market stats" });
  }
};

exports.getPoolSnapshot = async (_req, res) => {
  try {
    const snapshot = await getTinymanPoolSnapshot();
    return res.json(snapshot);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch pool snapshot" });
  }
};
