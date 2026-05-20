const {
  getTinymanPoolSnapshot,
  persistPoolSnapshotHistory,
} = require("../services/marketDataService");

let running = false;

async function runPoolHistoryJob() {
  if (running) {
    return { started: false, skipped: true, reason: "job already running" };
  }

  running = true;
  try {
    const snapshot = await getTinymanPoolSnapshot();
    const write = await persistPoolSnapshotHistory(snapshot);
    return {
      started: true,
      saved: Boolean(write.saved),
      reason: write.reason || null,
      round: Number(snapshot.round || 0),
      price: Number(snapshot.usdcPerAlgo || 0),
      observedAt: new Date().toISOString(),
    };
  } finally {
    running = false;
  }
}

module.exports = {
  runPoolHistoryJob,
};
