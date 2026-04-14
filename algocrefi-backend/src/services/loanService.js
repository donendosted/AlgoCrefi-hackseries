const algosdk = require("algosdk");
require("dotenv").config();

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN || "",
  process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
  process.env.ALGOD_PORT || ""
);

const MICRO_ALGO = 1_000_000;
const USDC_DECIMALS = Number(process.env.USDC_DECIMALS || 6);
const MIN_AURA_FOR_UNSECURED = Number(process.env.MIN_AURA_FOR_UNSECURED || 30);

const METHODS = {
  lendingOptIn: "opt_in()void",
  appOptInUsdc: "app_opt_in_usdc()void",
  adminAddPoolLiquidity: "admin_add_pool_liquidity(uint64)uint64",
  requestCollateralLoan:
    "request_collateral_loan(uint64,uint64,uint64,uint64)uint64",
  requestUnsecuredLoan: "request_unsecured_loan(uint64,uint64)uint64",
  repay: "repay(uint64)uint64",
  liquidateDefault: "liquidate_default(address)uint64",
  getPool: "get_pool()uint64",
  getActiveLoan: "get_active_loan(address)uint64",
  getDueAmount: "get_due_amount(address)uint64",
  getDueTs: "get_due_ts(address)uint64",
  getLendingNetAura: "get_net_aura(address)uint64",
  getLendingUnsecuredLimit: "get_unsecured_credit_limit(address)uint64",
  getLendingBlacklisted: "is_blacklisted(address)uint64",

  auraOptIn: "opt_in()void",
  auraAddRepaymentAura: "add_repayment_aura(address,uint64)uint64",
  auraAddDefaultPenalty: "add_default_penalty(address,uint64)uint64",
  auraBlacklistUnsecured: "blacklist_unsecured(address)uint64",
  auraGetNet: "get_net_aura(address)uint64",
  auraGetEarned: "get_aura_earned(address)uint64",
  auraGetPenalty: "get_aura_penalty(address)uint64",
  auraGetBlacklisted: "is_blacklisted(address)uint64",
};

function getBackendAccount() {
  return algosdk.mnemonicToSecretKey(process.env.MNEMONIC);
}

function toHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function methodSelectorHex(signature) {
  const method = algosdk.ABIMethod.fromSignature(signature);
  return toHex(method.getSelector());
}

function decodeSignedTxn(base64) {
  const raw = Buffer.from(base64, "base64");
  const decoded = algosdk.decodeSignedTransaction(raw);
  return { raw, decoded };
}

function decodeUint64Arg(argBytes) {
  return Number(algosdk.decodeUint64(argBytes, "safe"));
}

function getAppCallDetails(decoded) {
  const tx = decoded?.txn;
  const appCall = tx?.applicationCall;
  if (!tx || !appCall) return null;

  const appArgs = appCall.appArgs || [];
  const selectorHex = appArgs[0] ? toHex(appArgs[0]) : null;

  return {
    sender: tx.sender.toString(),
    type: tx.type,
    appId: Number(appCall.appIndex || 0),
    onComplete: Number(appCall.onComplete || 0),
    appArgs,
    selectorHex,
    tx,
  };
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitTx(txId, rounds = 20) {
  await algosdk.waitForConfirmation(algodClient, txId, rounds);
}

async function sendRawGroup(rawGroup) {
  const response = await algodClient.sendRawTransaction(rawGroup).do();
  const txId = response.txid;
  await waitTx(txId, 20);
  return txId;
}

async function executeAdminMethod(
  appId,
  methodSignature,
  methodArgs = [],
  extra = {}
) {
  const account = getBackendAccount();
  const suggestedParams = await algodClient.getTransactionParams().do();
  const method = algosdk.ABIMethod.fromSignature(methodSignature);

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addMethodCall({
    appID: Number(appId),
    method,
    methodArgs,
    sender: account.addr.toString(),
    signer: algosdk.makeBasicAccountTransactionSigner(account),
    suggestedParams,
    foreignAssets: extra.foreignAssets,
    foreignApps: extra.foreignApps,
    accounts: extra.accounts,
  });

  const result = await atc.execute(algodClient, 20);
  return {
    txId: result.txIDs[0],
    returnValue: result.methodResults[0]?.returnValue,
  };
}

async function executeReadonly(appId, methodSignature, methodArgs = []) {
  const account = getBackendAccount();
  const suggestedParams = await algodClient.getTransactionParams().do();
  const method = algosdk.ABIMethod.fromSignature(methodSignature);

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addMethodCall({
    appID: Number(appId),
    method,
    methodArgs,
    sender: account.addr.toString(),
    signer: algosdk.makeBasicAccountTransactionSigner(account),
    suggestedParams,
    staticCall: true,
  });

  const result = await atc.execute(algodClient, 20);
  return result.methodResults[0]?.returnValue;
}

async function executeReadonlyOrZero(appId, methodSignature, methodArgs = []) {
  try {
    return await executeReadonly(appId, methodSignature, methodArgs);
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("has not opted in to app")) return 0;
    throw err;
  }
}

