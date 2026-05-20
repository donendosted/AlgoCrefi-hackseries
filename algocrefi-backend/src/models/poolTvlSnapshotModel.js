const mongoose = require("mongoose");

const poolTvlSnapshotSchema = new mongoose.Schema(
  {
    appId: {
      type: Number,
      required: true,
      index: true,
    },
    poolBalanceMicro: {
      type: Number,
      required: true,
    },
    poolBalanceAlgo: {
      type: Number,
      required: true,
    },
    totalShares: {
      type: Number,
      required: true,
    },
    sharePriceMicroAlgo: {
      type: Number,
      required: true,
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

poolTvlSnapshotSchema.index({ appId: 1, observedAt: 1 });

module.exports = mongoose.model("PoolTvlSnapshot", poolTvlSnapshotSchema);
