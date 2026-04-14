const User = require("../models/userModel");
const {
  getLendingUserState,
  liquidateDefaultAndSyncAura,
  getUsdcAssetId,
} = require("../services/loanService");
const { swapDefaultedUsdcToAlgo } = require("../services/tinymanService");

let running = false;

function getMinSwapUsdcUnits() {
  return Number(process.env.TINYMAN_MIN_SWAP_USDC_UNITS || 1_000_000);
}

async function processBorrower(walletAddress) {
  const status = await getLendingUserState(walletAddress);
  const now = Math.floor(Date.now() / 1000);

  if (Number(status.activeLoan || 0) !== 1) {
    return { walletAddress, skipped: true, reason: "no active loan" };
  }

  if (Number(status.dueTs || 0) === 0 || Number(status.dueTs || 0) >= now) {
    return { walletAddress, skipped: true, reason: "not overdue" };
  }

  const beforeCollateral = Number(status.collateralUsdc || 0);
  const liquidation = await liquidateDefaultAndSyncAura(walletAddress);

  let swap = { skipped: true, reason: "no collateral" };
  if (beforeCollateral >= getMinSwapUsdcUnits()) {
    swap = await swapDefaultedUsdcToAlgo({
      walletAddress,
      usdcAssetId: getUsdcAssetId(),
      usdcAmount: beforeCollateral,
      source: "default-liquidation-job",
      liquidationTxId: liquidation.txId,
    });
  }

  return {
    walletAddress,
    skipped: false,
    liquidated: true,
    liquidationTxId: liquidation.txId,
    collateralUsdcBefore: beforeCollateral,
    swap,
  };
}

async function runDefaultLiquidationJob() {
  if (running) {
    return {
      started: false,
      skipped: true,
      reason: "job already running",
    };
  }

  running = true;
  const startedAt = new Date().toISOString();

  try {
    const users = await User.find({}, { walletAddress: 1 }).lean();
    const results = [];

    for (const user of users) {
      const walletAddress = String(user.walletAddress || "").trim();
      if (!walletAddress) continue;

      try {
        const r = await processBorrower(walletAddress);
        results.push(r);
      } catch (err) {
        results.push({
          walletAddress,
          skipped: false,
          error: String(err.message || err),
        });
      }
    }

    const summary = {
      started: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      scannedUsers: users.length,
      liquidatedCount: results.filter((r) => r.liquidated).length,
      errors: results.filter((r) => r.error).length,
      results,
    };

    console.log("[default-liquidation-job]", JSON.stringify({
      scannedUsers: summary.scannedUsers,
      liquidatedCount: summary.liquidatedCount,
      errors: summary.errors,
    }));

    return summary;
  } finally {
    running = false;
  }
}

module.exports = {
  runDefaultLiquidationJob,
};
