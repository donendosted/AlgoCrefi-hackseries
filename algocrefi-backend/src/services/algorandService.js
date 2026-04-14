const algosdk = require("algosdk");
const { algodClient, account } = require("../configs/algorand");

const sender = account.addr;

// helper signer
const signer = async (txnGroup, indexesToSign) => {
  return indexesToSign.map((i) =>
    txnGroup[i].signTxn(account.sk)
  );
};

async function depositToPool(amount) {
  const sp = await algodClient.getTransactionParams().do();

  const appId = Number(process.env.POOL_APP_ID || process.env.LENDING_APP_ID || process.env.APP_ID);
  const appAddress = algosdk.getApplicationAddress(appId);

  const atc = new algosdk.AtomicTransactionComposer();

  // 💸 payment txn
  const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: appAddress,
    amount: amount,
    suggestedParams: sp,
  });

  atc.addTransaction({
    txn: paymentTxn,
    signer,
  });

  // ⚙️ app call
  atc.addMethodCall({
    appID: appId,
    method: new algosdk.ABIMethod({
      name: "deposit",
      args: [{ type: "uint64", name: "amount" }],
      returns: { type: "void" },
    }),
    sender,
    suggestedParams: sp,
    signer,
    //methodArgs: [amount],
    methodArgs: [Number(amount)],
  });

  const result = await atc.execute(algodClient, 2);

  return result.txIDs;
}

module.exports = {
  depositToPool,
};
