import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import mongoose from "mongoose";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const secret = () => process.env.JWT_SECRET || "dev-secret-change-me";
const credentials = z.object({ name: z.string().min(2).optional(), email: z.string().email(), password: z.string().min(6) });
const databaseUnavailableMessage = "Account storage is temporarily unavailable. Check the database connection and try again.";
const isDatabaseError = (error) => mongoose.connection.readyState !== 1 || /^(Mongo|Mongoose)/.test(error?.name || "");

router.post("/register", async (req, res) => {
  try {
    const data = credentials.parse(req.body);
    if (!data.name) return res.status(400).json({ message: "Name is required" });
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: databaseUnavailableMessage });
    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already registered" });
    const user = await User.create({ name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12) });
    const token = jwt.sign({ sub: user._id.toString() }, secret(), { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    if (isDatabaseError(error)) return res.status(503).json({ message: databaseUnavailableMessage });
    res.status(400).json({ message: error.message || "Invalid registration" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const data = credentials.omit({ name: true }).parse(req.body);
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: databaseUnavailableMessage });
    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) return res.status(401).json({ message: "Invalid email or password" });
    const token = jwt.sign({ sub: user._id.toString() }, secret(), { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, budget: user.budget, riskTolerance: user.riskTolerance, investmentHorizon: user.investmentHorizon } });
  } catch (error) {
    if (isDatabaseError(error)) return res.status(503).json({ message: databaseUnavailableMessage });
    res.status(400).json({ message: error.message || "Invalid login" });
  }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
