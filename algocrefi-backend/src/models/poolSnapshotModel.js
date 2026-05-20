const mongoose = require("mongoose");

const poolSnapshotSchema = new mongoose.Schema(
  {
    pair: {
      type: String,
      required: true,
      default: "ALGO_USDC",
      index: true,
    },
    poolAddress: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    quoteAssetId: {
      type: Number,
      required: true,
    },
    quoteSymbol: {
      type: String,
      required: true,
      trim: true,
    },
    usdcPerAlgo: {
      type: Number,
      required: true,
    },
    algoReserve: {
      type: Number,
      required: true,
    },
    quoteReserve: {
      type: Number,
      required: true,
    },
    round: {
      type: Number,
      default: 0,
    },
    liquidityUsd: {
      type: Number,
      default: 0,
    },
    volume24hUsd: {
      type: Number,
      default: 0,
    },
    priceChange24hPct: {
      type: Number,
      default: 0,
    },
    observedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

poolSnapshotSchema.index({ pair: 1, observedAt: 1 });

module.exports = mongoose.model("PoolSnapshot", poolSnapshotSchema);
