const cron = require("node-cron");
const { runDefaultLiquidationJob } = require("./defaultLiquidationJob");
const { runPoolHistoryJob } = require("./poolHistoryJob");
const { runPoolTvlHistoryJob } = require("./poolTvlHistoryJob");

let defaultTask = null;
let poolHistoryTask = null;
let poolTvlHistoryTask = null;

function isJobEnabled() {
  return String(process.env.DEFAULT_JOB_ENABLED || "true").toLowerCase() === "true";
}

function getCronExpr() {
  return process.env.DEFAULT_JOB_CRON || "0 0 * * *";
}

function getTimezone() {
  return process.env.DEFAULT_JOB_TIMEZONE || "UTC";
}

function isPoolHistoryJobEnabled() {
  return String(process.env.POOL_HISTORY_JOB_ENABLED || "true").toLowerCase() === "true";
}

function getPoolHistoryCronExpr() {
  return process.env.POOL_HISTORY_JOB_CRON || "*/30 * * * * *";
}

function isPoolTvlHistoryJobEnabled() {
  return String(process.env.POOL_TVL_HISTORY_JOB_ENABLED || "true").toLowerCase() === "true";
}

function getPoolTvlHistoryCronExpr() {
  return process.env.POOL_TVL_HISTORY_JOB_CRON || "*/30 * * * * *";
}

function startScheduler() {
  const timezone = getTimezone();

  if (isJobEnabled()) {
    if (!defaultTask) {
      const expr = getCronExpr();
      defaultTask = cron.schedule(
        expr,
        async () => {
          try {
            await runDefaultLiquidationJob();
          } catch (err) {
            console.error("[scheduler] default liquidation job failed:", err.message);
          }
        },
        { timezone }
      );
      console.log(`[scheduler] default liquidation job scheduled: '${expr}' (${timezone})`);
    }
  } else {
    console.log("[scheduler] default liquidation job disabled");
  }

  if (isPoolHistoryJobEnabled()) {
    if (!poolHistoryTask) {
      const expr = getPoolHistoryCronExpr();
      poolHistoryTask = cron.schedule(
        expr,
        async () => {
          try {
            const result = await runPoolHistoryJob();
            if (result.saved) {
              console.log(
                `[scheduler] pool history sample saved (round=${result.round}, price=${result.price.toFixed(6)})`
              );
            }
          } catch (err) {
            console.error("[scheduler] pool history job failed:", err.message);
          }
        },
        { timezone }
      );
      console.log(`[scheduler] pool history job scheduled: '${expr}' (${timezone})`);
    }
  } else {
    console.log("[scheduler] pool history job disabled");
  }

  if (isPoolTvlHistoryJobEnabled()) {
    if (!poolTvlHistoryTask) {
      const expr = getPoolTvlHistoryCronExpr();
      poolTvlHistoryTask = cron.schedule(
        expr,
        async () => {
          try {
            const result = await runPoolTvlHistoryJob();
            if (result.saved) {
              console.log(
                `[scheduler] pool TVL sample saved (appId=${result.appId}, tvl=${result.poolBalanceAlgo.toFixed(6)} ALGO)`
              );
            }
          } catch (err) {
            console.error("[scheduler] pool TVL history job failed:", err.message);
          }
        },
        { timezone }
      );
      console.log(`[scheduler] pool TVL history job scheduled: '${expr}' (${timezone})`);
    }
  } else {
    console.log("[scheduler] pool TVL history job disabled");
  }
}

module.exports = {
  startScheduler,
};
