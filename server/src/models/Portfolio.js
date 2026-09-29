import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  budget: Number,
  riskTolerance: String,
  investmentHorizon: String,
  allocation: [{
    symbol: String,
    percentage: Number,
    amount: Number,
    shares: Number,
    price: Number,
    rationale: String
  }]
}, { timestamps: true });

export default mongoose.model("Portfolio", schema);
