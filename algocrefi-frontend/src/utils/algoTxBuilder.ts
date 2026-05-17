import algosdk from "algosdk";
import { getPoolConfig } from "./poolService";

const USDC_ASSET_ID = 10458941;
const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", 443);

async function getSuggestedParams() {
  return algodClient.getTransactionParams().do();
}

function withFlatFee(params: Awaited<ReturnType<typeof getSuggestedParams>>, fee: number) {
  return {
    ...params,
    flatFee: true,
    fee,
  };
}

export async function buildOptInTx(walletAddress: string) {
  const { appId } = await getPoolConfig();
  const optInMethod = algosdk.ABIMethod.fromSignature("opt_in()void");
  return algosdk.makeApplicationOptInTxnFromObject({
    sender: walletAddress,
    appIndex: appId,
    appArgs: [optInMethod.getSelector()],
    suggestedParams: await getSuggestedParams(),
  });
}

export async function buildDepositTxGroup(walletAddress: string, amountMicroAlgo: number) {
  const { appId, appAddress } = await getPoolConfig();
  const suggestedParams = await getSuggestedParams();
  const depositMethod = algosdk.ABIMethod.fromSignature("deposit(uint64)uint64");
  const paymentTxnIndex = 0;

  const paymentTx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: walletAddress,
    receiver: appAddress,
    amount: amountMicroAlgo,
    suggestedParams,
  });

  const depositAppCallTx = algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: appId,
    appArgs: [depositMethod.getSelector(), algosdk.encodeUint64(paymentTxnIndex)],
    suggestedParams,
  });

  algosdk.assignGroupID([paymentTx, depositAppCallTx]);
  return [paymentTx, depositAppCallTx];
}

export async function buildWithdrawTx(walletAddress: string, shares: number) {
  const { appId } = await getPoolConfig();
  const withdrawMethod = algosdk.ABIMethod.fromSignature("withdraw(uint64)uint64");
  const suggestedParams = await getSuggestedParams();
  return algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: appId,
    appArgs: [withdrawMethod.getSelector(), algosdk.encodeUint64(shares)],
    suggestedParams: withFlatFee(suggestedParams, 3000),
  });
}

export async function buildCollateralLoanGroup(
  walletAddress: string,
  algoAmountMicro: number,
  daysToRepay: number,
  requiredUsdcUnits: number
) {
  const { appId, appAddress } = await getPoolConfig();
  const suggestedParams = await getSuggestedParams();
  const requestCollateralLoanMethod = algosdk.ABIMethod.fromSignature(
    "request_collateral_loan(uint64,uint64,uint64,uint64)uint64"
  );
  const collateralTxIndex = 0;

  const usdcTx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: walletAddress,
    receiver: appAddress,
    assetIndex: USDC_ASSET_ID,
    amount: requiredUsdcUnits,
    suggestedParams,
  });

  const appCallTx = algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: appId,
    appArgs: [
      requestCollateralLoanMethod.getSelector(),
      algosdk.encodeUint64(algoAmountMicro),
      algosdk.encodeUint64(daysToRepay),
      algosdk.encodeUint64(requiredUsdcUnits),
      algosdk.encodeUint64(collateralTxIndex),
    ],
    foreignAssets: [USDC_ASSET_ID],
    suggestedParams: withFlatFee(suggestedParams, 3000),
  });

  algosdk.assignGroupID([usdcTx, appCallTx]);
  return [usdcTx, appCallTx];
}

export async function buildUnsecuredLoanTx(walletAddress: string, algoAmountMicro: number, daysToRepay: number) {
  const { appId } = await getPoolConfig();
  const method = algosdk.ABIMethod.fromSignature("request_unsecured_loan(uint64,uint64)uint64");
  const suggestedParams = await getSuggestedParams();
  return algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: appId,
    appArgs: [
      method.getSelector(),
      algosdk.encodeUint64(algoAmountMicro),
      algosdk.encodeUint64(daysToRepay),
    ],
    suggestedParams: withFlatFee(suggestedParams, 3000),
  });
}

export async function buildRepayGroup(walletAddress: string, dueAmountMicro: number) {
  const { appId, appAddress } = await getPoolConfig();
  const suggestedParams = await getSuggestedParams();
  const repayMethod = algosdk.ABIMethod.fromSignature("repay(uint64)uint64");
  const paymentTxnIndex = 0;
  const paymentTx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: walletAddress,
    receiver: appAddress,
    amount: dueAmountMicro,
    suggestedParams,
  });

  const repayTx = algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: appId,
    appArgs: [repayMethod.getSelector(), algosdk.encodeUint64(paymentTxnIndex)],
    foreignAssets: [USDC_ASSET_ID],
    suggestedParams: withFlatFee(suggestedParams, 3000),
  });

  algosdk.assignGroupID([paymentTx, repayTx]);
  return [paymentTx, repayTx];
}

export { USDC_ASSET_ID, algodClient };
