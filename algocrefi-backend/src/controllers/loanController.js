const {
  getCollateralQuote,
  submitLendingOptIn,
  submitAuraOptIn,
  appOptInUsdc,
  submitCollateralBorrowGroup,
  submitAddLiquidityGroup,
  submitRepayGroup,
  submitUnsecuredBorrowGroup,
  getLendingUserState,
  getLendingActiveLoan,
  getLendingDueAmount,
  getAuraUserState,
  syncAuraFromRepay,
  liquidateDefaultAndSyncAura,
  getLendingAppId,
  getAuraAppId,
  getUsdcAssetId,
  MIN_AURA_FOR_UNSECURED,
  MICRO_ALGO,
} = require("../services/loanService");
const User = require("../models/userModel");

const activeLoanCountCache = {
  ts: 0,
  value: {
    activeLoanWalletCount: 0,
    pendingLoanMicroAlgo: 0,
  },
};

const ACTIVE_LOAN_COUNT_CACHE_TTL_MS = Math.max(
  5_000,
  Number(process.env.ACTIVE_LOAN_COUNT_CACHE_TTL_MS || 30_000)
);
const ACTIVE_LOAN_COUNT_SCAN_LIMIT = Math.max(
  1,
  Number(process.env.ACTIVE_LOAN_COUNT_SCAN_LIMIT || 5000)
);
const ACTIVE_LOAN_COUNT_CONCURRENCY = Math.max(
  1,
  Number(process.env.ACTIVE_LOAN_COUNT_CONCURRENCY || 12)
);

async function getActiveLoanCountFromUsers() {
  const now = Date.now();
  if (now - activeLoanCountCache.ts < ACTIVE_LOAN_COUNT_CACHE_TTL_MS) {
    return activeLoanCountCache.value;
  }

  const users = await User.find({
    walletAddress: { $exists: true, $type: "string", $ne: "" },
  })
    .select("walletAddress -_id")
    .limit(ACTIVE_LOAN_COUNT_SCAN_LIMIT)
    .lean();

  const uniqueWallets = Array.from(
    new Set(
      users
        .map((u) => String(u.walletAddress || "").trim())
        .filter(Boolean)
    )
  );

  let activeCount = 0;
  let pendingLoanMicroAlgo = 0;
  for (let i = 0; i < uniqueWallets.length; i += ACTIVE_LOAN_COUNT_CONCURRENCY) {
    const slice = uniqueWallets.slice(i, i + ACTIVE_LOAN_COUNT_CONCURRENCY);
    const results = await Promise.all(
      slice.map(async (walletAddress) => {
        try {
          const [activeLoan, dueAmount] = await Promise.all([
            getLendingActiveLoan(walletAddress),
            getLendingDueAmount(walletAddress),
          ]);
          return {
            hasActiveLoan: Number(activeLoan || 0) > 0 || Number(dueAmount || 0) > 0,
            dueAmountMicroAlgo: Math.max(0, Number(dueAmount || 0)),
          };
        } catch {
          return {
            hasActiveLoan: false,
            dueAmountMicroAlgo: 0,
          };
        }
      })
    );
    activeCount += results.reduce((sum, row) => sum + (row.hasActiveLoan ? 1 : 0), 0);
    pendingLoanMicroAlgo += results.reduce(
      (sum, row) => sum + Math.max(0, Number(row.dueAmountMicroAlgo || 0)),
      0
    );
  }

  activeLoanCountCache.ts = now;
  activeLoanCountCache.value = {
    activeLoanWalletCount: activeCount,
    pendingLoanMicroAlgo,
  };
  return activeLoanCountCache.value;
}