function getLendingAppId() {
  return Number(process.env.LENDING_APP_ID || process.env.POOL_APP_ID || process.env.APP_ID);
}

function getAuraAppId() {
  return Number(process.env.AURA_APP_ID || getLendingAppId());
}

function hasExternalAuraApp() {
  return Boolean(process.env.AURA_APP_ID);
}

function getUsdcAssetId() {
  return Number(process.env.USDC_ASA_ID || 10458941);
}

function getAppAddress(appId) {
  return algosdk.getApplicationAddress(Number(appId)).toString();
}

async function getPoolAlgo() {
  const appId = getLendingAppId();
  return await readGlobalStateUint(appId, "pool");
}

function normalizeAppLocalState(info) {
  const localState = info?.appLocalState || info?.["app-local-state"] || {};
  return localState?.keyValue || localState?.["key-value"] || [];
}

function normalizeAppGlobalState(info) {
  const state = info?.params?.["global-state"] || info?.params?.globalState || [];
  return state || [];
}

async function readLocalStateUint(address, appId, key) {
  try {
    const info = await algodClient.accountApplicationInformation(address, appId).do();
    const entries = normalizeAppLocalState(info);
    const hit = entries.find((e) => Buffer.from(e.key, "base64").toString() === key);
    return Number(hit?.value?.uint || 0);
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("has not opted in to app") || msg.includes("404")) return 0;
    throw err;
  }
}

async function readGlobalStateUint(appId, key) {
  const app = await algodClient.getApplicationByID(Number(appId)).do();
  const entries = normalizeAppGlobalState(app);
  const hit = entries.find((e) => Buffer.from(e.key, "base64").toString() === key);
  return Number(hit?.value?.uint || 0);
}

const priceCache = { price: 0.1, ts: 0 };
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchAlgoUsdPrice() {
  const now = Date.now();
  if (priceCache.price > 0 && now - priceCache.ts < PRICE_CACHE_TTL_MS) {
    return priceCache.price;
  }

  const poolAddress = "JOEPFUDG7NS4EEUM7WZW7GA6VLD3STS5DDCJWKSGB2QLHIWDF2CJMXEFTM";
  const usdcAssetId = 10458941;

  try {
    const account = await algodClient.accountInformation(poolAddress).do();
    const algoRaw = BigInt(account.amount || 0);
    const algoBalance = Number(algoRaw) / 1_000_000;
    const assets = Array.isArray(account.assets) ? account.assets : [];
    const usdcHolding = assets.find((a) => Number(a.assetId || 0) === usdcAssetId);
    const usdcBalance = Number(usdcHolding?.amount || 0) / 1_000_000;

    if (algoBalance <= 0) throw new Error("Pool has no ALGO");
    const price = usdcBalance / algoBalance;
    if (!price || !Number.isFinite(price)) throw new Error("Invalid Tinyman price");

    priceCache.price = price;
    priceCache.ts = now;
    return price;
  } catch (_err) {
    if (priceCache.price > 0) return priceCache.price;
    throw _err;
  }
}

