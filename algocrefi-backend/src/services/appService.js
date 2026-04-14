const algosdk = require("algosdk");
require("dotenv").config();

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN || "",
  process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
  process.env.ALGOD_PORT || ""
);

function getAccount() {
  return algosdk.mnemonicToSecretKey(process.env.MNEMONIC);
}

function getBackendAddress() {
  return getAccount().addr.toString();
}

function getAppId() {
  return Number(process.env.POOL_APP_ID || process.env.LENDING_APP_ID || process.env.APP_ID);
}

function toHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function methodSelectorHex(signature) {
  const method = algosdk.ABIMethod.fromSignature(signature);
  return toHex(method.getSelector());
}

async function optInToApp() {
  const account = getAccount();
  const appId = getAppId();

  const suggestedParams = await algodClient.getTransactionParams().do();

  const method = algosdk.ABIMethod.fromSignature("opt_in()void");
  const atc = new algosdk.AtomicTransactionComposer();

  atc.addMethodCall({
    appID: appId,
    method,
    methodArgs: [],
    sender: account.addr.toString(),
    signer: algosdk.makeBasicAccountTransactionSigner(account),
    suggestedParams: suggestedParams,
    onComplete: algosdk.OnApplicationComplete.OptInOC,
  });

  const result = await atc.execute(algodClient, 20);
  return result.txIDs[0];
}

async function callPoolDeposit(amount) {
  const account = getAccount();
  const appId = getAppId();
  
  const suggestedParams = await algodClient.getTransactionParams().do();
  const method = algosdk.ABIMethod.fromSignature("deposit(uint64)uint64");
  
  const atc = new algosdk.AtomicTransactionComposer();
  
  atc.addMethodCall({
    appID: appId,
    method: method,
    methodArgs: [amount],
    sender: account.addr.toString(),
    signer: algosdk.makeBasicAccountTransactionSigner(account),
    suggestedParams: suggestedParams,
  });
  
  const result = await atc.execute(algodClient, 20);
  
  return {
    txId: result.txIDs[0],
    sharesMinted: Number(result.methodResults[0].returnValue)
  };
}

async function callPoolWithdraw(shares) {
  const account = getAccount();
  const appId = getAppId();
  
  const suggestedParams = await algodClient.getTransactionParams().do();
  const method = algosdk.ABIMethod.fromSignature("withdraw(uint64)uint64");
  
  const atc = new algosdk.AtomicTransactionComposer();
  
  atc.addMethodCall({
    appID: appId,
    method: method,
    methodArgs: [shares],
    sender: account.addr.toString(),
    signer: algosdk.makeBasicAccountTransactionSigner(account),
    suggestedParams: suggestedParams,
  });
  
  const result = await atc.execute(algodClient, 10);
  
  return {
    txId: result.txIDs[0],
    algoWithdrawn: Number(result.methodResults[0].returnValue)
  };
}

async function submitSignedAppCall(signedTxnBase64, expectedSender, expectedOnComplete) {
  const appId = getAppId();
  const signedBytes = Buffer.from(signedTxnBase64, "base64");
  const decoded = algosdk.decodeSignedTransaction(signedBytes);

  if (!decoded || !decoded.txn) {
    throw new Error("Invalid signed transaction");
  }

  const sender = decoded.txn.sender.toString();
  if (expectedSender && sender !== expectedSender) {
    throw new Error("Signed transaction sender mismatch");
  }

  if (decoded.txn.type !== "appl") {
    throw new Error("Signed transaction must be app call");
  }

  if (Number(decoded.txn.applicationCall?.appIndex ?? 0) !== appId) {
    throw new Error("Signed transaction app id mismatch");
  }

  if (expectedOnComplete !== undefined) {
    const onComplete = Number(decoded.txn.applicationCall?.onComplete ?? -1);
    if (onComplete !== Number(expectedOnComplete)) {
      throw new Error("Signed transaction onComplete mismatch");
    }
  }

  if (Number(expectedOnComplete) === 0) {
    const isOptedIn = await checkAccountOptedIn(sender, appId);
    if (!isOptedIn) {
      throw new Error(
        `Account ${sender} is not opted in to pool app ${appId}. Call /api/pool/opt-in with this same wallet, wait for confirmation, then submit deposit again.`
      );
    }
  }

  const response = await algodClient.sendRawTransaction(signedBytes).do();
  const txId = response.txid;
  await algosdk.waitForConfirmation(algodClient, txId, 20);
  return txId;
}

function decodeSignedTxn(base64) {
  const raw = Buffer.from(base64, "base64");
  const decoded = algosdk.decodeSignedTransaction(raw);
  return { raw, decoded };
}

