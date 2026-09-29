import { Router } from "express";
import { getStocks } from "../services/marketData.service.js";
import { buildPortfolio } from "../services/portfolio.service.js";
import Portfolio from "../models/Portfolio.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/plan", async (req, res) => {
  const budget = Number(req.body.budget || 20000);
  const riskTolerance = req.body.riskTolerance || "moderate";
  const horizon = req.body.investmentHorizon || "medium";
  if (!Number.isFinite(budget) || budget < 1000) return res.status(400).json({ message: "Budget must be at least ₹1,000" });
  const plan = buildPortfolio(getStocks(), budget, riskTolerance, horizon);
  res.json(plan);
});

router.post("/save", requireAuth, async (req, res) => {
  const plan = buildPortfolio(getStocks(), Number(req.body.budget || req.user.budget), req.body.riskTolerance || req.user.riskTolerance, req.body.investmentHorizon || req.user.investmentHorizon);
  const saved = await Portfolio.create({ userId: req.user._id, budget: plan.budget, riskTolerance: plan.riskTolerance, investmentHorizon: plan.investmentHorizon, allocation: plan.allocation });
  res.status(201).json({ ...plan, portfolioId: saved._id });
});

export default router;