function calculateDue(algoAmountMicro, daysToRepay, dailyInterestBps = 10) {
  const principal = Number(algoAmountMicro);
  const days = Number(daysToRepay);
  const perDay = Math.floor((principal * dailyInterestBps) / 10_000);
  const interest = perDay * days;
  return { principal, interest, due: principal + interest };
}

async function getCollateralQuote(algoAmountMicro, daysToRepay) {
  const algoAmount = Number(algoAmountMicro);
  const days = Number(daysToRepay);
  ensure(algoAmount > 0, "algoAmount must be positive");
  ensure(days > 0, "daysToRepay must be positive");

  const algoUsdPrice = await fetchAlgoUsdPrice();
  const algoAmountInAlgo = algoAmount / MICRO_ALGO;

  const realMinCollateralUsdc = algoAmountInAlgo * algoUsdPrice * 1.5;
  const testnetUsdcPerAlgo = Number(process.env.TESTNET_USDC_PER_ALGO || 9);
  const testnetMinCollateralUsdc = algoAmountInAlgo * testnetUsdcPerAlgo;

  const requiredUsdc = Math.max(realMinCollateralUsdc, testnetMinCollateralUsdc);
  const requiredUsdcUnits = Math.ceil(requiredUsdc * 10 ** USDC_DECIMALS);

  const { interest, due } = calculateDue(algoAmount, days);

  return {
    algoAmountMicro: algoAmount,
    algoAmount,
    daysToRepay: days,
    algoUsdPrice,
    realMinCollateralUsdc,
    testnetMinCollateralUsdc,
    requiredCollateralUsdc: requiredUsdc,
    requiredCollateralUsdcUnits: requiredUsdcUnits,
    estimatedInterestMicroAlgo: interest,
    estimatedDueMicroAlgo: due,
  };
}

function validateCollateralBorrowGroup({ decodedGroup, expectedSender, quote }) {
  const lendingAppId = getLendingAppId();
  const appAddress = getAppAddress(lendingAppId);
  const selector = methodSelectorHex(METHODS.requestCollateralLoan);

  const appCallIdx = decodedGroup.findIndex((item) => {
    const d = getAppCallDetails(item.decoded);
    return (
      d &&
      d.type === "appl" &&
      d.sender === expectedSender &&
      d.appId === lendingAppId &&
      d.onComplete === 0 &&
      d.selectorHex === selector
    );
  });

  ensure(appCallIdx >= 0, "Collateral loan app call not found in signed group");

  const appCall = getAppCallDetails(decodedGroup[appCallIdx].decoded);
  ensure(appCall.appArgs.length >= 5, "Invalid collateral loan app args");

  const algoAmountArg = decodeUint64Arg(appCall.appArgs[1]);
  const daysArg = decodeUint64Arg(appCall.appArgs[2]);
  const minCollateralArg = decodeUint64Arg(appCall.appArgs[3]);
  const collateralTxIndex = decodeUint64Arg(appCall.appArgs[4]);

  ensure(algoAmountArg === Number(quote.algoAmountMicro), "algo amount mismatch in signed tx");
  ensure(daysArg === Number(quote.daysToRepay), "daysToRepay mismatch in signed tx");
  ensure(
    minCollateralArg >= Number(quote.requiredCollateralUsdcUnits),
    "min collateral in tx is below required quote"
  );

  ensure(collateralTxIndex >= 0 && collateralTxIndex < decodedGroup.length, "Invalid collateral txn index");

  const collateralTxn = decodedGroup[collateralTxIndex].decoded?.txn;
  ensure(collateralTxn?.type === "axfer", "Referenced collateral txn is not asset transfer");

  const assetTransfer = collateralTxn.assetTransfer;
  ensure(collateralTxn.sender.toString() === expectedSender, "Collateral sender mismatch");
  ensure(assetTransfer.receiver.toString() === appAddress, "Collateral receiver must be lending app account");
  ensure(Number(assetTransfer.assetIndex || 0) === getUsdcAssetId(), "Collateral asset must be testnet USDC ASA");
  ensure(
    Number(assetTransfer.amount || 0) >= Number(quote.requiredCollateralUsdcUnits),
    "Collateral amount below required minimum"
  );

}

