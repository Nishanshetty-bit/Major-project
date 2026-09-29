import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sessionId: { type: String, index: true },
  round: Number,
  symbol: String,
  action: { type: String, enum: ["BUY", "HOLD", "SELL"] },
  price: Number,
  marketChange: Number,
  marketVolatility: Number,
  pattern: String,
  responseTimeMs: Number,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("BehavioralResponse", schema);