exports.quoteCollateral = async (req, res) => {
  try {
    const { algoAmount, daysToRepay } = req.body;

    if (!algoAmount || !daysToRepay) {
      return res.status(400).json({
        success: false,
        error: "algoAmount and daysToRepay are required",
      });
    }

    const quote = await getCollateralQuote(Number(algoAmount), Number(daysToRepay));

    res.json({
      success: true,
      quote,
      config: {
        lendingAppId: getLendingAppId(),
        usdcAssetId: getUsdcAssetId(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.optInLending = async (req, res) => {
  try {
    const { signedOptInTx } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!signedOptInTx) {
      return res.status(400).json({ success: false, error: "signedOptInTx is required" });
    }

    const result = await submitLendingOptIn({ signedOptInTx, walletAddress });

    res.json({
      success: true,
      message: "Lending app opt-in submitted",
      appTxId: result.txId,
      appId: getLendingAppId(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.optInAura = async (req, res) => {
  try {
    const { signedOptInTx } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!signedOptInTx) {
      return res.status(400).json({ success: false, error: "signedOptInTx is required" });
    }

    const result = await submitAuraOptIn({ signedOptInTx, walletAddress });

    res.json({
      success: true,
      message: "Aura app opt-in submitted",
      appTxId: result.txId,
      appId: getAuraAppId(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.appOptInUsdc = async (_req, res) => {
  try {
    const result = await appOptInUsdc();
    res.json({
      success: true,
      message: "Lending app opted in to USDC",
      appTxId: result.txId,
      lendingAppId: getLendingAppId(),
      usdcAssetId: getUsdcAssetId(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.requestCollateralLoan = async (req, res) => {
  try {
    const { algoAmount, daysToRepay, signedGroupTxs } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!algoAmount || !daysToRepay || !signedGroupTxs) {
      return res.status(400).json({
        success: false,
        error: "algoAmount, daysToRepay and signedGroupTxs are required",
      });
    }

    const quote = await getCollateralQuote(Number(algoAmount), Number(daysToRepay));
    const result = await submitCollateralBorrowGroup({
      signedGroupTxs,
      walletAddress,
      quote,
    });

    res.json({
      success: true,
      message: "Collateral loan request submitted",
      appTxId: result.txId,
      quote,
      loanType: "collateral",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addLiquidity = async (req, res) => {
  try {
    const { signedGroupTxs } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!signedGroupTxs) {
      return res.status(400).json({
        success: false,
        error: "signedGroupTxs are required",
      });
    }

    const result = await submitAddLiquidityGroup({ signedGroupTxs, walletAddress });

    res.json({
      success: true,
      message: "Liquidity added to lending pool",
      appTxId: result.txId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.requestUnsecuredLoan = async (req, res) => {
  try {
    const { algoAmount, daysToRepay, signedAppTx } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!algoAmount || !daysToRepay || !signedAppTx) {
      return res.status(400).json({
        success: false,
        error: "algoAmount, daysToRepay and signedAppTx are required",
      });
    }

    const requestedAmountMicroAlgo = Number(algoAmount);
    const lendingState = await getLendingUserState(walletAddress);

    if (!lendingState.unsecuredEligible) {
      return res.status(400).json({
        success: false,
        error: "Wallet is not eligible for unsecured loan",
        eligibility: {
          minAuraPoints: MIN_AURA_FOR_UNSECURED,
          netAuraPoints: lendingState.netAuraPoints,
          blacklisted: lendingState.blacklisted,
          unsecuredEligible: lendingState.unsecuredEligible,
        },
      });
    }

    if (requestedAmountMicroAlgo > lendingState.unsecuredCreditLimitMicroAlgo) {
      return res.status(400).json({
        success: false,
        error: "Requested unsecured amount exceeds current credit limit",
        requestedAmountMicroAlgo,
        requestedAmountAlgo: requestedAmountMicroAlgo / MICRO_ALGO,
        unsecuredCreditLimitMicroAlgo: lendingState.unsecuredCreditLimitMicroAlgo,
        unsecuredCreditLimitAlgo: lendingState.unsecuredCreditLimitAlgo,
      });
    }

    const result = await submitUnsecuredBorrowGroup({
      signedGroupTxs: [signedAppTx],
      walletAddress,
      algoAmount: requestedAmountMicroAlgo,
      daysToRepay: Number(daysToRepay),
    });

    res.json({
      success: true,
      message: "Unsecured loan request submitted",
      appTxId: result.txId,
      loanType: "unsecured",
      unsecuredPolicy: {
        minAuraPoints: MIN_AURA_FOR_UNSECURED,
        unsecuredCreditLimitMicroAlgo: lendingState.unsecuredCreditLimitMicroAlgo,
        unsecuredCreditLimitAlgo: lendingState.unsecuredCreditLimitAlgo,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.repayLoan = async (req, res) => {
  try {
    const { signedGroupTxs } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!signedGroupTxs) {
      return res.status(400).json({ success: false, error: "signedGroupTxs are required" });
    }

    const before = await getLendingUserState(walletAddress);
    const result = await submitRepayGroup({ signedGroupTxs, walletAddress });
    const after = await getLendingUserState(walletAddress);

    const auraSync = await syncAuraFromRepay(walletAddress, before.auraEarned, after.auraEarned);

    res.json({
      success: true,
      message: "Loan repayment submitted",
      appTxId: result.txId,
      auraSync,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.liquidateDefault = async (req, res) => {
  try {
    const { borrower } = req.body;

    if (!borrower) {
      return res.status(400).json({ success: false, error: "borrower is required" });
    }

    const result = await liquidateDefaultAndSyncAura(borrower);

    res.json({
      success: true,
      message: "Loan liquidated and AURA synced",
      appTxId: result.txId,
      interestPenaltyMicroAlgo: result.interestPenaltyMicroAlgo,
      auraSync: result.auraSync,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLoanStatus = async (req, res) => {
  try {
    const walletAddress = req.params.walletAddress || req.user.walletAddress;

    const [lending, aura] = await Promise.all([
      getLendingUserState(walletAddress),
      getAuraUserState(walletAddress),
    ]);

    res.json({
      success: true,
      walletAddress,
      lendingAppId: getLendingAppId(),
      auraAppId: getAuraAppId(),
      unsecuredPolicy: {
        minAuraPoints: MIN_AURA_FOR_UNSECURED,
      },
      lending,
      aura,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLoanInfo = async (req, res) => {
  try {
    const walletAddress =
      req?.user?.walletAddress ||
      process.env.DEFAULT_STATUS_WALLET ||
      getBackendWalletFallback();

    const lending = walletAddress
      ? await getLendingUserState(walletAddress)
      : null;
    const protocolLoanMetrics = await getActiveLoanCountFromUsers().catch(() => ({
      activeLoanWalletCount: 0,
      pendingLoanMicroAlgo: 0,
    }));

    res.json({
      success: true,
      lendingAppId: getLendingAppId(),
      auraAppId: getAuraAppId(),
      usdcAssetId: getUsdcAssetId(),
      unsecuredPolicy: {
        minAuraPoints: MIN_AURA_FOR_UNSECURED,
      },
      protocolMetrics: {
        activeLoanWalletCount: Number(protocolLoanMetrics.activeLoanWalletCount || 0),
        pendingLoanMicroAlgo: Number(protocolLoanMetrics.pendingLoanMicroAlgo || 0),
      },
      walletAddress,
      lending,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

function getBackendWalletFallback() {
  return process.env.BACKEND_WALLET_ADDRESS || "";
}
