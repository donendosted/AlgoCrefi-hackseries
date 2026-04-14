const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    walletAddress: {
      type: String,
      required: true,
    },

    amount: {
      type: Number, // microAlgos
      required: true,
    },

    txId: {
      type: String,
      required: true,
      unique: true, // prevent duplicate recording
    },

    appId: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deposit", depositSchema);