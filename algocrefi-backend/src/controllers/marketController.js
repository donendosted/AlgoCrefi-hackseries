const {
  getMarketStats,
  getOhlc,
  getTinymanPoolSnapshot,
  getTinymanSwapEvents,
  persistPoolSnapshotHistory,
  getStoredPoolHistory,
} = require("../services/marketDataService");

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
    persistPoolSnapshotHistory(snapshot).catch((err) => {
      console.warn("Pool snapshot persistence failed:", err?.message || err);
    });
    return res.json(snapshot);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch pool snapshot" });
  }
};

exports.getPoolHistory = async (req, res) => {
  try {
    const pair = String(req.query.pair || "ALGO_USDC");
    const now = Math.floor(Date.now() / 1000);
    const toTs = parseUnix(req.query.to, now);
    const fromTs = parseUnix(req.query.from, now - 24 * 3600);
    const limit = parseUnix(req.query.limit, 1000);

    if (toTs <= fromTs) {
      return res.status(400).json({ error: "Invalid time range" });
    }

    const points = await getStoredPoolHistory({ pair, fromTs, toTs, limit });
    return res.json({ pair, points });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch stored pool history" });
  }
};

exports.streamPoolSnapshot = async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let closed = false;

  const send = (event, data) => {
    if (closed) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const heartbeat = setInterval(() => {
    send("ping", { ts: Date.now() });
  }, 15000);

  const emitSnapshot = async () => {
    try {
      const snapshot = await getTinymanPoolSnapshot();
      persistPoolSnapshotHistory(snapshot).catch((err) => {
        console.warn("Pool snapshot persistence failed:", err?.message || err);
      });
      send("snapshot", snapshot);
      try {
        const events = await getTinymanSwapEvents({ limit: 10 });
        if (events.length) {
          send("activity", { events });
        }
      } catch (activityErr) {
        console.warn("Tinyman activity feed unavailable", activityErr?.message || activityErr);
      }
    } catch (err) {
      send("error", { message: err?.message || "Failed to fetch pool snapshot" });
    }
  };

  await emitSnapshot();
  const poll = setInterval(emitSnapshot, 2000);

  req.on("close", () => {
    closed = true;
    clearInterval(heartbeat);
    clearInterval(poll);
    res.end();
  });
};
