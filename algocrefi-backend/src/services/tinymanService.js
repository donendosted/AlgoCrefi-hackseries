require("dotenv").config();

const algosdk = require("algosdk");
const {
  poolUtils,
  Swap,
  SwapType,
  SwapQuoteType,
} = require("@tinymanorg/tinyman-js-sdk");

function isAutoSwapEnabled() {
  return String(process.env.DEFAULT_AUTO_SWAP_ENABLED || "false").toLowerCase() === "true";
}

async function swapDefaultedUsdcToAlgo(payload) {
  if (!isAutoSwapEnabled()) {
    return { skipped: true, reason: "auto swap disabled" };
  }

  const webhookUrl = process.env.TINYMAN_SWAP_WEBHOOK_URL;
  if (!webhookUrl) {
    return { skipped: true, reason: "tinyman webhook not configured" };
  }

  const token = process.env.TINYMAN_SWAP_WEBHOOK_TOKEN || "";
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Tinyman webhook failed (${response.status}): ${text}`);
  }

  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_err) {
    parsed = { raw: text };
  }

  return {
    skipped: false,
    mode: "webhook",
    result: parsed,
  };
}

function getAlgodClient() {
  return new algosdk.Algodv2(
    process.env.ALGOD_TOKEN || "",
    process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
    process.env.ALGOD_PORT || ""
  );
}

function getBackendAccount() {
  return algosdk.mnemonicToSecretKey(process.env.MNEMONIC);
}

function getTinymanNetwork() {
  return process.env.TINYMAN_NETWORK || "testnet";
}

async function executeUsdcToAlgoSwap(usdcAmount) {
  const inputAmount = Number(usdcAmount);
  if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
    throw new Error("Invalid usdcAmount for swap");
  }

  const minSwap = Number(process.env.TINYMAN_MIN_SWAP_USDC_UNITS || 1_000_000);
  if (inputAmount < minSwap) {
    return {
      skipped: true,
      reason: `Collateral below min swap threshold ${minSwap}`,
    };
  }

  const usdcAssetId = Number(process.env.USDC_ASA_ID || 10458941);
  const usdcDecimals = Number(process.env.USDC_DECIMALS || 6);
  const slippage = Number(process.env.TINYMAN_MAX_SLIPPAGE || 0.01);
  const network = getTinymanNetwork();

  const algod = getAlgodClient();
  const account = getBackendAccount();
  const initiatorAddr = account.addr.toString();

  const pool = await poolUtils.v2.getPoolInfo({
    client: algod,
    network,
    asset1ID: usdcAssetId,
    asset2ID: 0,
  });

  if (!poolUtils.isPoolReady(pool)) {
    throw new Error("Tinyman USDC/ALGO pool is not ready");
  }

  const directQuote = Swap.v2.getFixedInputDirectSwapQuote({
    amount: BigInt(inputAmount),
    assetIn: { id: usdcAssetId, decimals: usdcDecimals },
    assetOut: { id: 0, decimals: 6 },
    pool,
  });

  const quote = {
    type: SwapQuoteType.Direct,
    data: {
      pool,
      quote: directQuote,
    },
  };

  const txGroup = await Swap.v2.generateTxns({
    client: algod,
    network,
    quote,
    swapType: SwapType.FixedInput,
    slippage,
    initiatorAddr,
  });

  const initiatorSigner = async (txGroups) => {
    const signed = [];
    for (const group of txGroups) {
      for (const item of group) {
        if (item.signers?.includes(initiatorAddr)) {
          signed.push(item.txn.signTxn(account.sk));
        }
      }
    }
    return signed;
  };

  const signedTxns = await Swap.v2.signTxns({ txGroup, initiatorSigner });
  const execution = await Swap.v2.execute({
    client: algod,
    quote,
    txGroup,
    signedTxns,
  });

  return {
    skipped: false,
    txnID: execution.txnID,
    round: execution.round,
    assetInAmount: execution.assetIn?.amount?.toString?.() || String(inputAmount),
    assetOutAmount: execution.assetOut?.amount?.toString?.() || null,
  };
}

module.exports = {
  isAutoSwapEnabled,
  swapDefaultedUsdcToAlgo,
  executeUsdcToAlgoSwap,
};
