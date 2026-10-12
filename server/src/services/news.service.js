import Parser from "rss-parser";
import axios from "axios";

const parser = new Parser();
const cache = new Map();
const TTL = 5 * 60 * 1000;

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function dedupeArticles(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.title}|${item.url}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getNewsForStock(stock) {
  const key = stock.symbol;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) return cached.items;

  const query = encodeURIComponent(`${stock.symbol} ${stock.name || ""} stock market finance india`.trim());
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const response = await axios.get(url, { timeout: 8000, responseType: "text" });
    const feed = await parser.parseString(response.data);
    const items = dedupeArticles((feed.items || []).slice(0, 10).map(item => ({
      title: normalizeText(item.title || "Untitled"),
      url: item.link || "",
      publishedAt: item.isoDate || item.pubDate || null,
      source: normalizeText(item.creator || item.source?.title || "Google News")
    }))).slice(0, 8);

    cache.set(key, { time: Date.now(), items });
    return items;
  } catch {
    return [];
  }
}
