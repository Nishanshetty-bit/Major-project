import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sessionId: { type: String, index: true },
  lossAversion: { type: Number, default: 0 },
  overconfidence: { type: Number, default: 0 },
  herdBehavior: { type: Number, default: 0 },
  fomo: { type: Number, default: 0 },
  panicSelling: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("BehavioralProfile", schema);
