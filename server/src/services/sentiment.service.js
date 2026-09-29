import axios from "axios";

export async function analyzeHeadlines(headlines) {
  if (!headlines.length) return { label: "Neutral", score: 50, articles: [] };
  const base = process.env.ML_SERVICE_URL || "http://localhost:8000";
  const results = [];
  for (const article of headlines.slice(0, 8)) {
    try {
      const { data } = await axios.post(`${base}/sentiment`, { text: article.title }, { timeout: 5000 });
      results.push({ ...article, ...data });
    } catch {
      results.push({ ...article, label: "neutral", sentimentScore: 50, score: 0.5, model: "fallback" });
    }
  }
  const score = Math.round(results.reduce((sum, x) => sum + (x.sentimentScore ?? 50), 0) / results.length);
  const label = score >= 67 ? "Positive" : score <= 33 ? "Negative" : "Neutral";
  return { label, score, articles: results };
}
