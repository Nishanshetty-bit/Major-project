import { Router } from "express";
import { classifyBehavior, calculateProfile } from "../services/behavior.service.js";
import BehavioralResponse from "../models/BehavioralResponse.js";
import BehavioralProfile from "../models/BehavioralProfile.js";
import { requireAuth } from "../middleware/auth.js";
import { getRememberedBehaviorHistory, getRememberedBehaviorProfile, rememberBehaviorResponse } from "../services/behaviorStore.service.js";
import mongoose from "mongoose";

const router = Router();

router.post("/simulation/response", async (req, res) => {
  const sessionId = req.body.sessionId || "guest";
  const responseTimeMs = Number(req.body.responseTimeMs || 5000);
  const record = {
    userId: req.body.userId || undefined,
    sessionId,
    round: Number(req.body.round || 1),
    symbol: String(req.body.symbol || "").toUpperCase(),
    action: req.body.action,
    price: Number(req.body.price || 0),
    marketChange: Number(req.body.marketChange || 0),
    marketVolatility: Number(req.body.marketVolatility || Math.abs(Number(req.body.marketChange || 0))),
    responseTimeMs,
    pattern: classifyBehavior({ ...req.body, responseTimeMs })
  };

  if (mongoose.connection.readyState !== 1) {
    const response = rememberBehaviorResponse(record);
    const query = record.userId ? { userId: record.userId } : { sessionId };
    return res.status(201).json({
      response,
      pattern: record.pattern,
      profile: getRememberedBehaviorProfile(query),
      persistence: "in-memory",
      message: "MongoDB is not connected; this session's behavior data will not survive an API restart."
    });
  }

  const saved = await BehavioralResponse.create(record);
  const query = record.userId ? { userId: record.userId } : { sessionId };
  const actions = await BehavioralResponse.find(query).lean();
  const profile = calculateProfile(actions);
  await BehavioralProfile.findOneAndUpdate(query, { ...profile, ...query }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.status(201).json({ response: saved, pattern: record.pattern, profile });
});

router.get("/profile", async (req, res) => {
  const sessionId = req.query.sessionId || "guest";
  const userId = req.query.userId;
  const query = userId ? { userId } : { sessionId };
  if (mongoose.connection.readyState !== 1) {
    return res.json({ profile: getRememberedBehaviorProfile(query), persistence: "in-memory" });
  }
  const profile = await BehavioralProfile.findOne(query).lean();
  res.json({ profile: profile || calculateProfile([]) });
});

router.get("/history", async (req, res) => {
  const sessionId = req.query.sessionId || "guest";
  const userId = req.query.userId;
  const query = userId ? { userId } : { sessionId };
  if (mongoose.connection.readyState !== 1) {
    return res.json({ data: getRememberedBehaviorHistory(query), persistence: "in-memory" });
  }
  res.json({ data: await BehavioralResponse.find(query).sort({ createdAt: -1 }).limit(100).lean() });
});

export default router;
