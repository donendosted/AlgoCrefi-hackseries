const {
  snapshotPoolTvl,
  persistPoolTvlSnapshot,
} = require("../services/poolHistoryService");

let running = false;

async function runPoolTvlHistoryJob() {
  if (running) {
    return { started: false, skipped: true, reason: "job already running" };
  }

  running = true;
  try {
    const snapshot = await snapshotPoolTvl();
    const write = await persistPoolTvlSnapshot(snapshot);
    return {
      started: true,
      saved: Boolean(write.saved),
      reason: write.reason || null,
      appId: Number(snapshot.appId || 0),
      poolBalanceAlgo: Number(snapshot.poolBalanceAlgo || 0),
      observedAt: new Date().toISOString(),
    };
  } finally {
    running = false;
  }
}

module.exports = {
  runPoolTvlHistoryJob,
};