function decodeUint64Arg(argBytes) {
  return Number(algosdk.decodeUint64(argBytes, "safe"));
}

async function submitSignedDepositGroup(signedGroupTxs, expectedSender) {
  if (!Array.isArray(signedGroupTxs) || signedGroupTxs.length < 2) {
    throw new Error("signedGroupTxs must include payment and deposit app call");
  }

  const appId = getAppId();
  const appAddress = algosdk.getApplicationAddress(appId).toString();
  const selector = methodSelectorHex("deposit(uint64)uint64");
  const decodedGroup = signedGroupTxs.map((tx) => decodeSignedTxn(tx));

  const appCallIdx = decodedGroup.findIndex((item) => {
    const txn = item.decoded?.txn;
    const appCall = txn?.applicationCall;
    const appArgs = appCall?.appArgs || [];
    const methodSelector = appArgs[0] ? toHex(appArgs[0]) : "";

    return (
      txn?.type === "appl" &&
      txn?.sender?.toString() === expectedSender &&
      Number(appCall?.appIndex || 0) === appId &&
      Number(appCall?.onComplete || 0) === 0 &&
      methodSelector === selector
    );
  });

  if (appCallIdx < 0) {
    throw new Error("Deposit app call not found in signed group");
  }

  const appCallTxn = decodedGroup[appCallIdx].decoded.txn;
  const appArgs = appCallTxn.applicationCall?.appArgs || [];
  if (appArgs.length < 2) {
    throw new Error("Invalid deposit app args");
  }

  const paymentTxnIndex = decodeUint64Arg(appArgs[1]);
  if (paymentTxnIndex < 0 || paymentTxnIndex >= decodedGroup.length) {
    throw new Error("Invalid deposit payment txn index");
  }

  const paymentTxn = decodedGroup[paymentTxnIndex].decoded?.txn;
  if (!paymentTxn || paymentTxn.type !== "pay") {
    throw new Error("Referenced deposit payment txn is invalid");
  }

  if (paymentTxn.sender.toString() !== expectedSender) {
    throw new Error("Deposit payment sender mismatch");
  }

  if (paymentTxn.payment.receiver.toString() !== appAddress) {
    throw new Error("Deposit payment receiver must be app account");
  }

  const paymentAmount = Number(paymentTxn.payment.amount || 0);
  if (paymentAmount <= 0) {
    throw new Error("Deposit amount must be positive");
  }

  const response = await algodClient.sendRawTransaction(decodedGroup.map((d) => d.raw)).do();
  const appTxId = response.txid;
  await algosdk.waitForConfirmation(algodClient, appTxId, 20);

  return {
    appTxId,
    paymentTxId: paymentTxn.txID().toString(),
    paymentAmount,
  };
}

async function checkAccountOptedIn(address, appId) {
  try {
    await algodClient.accountApplicationInformation(address, appId).do();
    return true;
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("404") || msg.includes("has not opted in")) {
      return false;
    }
    throw err;
  }
}

async function getPoolInfo() {
  const appId = getAppId();
  const app = await algodClient.getApplicationByID(Number(appId)).do();
  const state = app?.params?.["global-state"] || app?.params?.globalState || [];
  const entry = state.find((item) => Buffer.from(item.key, "base64").toString() === "pool");
  return Number(entry?.value?.uint || 0);
}

async function getTotalShares() {
  const appId = getAppId();
  const app = await algodClient.getApplicationByID(Number(appId)).do();
  const state = app?.params?.["global-state"] || app?.params?.globalState || [];
  const entry = state.find((item) => Buffer.from(item.key, "base64").toString() === "total_shares");
  return Number(entry?.value?.uint || 0);
}

async function getUserShares(address) {
  const appId = getAppId();

  try {
    const info = await algodClient.accountApplicationInformation(address, appId).do();
    const localState = info.appLocalState || info["app-local-state"];
    const keyValues = localState?.keyValue || localState?.["key-value"] || [];

    const sharesEntry = keyValues.find((kv) => {
      const key = Buffer.from(kv.key, "base64").toString();
      return key === "shares";
    });

    if (!sharesEntry) return 0;
    const raw = sharesEntry.value?.uint ?? 0;
    return Number(raw);
  } catch (err) {
    if (String(err.message || "").includes("404")) return 0;
    throw err;
  }
}

module.exports = { 
  optInToApp,
  callPoolDeposit, 
  callPoolWithdraw, 
  submitSignedAppCall,
  submitSignedDepositGroup,
  getPoolInfo,
  getUserShares,
  getTotalShares,
  getAccount,
  getBackendAddress,
};
