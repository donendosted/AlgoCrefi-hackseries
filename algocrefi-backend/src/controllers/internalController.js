const { getUsdcAssetId } = require("../services/loanService");
const { executeUsdcToAlgoSwap } = require("../services/tinymanService");

function isAuthorized(req) {
  const expected = process.env.TINYMAN_SWAP_WEBHOOK_TOKEN || "";
  if (!expected) return true;

  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected;
}

exports.swapDefaultedCollateral = async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ success: false, error: "Unauthorized webhook call" });
    }

    const {
      walletAddress,
      usdcAssetId,
      usdcAmount,
      source,
      liquidationTxId,
    } = req.body || {};

    if (!walletAddress || !usdcAssetId || !usdcAmount) {
      return res.status(400).json({
        success: false,
        error: "walletAddress, usdcAssetId and usdcAmount are required",
      });
    }

    if (Number(usdcAssetId) !== Number(getUsdcAssetId())) {
      return res.status(400).json({
        success: false,
        error: "Unsupported asset for auto swap",
      });
    }

    const minSwap = Number(process.env.TINYMAN_MIN_SWAP_USDC_UNITS || 1_000_000);
    if (Number(usdcAmount) < minSwap) {
      return res.json({
        success: true,
        swapped: false,
        skipped: true,
        reason: `Collateral below min swap threshold ${minSwap}`,
        walletAddress,
        usdcAmount: Number(usdcAmount),
      });
    }

    const swapResult = await executeUsdcToAlgoSwap(Number(usdcAmount));

    return res.json({
      success: true,
      swapped: !swapResult.skipped,
      ...swapResult,
      payload: {
        walletAddress,
        usdcAssetId: Number(usdcAssetId),
        usdcAmount: Number(usdcAmount),
        source: source || "unknown",
        liquidationTxId: liquidationTxId || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
