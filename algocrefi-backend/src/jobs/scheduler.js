const cron = require("node-cron");
const { runDefaultLiquidationJob } = require("./defaultLiquidationJob");

let task = null;

function isJobEnabled() {
  return String(process.env.DEFAULT_JOB_ENABLED || "true").toLowerCase() === "true";
}

function getCronExpr() {
  return process.env.DEFAULT_JOB_CRON || "0 0 * * *";
}

function getTimezone() {
  return process.env.DEFAULT_JOB_TIMEZONE || "UTC";
}

function startScheduler() {
  if (!isJobEnabled()) {
    console.log("[scheduler] default liquidation job disabled");
    return;
  }

  if (task) return;

  const expr = getCronExpr();
  const timezone = getTimezone();

  task = cron.schedule(
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

module.exports = {
  startScheduler,
};
