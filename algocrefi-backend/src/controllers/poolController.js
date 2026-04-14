const Deposit = require("../models/depositModel");
const User = require("../models/userModel");
const { verifyTransaction } = require("../services/verifyService");
const { submitSignedAppCall, submitSignedDepositGroup, getPoolInfo, getUserShares, getTotalShares, getBackendAddress } = require("../services/appService");

function safeStringify(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  ));
}

function getAppId() {
  return Number(process.env.POOL_APP_ID || process.env.LENDING_APP_ID || process.env.APP_ID);
}

exports.deposit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { txId, signedDepositTx, signedGroupTxs } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    if (Array.isArray(signedGroupTxs) && signedGroupTxs.length > 0) {
      const result = await submitSignedDepositGroup(signedGroupTxs, user.walletAddress);

      const existing = await Deposit.findOne({ txId: result.paymentTxId });
      if (existing) {
        return res.json({ success: false, error: "Transaction already used" });
      }

      const deposit = await Deposit.create({
        userId: user._id,
        walletAddress: user.walletAddress,
        amount: result.paymentAmount,
        txId: result.paymentTxId,
        appId: getAppId(),
      });

      return res.json({
        success: true,
        message: "Deposit submitted successfully",
        deposit: safeStringify(deposit),
        appTxId: result.appTxId,
        paymentTxId: result.paymentTxId,
        requiresWalletSignedDeposit: true,
      });
    }

    if (!txId) {
      return res.json({ success: false, error: "txId required" });
    }

    const existing = await Deposit.findOne({ txId });
    if (existing) {
      return res.json({ success: false, error: "Transaction already used" });
    }

    const txData = await verifyTransaction(txId);

    if (txData.sender !== user.walletAddress) {
      return res.json({ success: false, error: "Transaction sender does not match logged-in wallet" });
    }

    if (!signedDepositTx) {
      return res.json({
        success: false,
        error: "signedDepositTx required. Deposit app call must be signed by investor wallet",
      });
    }

    const appTxId = await submitSignedAppCall(
      signedDepositTx,
      user.walletAddress,
      0
    );

    const deposit = await Deposit.create({
      userId: user._id,
      walletAddress: txData.sender,
      amount: txData.amount,
      txId,
      appId: getAppId(),
    });

    res.json({
      success: true,
      message: "Deposit recorded successfully",
      deposit: safeStringify(deposit),
      sharesMinted: null,
      appTxId,
      requiresWalletSignedDeposit: true,
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
};

exports.optIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const { signedOptInTx } = req.body;

    if (!signedOptInTx) {
      return res.json({ success: false, error: "signedOptInTx required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    const appTxId = await submitSignedAppCall(
      signedOptInTx,
      user.walletAddress,
      1
    );

    res.json({
      success: true,
      message: "Opt-in submitted successfully",
      appTxId,
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shares, signedWithdrawTx } = req.body;

    if (!shares || shares <= 0) {
      return res.json({ success: false, error: "Valid shares amount required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    if (!signedWithdrawTx) {
      return res.json({
        success: false,
        error: "signedWithdrawTx required. Withdraw must be signed by investor wallet so contract pays investor directly",
      });
    }

    const appTxId = await submitSignedAppCall(
      signedWithdrawTx,
      user.walletAddress,
      0
    );

    res.json({
      success: true,
      message: "Withdraw submitted. ALGO payout comes from contract wallet to depositor wallet",
      sharesBurned: shares,
      algoWithdrawn: null,
      appTxId,
      requiresWalletSignedWithdraw: true,
      backendAddress: getBackendAddress(),
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
};

exports.getPoolInfo = async (req, res) => {
  try {
    const poolBalance = await getPoolInfo();
    const totalShares = await getTotalShares();
    const sharePrice = totalShares > 0 ? Math.floor(poolBalance / totalShares) : 1;

    res.json({
      success: true,
      pool: {
        balance: poolBalance,
        totalShares: totalShares,
        sharePrice: sharePrice,
      },
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    const userShares = await getUserShares(user.walletAddress);
    const poolBalance = await getPoolInfo();
    const totalShares = await getTotalShares();
    const algoValue = totalShares > 0
      ? Math.floor((userShares * poolBalance) / totalShares)
      : 0;

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        walletAddress: user.walletAddress,
        shares: userShares,
        algoValue,
      },
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
};
