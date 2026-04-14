const algosdk = require("algosdk");
require("dotenv").config();

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN,
  process.env.ALGOD_SERVER,
  process.env.ALGOD_PORT
);

const account = algosdk.mnemonicToSecretKey(process.env.MNEMONIC);

module.exports = {
  algodClient,
  account,
};

(async () => {
  try {
    const status = await algodClient.status().do();

    const round = status["last-round"] ?? status.lastRound;

    console.log("Algorand connected ✅ Round:", round);
  } catch (err) {
    console.error("Algorand connection failed ❌", err);
  }
})();
