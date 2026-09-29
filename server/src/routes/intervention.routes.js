import { Router } from "express";
import { getStock } from "../services/marketData.service.js";

const router = Router();

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

router.post("/check", async (req, res) => {
  const stock = getStock(req.body.symbol || "");
  if (!stock) return res.status(404).json({ message: "Stock not found" });
  const action = String(req.body.action || "HOLD").toUpperCase();
  const fomo = Number(req.body.fomo || 0);
  const panic = Number(req.body.panicSelling || 0);
  let risk = 20;
  const reasons = [];

  if (stock.volatility > 30) { risk += 25; reasons.push(`Annualized volatility is ${stock.volatility}%`); }
  if (Math.abs(stock.maxDrawdown) > 30) { risk += 15; reasons.push(`Historical maximum drawdown is ${stock.maxDrawdown}%`); }
  if (action === "BUY" && Number(req.body.marketChange || 0) >= 8 && fomo >= 50) { risk += 30; reasons.push("The action matches a previously observed FOMO pattern"); }
  if (action === "SELL" && Number(req.body.marketChange || 0) <= -7 && panic >= 50) { risk += 30; reasons.push("The action matches a previously observed panic-selling pattern"); }

  risk = clamp(risk);
  const shouldWarn = risk >= 50;
  res.json({ riskScore: risk, shouldWarn, severity: risk >= 75 ? "high" : risk >= 50 ? "medium" : "low", message: shouldWarn ? "Review the historical risk and your behavioral pattern before continuing the simulated action." : "No strong intervention trigger detected.", reasons });
});

export default router;
