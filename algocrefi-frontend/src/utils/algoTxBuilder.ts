import algosdk from "algosdk";

const APP_ID = 758675636;
const APP_ACCOUNT = "DBYOKAGRPAPK6UPNTXB4WAIROK7KRXETIBAWAF4VVI6CPATIFHXM22INLM";
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
  return algosdk.makeApplicationOptInTxnFromObject({
    sender: walletAddress,
    appIndex: APP_ID,
    suggestedParams: await getSuggestedParams(),
  });
}

export async function buildDepositTxGroup(walletAddress: string, amountMicroAlgo: number) {
  const suggestedParams = await getSuggestedParams();
  const depositMethod = algosdk.ABIMethod.fromSignature("deposit(uint64)uint64");
  const paymentTxnIndex = 0;

  const paymentTx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: walletAddress,
    receiver: APP_ACCOUNT,
    amount: amountMicroAlgo,
    suggestedParams,
  });

  const depositAppCallTx = algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: APP_ID,
    appArgs: [depositMethod.getSelector(), algosdk.encodeUint64(paymentTxnIndex)],
    suggestedParams,
  });

  algosdk.assignGroupID([paymentTx, depositAppCallTx]);
  return [paymentTx, depositAppCallTx];
}

export async function buildWithdrawTx(walletAddress: string, shares: number) {
  const withdrawMethod = algosdk.ABIMethod.fromSignature("withdraw(uint64)uint64");
  const suggestedParams = await getSuggestedParams();
  return algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: APP_ID,
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
  const suggestedParams = await getSuggestedParams();
  const requestCollateralLoanMethod = algosdk.ABIMethod.fromSignature(
    "request_collateral_loan(uint64,uint64,uint64,uint64)uint64"
  );
  const collateralTxIndex = 0;

  const usdcTx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: walletAddress,
    receiver: APP_ACCOUNT,
    assetIndex: USDC_ASSET_ID,
    amount: requiredUsdcUnits,
    suggestedParams,
  });

  const appCallTx = algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: APP_ID,
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
  const method = algosdk.ABIMethod.fromSignature("request_unsecured_loan(uint64,uint64)uint64");
  const suggestedParams = await getSuggestedParams();
  return algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: APP_ID,
    appArgs: [
      method.getSelector(),
      algosdk.encodeUint64(algoAmountMicro),
      algosdk.encodeUint64(daysToRepay),
    ],
    suggestedParams: withFlatFee(suggestedParams, 3000),
  });
}

export async function buildRepayGroup(walletAddress: string, dueAmountMicro: number) {
  const suggestedParams = await getSuggestedParams();
  const repayMethod = algosdk.ABIMethod.fromSignature("repay(uint64)uint64");
  const paymentTxnIndex = 0;
  const paymentTx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: walletAddress,
    receiver: APP_ACCOUNT,
    amount: dueAmountMicro,
    suggestedParams,
  });

  const repayTx = algosdk.makeApplicationNoOpTxnFromObject({
    sender: walletAddress,
    appIndex: APP_ID,
    appArgs: [repayMethod.getSelector(), algosdk.encodeUint64(paymentTxnIndex)],
    foreignAssets: [USDC_ASSET_ID],
    suggestedParams: withFlatFee(suggestedParams, 3000),
  });

  algosdk.assignGroupID([paymentTx, repayTx]);
  return [paymentTx, repayTx];
}

export { APP_ID, APP_ACCOUNT, USDC_ASSET_ID, algodClient };
