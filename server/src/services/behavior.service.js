function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

export function classifyBehavior({ action, marketChange, responseTimeMs = 5000 }) {
  if (action === "SELL" && marketChange <= -7) return "possible_panic_sell";
  if (action === "BUY" && marketChange >= 8) return "possible_fomo";
  if (action === "BUY" && marketChange <= -7) return "contrarian_buy";
  if (action === "SELL" && marketChange >= 8) return "profit_taking";
  if (action === "HOLD" && Math.abs(marketChange) >= 8) return "high_volatility_hold";
  if (responseTimeMs < 1000 && Math.abs(marketChange) >= 8) return "rapid_reaction";
  return action === "BUY" ? "normal_buy" : action === "SELL" ? "normal_sell" : "normal_hold";
}

export function calculateProfile(actions) {
  const total = Math.max(actions.length, 1);
  const panic = actions.filter(a => a.pattern === "possible_panic_sell").length;
  const fomo = actions.filter(a => a.pattern === "possible_fomo").length;
  const loss = actions.filter(a => a.marketChange < -5 && ["SELL", "HOLD"].includes(a.action)).length;
  const rapid = actions.filter(a => a.pattern === "rapid_reaction").length;
  const herd = actions.filter(a => a.pattern === "herd_following").length;
  const over = actions.filter(a => a.marketChange > 8 && a.action === "BUY").length;

  const profile = {
    lossAversion: clamp(loss / total * 100),
    overconfidence: clamp(over / total * 100),
    herdBehavior: clamp(herd / total * 100),
    fomo: clamp(fomo / total * 100),
    panicSelling: clamp(panic / total * 100),
    confidence: clamp(100 - (rapid / total * 50))
  };
  return profile;
}
