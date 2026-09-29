import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  budget: { type: Number, default: 20000 },
  riskTolerance: { type: String, enum: ["conservative", "moderate", "aggressive"], default: "moderate" },
  investmentHorizon: { type: String, enum: ["short", "medium", "long"], default: "medium" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