function validateAddLiquidityGroup({ decodedGroup, expectedSender }) {
  const lendingAppId = getLendingAppId();
  const appAddress = getAppAddress(lendingAppId);
  const selector = methodSelectorHex(METHODS.adminAddPoolLiquidity);

  const appCallIdx = decodedGroup.findIndex((item) => {
    const d = getAppCallDetails(item.decoded);
    return (
      d &&
      d.type === "appl" &&
      d.sender === expectedSender &&
      d.appId === lendingAppId &&
      d.onComplete === 0 &&
      d.selectorHex === selector
    );
  });

  ensure(appCallIdx >= 0, "admin_add_pool_liquidity app call not found in signed group");
  const appCall = getAppCallDetails(decodedGroup[appCallIdx].decoded);
  ensure(appCall.appArgs.length >= 2, "Invalid admin_add_pool_liquidity args");

  const paymentIndex = decodeUint64Arg(appCall.appArgs[1]);
  ensure(paymentIndex >= 0 && paymentIndex < decodedGroup.length, "Invalid payment txn index");

  const paymentTxn = decodedGroup[paymentIndex].decoded?.txn;
  ensure(paymentTxn?.type === "pay", "Referenced liquidity txn is not payment");
  ensure(paymentTxn.sender.toString() === expectedSender, "Liquidity sender mismatch");
  ensure(paymentTxn.payment.receiver.toString() === appAddress, "Liquidity receiver must be app account");
  ensure(Number(paymentTxn.payment.amount || 0) > 0, "Liquidity payment amount must be positive");
}

async function validateRepayGroup({ decodedGroup, expectedSender }) {
  const lendingAppId = getLendingAppId();
  const appAddress = getAppAddress(lendingAppId);
  const selector = methodSelectorHex(METHODS.repay);

  const appCallIdx = decodedGroup.findIndex((item) => {
    const d = getAppCallDetails(item.decoded);
    return (
      d &&
      d.type === "appl" &&
      d.sender === expectedSender &&
      d.appId === lendingAppId &&
      d.onComplete === 0 &&
      d.selectorHex === selector
    );
  });

  ensure(appCallIdx >= 0, "Repay app call not found in signed group");

  const appCall = getAppCallDetails(decodedGroup[appCallIdx].decoded);
  ensure(appCall.appArgs.length >= 2, "Invalid repay app args");

  const foreignAssets = appCall.tx.applicationCall?.foreignAssets || [];
  const hasUsdc = foreignAssets.some((a) => Number(a) === getUsdcAssetId());
  ensure(hasUsdc, "Repay app call must include USDC asset in foreignAssets");

  const paymentTxnIndex = decodeUint64Arg(appCall.appArgs[1]);
  ensure(paymentTxnIndex >= 0 && paymentTxnIndex < decodedGroup.length, "Invalid repayment payment index");

  const paymentTxn = decodedGroup[paymentTxnIndex].decoded?.txn;
  ensure(paymentTxn?.type === "pay", "Referenced repayment txn is not payment");
  ensure(paymentTxn.sender.toString() === expectedSender, "Repayment sender mismatch");
  ensure(paymentTxn.payment.receiver.toString() === appAddress, "Repayment receiver must be lending app account");
}

