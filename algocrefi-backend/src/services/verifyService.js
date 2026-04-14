const algosdk = require("algosdk");

const indexerClient = new algosdk.Indexer(
  "",
  "https://testnet-idx.algonode.cloud",
  ""
);

function safeBigInt(v) {
  return v !== undefined && v !== null ? Number(v.toString()) : v;
}

async function verifyTransaction(txId) {
  const txInfo = await indexerClient.lookupTransactionByID(txId).do();

  if (!txInfo || !txInfo.transaction) {
    throw new Error("Transaction not found");
  }

  const tx = txInfo.transaction;

  if (!tx.confirmedRound) {
    throw new Error("Transaction not confirmed");
  }

  const paymentTxn = tx.paymentTransaction;
  
  return {
    sender: tx.sender,
    receiver: paymentTxn ? String(paymentTxn.receiver) : undefined,
    amount: paymentTxn ? safeBigInt(paymentTxn.amount) : 0,
    confirmedRound: safeBigInt(tx.confirmedRound)
  };
}

module.exports = { verifyTransaction };
