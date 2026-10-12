import axios from "axios";

const POSITIVE_TERMS = new Set([
  "beat", "beats", "benefit", "bullish", "gain", "gains", "growth", "grow", "improve",
  "improved", "improves", "increase", "increased", "increases", "outperform", "outperforms",
  "positive", "profit", "profits", "record", "rise", "rises", "strong", "surge", "upgrade",
  "upgraded", "upgrades", "win", "wins", "expansion", "expands", "boost", "boosts"
]);
const NEGATIVE_TERMS = new Set([
  "decline", "declines", "default", "downgrade", "downgraded", "drop", "drops", "fall",
  "falling", "falls", "fraud", "loss", "losses", "negative", "outlook", "poor", "recession",
  "risk", "risks", "slump", "warns", "weak", "weaker", "warning", "cut", "cuts", "miss",
  "misses", "worry", "worries", "delay", "delays", "pressure", "pressures"
]);
const NEGATIONS = new Set(["no", "not", "never", "without", "fails", "failed", "halted", "halt"]);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getRecencyWeight(publishedAt) {
  if (!publishedAt) return 1;
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 1;
  const ageHours = (Date.now() - published) / (1000 * 60 * 60);
  if (ageHours <= 12) return 1.4;
  if (ageHours <= 24) return 1.2;
  if (ageHours <= 72) return 1.0;
  if (ageHours <= 168) return 0.7;
  return 0.4;
}

function scoreHeadline(title) {
  const text = String(title || "").toLowerCase();
  const tokens = text.match(/[a-z]+/g) || [];

  let polarity = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const prevWindow = tokens.slice(Math.max(0, index - 3), index);
    let weight = 0;

    if (POSITIVE_TERMS.has(token)) weight = 1;
    if (NEGATIVE_TERMS.has(token)) weight = -1;

    if (weight !== 0 && prevWindow.some(part => NEGATIONS.has(part))) {
      weight *= -1;
    }

    polarity += weight;
  }

  const rawScore = 50 + polarity * 8;
  const score = clamp(Math.round(rawScore), 0, 100);
  const label = score >= 67 ? "Positive" : score <= 33 ? "Negative" : "Neutral";
  return { label, sentimentScore: score, score: Number((score / 100).toFixed(2)), model: "local-finance-lexicon" };
}

export async function analyzeHeadlines(headlines) {
  if (!headlines.length) return { label: "Neutral", score: 50, articles: [] };

  const base = process.env.ML_SERVICE_URL;
  const articles = headlines.slice(0, 8).map(article => {
    const recencyWeight = getRecencyWeight(article.publishedAt);
    const scored = scoreHeadline(article.title);
    return {
      ...article,
      ...scored,
      weight: recencyWeight,
      recencyWeight,
      source: article.source || "News feed"
    };
  });

  if (base) {
    try {
      const result = await Promise.all(articles.map(async article => {
        const { data } = await axios.post(`${base}/sentiment`, { text: article.title }, { timeout: 5000 });
        return { ...article, ...data, weight: article.weight };
      }));
      if (result.length) {
        const weightedSum = result.reduce((sum, item) => sum + Number(item.sentimentScore ?? 50) * Number(item.weight || 1), 0);
        const totalWeight = result.reduce((sum, item) => sum + Number(item.weight || 1), 0);
        const score = totalWeight ? Math.round(weightedSum / totalWeight) : 50;
        const label = score >= 67 ? "Positive" : score <= 33 ? "Negative" : "Neutral";
        return { label, score, articles: result };
      }
    } catch {
      // fall through to the local lexicon sentiment model below.
    }
  }

  const weightedSum = articles.reduce((sum, article) => sum + Number(article.sentimentScore ?? 50) * Number(article.weight || 1), 0);
  const totalWeight = articles.reduce((sum, article) => sum + Number(article.weight || 1), 0);
  const score = totalWeight ? Math.round(weightedSum / totalWeight) : 50;
  const label = score >= 67 ? "Positive" : score <= 33 ? "Negative" : "Neutral";

  return { label, score, articles };
}