async function validateUnsecuredBorrowGroup({ decodedGroup, expectedSender, algoAmount, daysToRepay }) {
  const selector = methodSelectorHex(METHODS.requestUnsecuredLoan);
  const appCallIdx = decodedGroup.findIndex((item) => {
    const d = getAppCallDetails(item.decoded);
    return (
      d &&
      d.type === "appl" &&
      d.sender === expectedSender &&
      d.appId === getLendingAppId() &&
      d.onComplete === 0 &&
      d.selectorHex === selector
    );
  });

  ensure(appCallIdx >= 0, "Unsecured loan app call not found in signed group");
  const appCall = getAppCallDetails(decodedGroup[appCallIdx].decoded);
  ensure(appCall.appArgs.length >= 3, "Invalid unsecured borrow args");

  const amountArg = decodeUint64Arg(appCall.appArgs[1]);
  const daysArg = decodeUint64Arg(appCall.appArgs[2]);

  ensure(amountArg === Number(algoAmount), "algoAmount mismatch in signed tx");
  ensure(daysArg === Number(daysToRepay), "daysToRepay mismatch in signed tx");
}

async function submitSignedGroupBase64(groupBase64Array) {
  const decodedGroup = groupBase64Array.map((tx) => decodeSignedTxn(tx));
  const rawGroup = decodedGroup.map((d) => d.raw);
  const txId = await sendRawGroup(rawGroup);
  return { txId, decodedGroup };
}

async function submitCollateralBorrowGroup({ signedGroupTxs, walletAddress, quote }) {
  ensure(Array.isArray(signedGroupTxs) && signedGroupTxs.length > 0, "signedGroupTxs required");
  const decodedGroup = signedGroupTxs.map((tx) => decodeSignedTxn(tx));
  validateCollateralBorrowGroup({ decodedGroup, expectedSender: walletAddress, quote });

  const txId = await sendRawGroup(decodedGroup.map((d) => d.raw));
  return { txId };
}

async function submitAddLiquidityGroup({ signedGroupTxs, walletAddress }) {
  ensure(Array.isArray(signedGroupTxs) && signedGroupTxs.length > 0, "signedGroupTxs required");
  const decodedGroup = signedGroupTxs.map((tx) => decodeSignedTxn(tx));
  validateAddLiquidityGroup({ decodedGroup, expectedSender: walletAddress });

  const txId = await sendRawGroup(decodedGroup.map((d) => d.raw));
  return { txId };
}

async function submitRepayGroup({ signedGroupTxs, walletAddress }) {
  ensure(Array.isArray(signedGroupTxs) && signedGroupTxs.length > 0, "signedGroupTxs required");
  const decodedGroup = signedGroupTxs.map((tx) => decodeSignedTxn(tx));
  await validateRepayGroup({ decodedGroup, expectedSender: walletAddress });

  const txId = await sendRawGroup(decodedGroup.map((d) => d.raw));
  return { txId };
}

async function submitUnsecuredBorrowGroup({ signedGroupTxs, walletAddress, algoAmount, daysToRepay }) {
  ensure(Array.isArray(signedGroupTxs) && signedGroupTxs.length > 0, "signedGroupTxs required");
  const decodedGroup = signedGroupTxs.map((tx) => decodeSignedTxn(tx));
  await validateUnsecuredBorrowGroup({
    decodedGroup,
    expectedSender: walletAddress,
    algoAmount,
    daysToRepay,
  });

  const txId = await sendRawGroup(decodedGroup.map((d) => d.raw));
  return { txId };
}

async function submitLendingOptIn({ signedOptInTx, walletAddress }) {
  const decoded = decodeSignedTxn(signedOptInTx);
  const details = getAppCallDetails(decoded.decoded);

  ensure(details, "Invalid signed transaction");
  ensure(details.type === "appl", "Signed tx must be app call");
  ensure(details.sender === walletAddress, "Signed tx sender mismatch");
  ensure(details.appId === getLendingAppId(), "Signed tx app id mismatch");
  ensure(details.onComplete === 1, "Signed tx must be OptIn onComplete");
  ensure(
    details.selectorHex === methodSelectorHex(METHODS.lendingOptIn),
    "Signed tx method must be opt_in"
  );

  const txId = await sendRawGroup([decoded.raw]);
  return { txId };
}

async function submitAuraOptIn({ signedOptInTx, walletAddress }) {
  if (!hasExternalAuraApp()) {
    return submitLendingOptIn({ signedOptInTx, walletAddress });
  }

  const decoded = decodeSignedTxn(signedOptInTx);
  const details = getAppCallDetails(decoded.decoded);

  ensure(details, "Invalid signed transaction");
  ensure(details.type === "appl", "Signed tx must be app call");
  ensure(details.sender === walletAddress, "Signed tx sender mismatch");
  ensure(details.appId === getAuraAppId(), "Signed tx app id mismatch");
  ensure(details.onComplete === 1, "Signed tx must be OptIn onComplete");
  ensure(
    details.selectorHex === methodSelectorHex(METHODS.auraOptIn),
    "Signed tx method must be opt_in"
  );

  const txId = await sendRawGroup([decoded.raw]);
  return { txId };
}

async function appOptInUsdc() {
  const account = getBackendAccount();
  const suggestedParams = await algodClient.getTransactionParams().do();
  suggestedParams.flatFee = true;
  suggestedParams.fee = 2000;
  const method = algosdk.ABIMethod.fromSignature(METHODS.appOptInUsdc);

  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    sender: account.addr.toString(),
    appIndex: getLendingAppId(),
    appArgs: [method.getSelector()],
    foreignAssets: [getUsdcAssetId()],
    suggestedParams,
  });

  const signed = txn.signTxn(account.sk);
  const response = await algodClient.sendRawTransaction(signed).do();
  const txId = response.txid || txn.txID().toString();
  await waitTx(txId, 20);

  return { txId };
}

async function getLendingUserState(walletAddress) {
  const appId = getLendingAppId();
  const [
    activeLoan,
    dueAmount,
    dueTs,
    netAura,
    unsecuredCreditLimit,
    blacklisted,
    availableAlgo,
  ] =
    await Promise.all([
      readLocalStateUint(walletAddress, appId, "loan_active"),
      readLocalStateUint(walletAddress, appId, "due_amount"),
      readLocalStateUint(walletAddress, appId, "due_ts"),
      Promise.all([
        readLocalStateUint(walletAddress, appId, "aura_earned"),
        readLocalStateUint(walletAddress, appId, "aura_penalty"),
      ]).then(([earned, penalty]) => Math.max(0, earned - penalty)),
      Promise.all([
        readLocalStateUint(walletAddress, appId, "aura_earned"),
        readLocalStateUint(walletAddress, appId, "aura_penalty"),
      ]).then(([earned, penalty]) => {
        const net = Math.max(0, earned - penalty);
        return Math.floor(net * 0.1 * MICRO_ALGO);
      }),
      readLocalStateUint(walletAddress, appId, "aura_blacklisted"),
      getPoolAlgo(),
    ]);

  const netAuraPoints = Number(netAura || 0);
  const unsecuredCreditLimitMicroAlgo = Number(unsecuredCreditLimit || 0);
  const unsecuredCreditLimitAlgo = unsecuredCreditLimitMicroAlgo / MICRO_ALGO;

  return {
    activeLoan: Number(activeLoan || 0),
    dueAmount: Number(dueAmount || 0),
    dueTs: Number(dueTs || 0),
    auraEarned: 0,
    auraPenalty: 0,
    netAura: netAuraPoints,
    netAuraPoints,
    unsecuredCreditLimit: unsecuredCreditLimitMicroAlgo,
    unsecuredCreditLimitMicroAlgo,
    unsecuredCreditLimitAlgo,
    blacklisted: Number(blacklisted || 0),
    availableAlgo: Number(availableAlgo || 0),
    availableAlgoUnits: Number(availableAlgo || 0) / MICRO_ALGO,
    unsecuredEligible: netAuraPoints >= MIN_AURA_FOR_UNSECURED && Number(blacklisted || 0) === 0,
  };
}

async function getAuraUserState(walletAddress) {
  if (!hasExternalAuraApp()) {
    const appId = getLendingAppId();
    const [earned, penalty, blacklisted] = await Promise.all([
      readLocalStateUint(walletAddress, appId, "aura_earned"),
      readLocalStateUint(walletAddress, appId, "aura_penalty"),
      readLocalStateUint(walletAddress, appId, "aura_blacklisted"),
    ]);
    const net = Math.max(0, earned - penalty);

    return {
      net: Number(net || 0),
      earned: Number(earned || 0),
      penalty: Number(penalty || 0),
      blacklisted: Number(blacklisted || 0),
    };
  }

  const appId = getAuraAppId();

  const [net, earned, penalty, blacklisted] = await Promise.all([
    executeReadonlyOrZero(appId, METHODS.auraGetNet, [walletAddress]),
    executeReadonlyOrZero(appId, METHODS.auraGetEarned, [walletAddress]),
    executeReadonlyOrZero(appId, METHODS.auraGetPenalty, [walletAddress]),
    executeReadonlyOrZero(appId, METHODS.auraGetBlacklisted, [walletAddress]),
  ]);

  return {
    net: Number(net || 0),
    earned: Number(earned || 0),
    penalty: Number(penalty || 0),
    blacklisted: Number(blacklisted || 0),
  };
}

async function syncAuraFromRepay(walletAddress, beforeEarned, afterEarned) {
  if (!hasExternalAuraApp()) return null;

  const delta = Math.max(0, Number(afterEarned) - Number(beforeEarned));
  if (delta <= 0) return null;

  const result = await executeAdminMethod(
    getAuraAppId(),
    METHODS.auraAddRepaymentAura,
    [walletAddress, delta]
  );

  return { txId: result.txId, addedAura: delta };
}

async function syncAuraFromDefault(walletAddress, beforePenalty, afterPenalty, isNowBlacklisted) {
  if (!hasExternalAuraApp()) {
    return {
      penaltyAdded: 0,
      penaltyTxId: null,
      blacklistTxId: null,
    };
  }

  const delta = Math.max(0, Number(afterPenalty) - Number(beforePenalty));
  let penaltyTxId = null;
  let blacklistTxId = null;

  if (delta > 0) {
    const penaltyResult = await executeAdminMethod(
      getAuraAppId(),
      METHODS.auraAddDefaultPenalty,
      [walletAddress, delta]
    );
    penaltyTxId = penaltyResult.txId;
  }

  if (Number(isNowBlacklisted) === 1) {
    const blacklistResult = await executeAdminMethod(
      getAuraAppId(),
      METHODS.auraBlacklistUnsecured,
      [walletAddress]
    );
    blacklistTxId = blacklistResult.txId;
  }

  return {
    penaltyAdded: delta,
    penaltyTxId,
    blacklistTxId,
  };
}

async function liquidateDefaultAndSyncAura(walletAddress) {
  const appId = getLendingAppId();
  const result = await executeAdminMethod(appId, METHODS.liquidateDefault, [walletAddress]);

  return {
    txId: result.txId,
    interestPenaltyMicroAlgo: Number(result.returnValue || 0),
    auraSync: null,
  };
}

module.exports = {
  getCollateralQuote,
  calculateDue,

  submitLendingOptIn,
  submitAuraOptIn,
  appOptInUsdc,

  submitCollateralBorrowGroup,
  submitAddLiquidityGroup,
  submitRepayGroup,
  submitUnsecuredBorrowGroup,

  getLendingUserState,
  getAuraUserState,

  syncAuraFromRepay,
  liquidateDefaultAndSyncAura,

  getLendingAppId,
  getAuraAppId,
  getUsdcAssetId,
  MIN_AURA_FOR_UNSECURED,
  MICRO_ALGO,
};
