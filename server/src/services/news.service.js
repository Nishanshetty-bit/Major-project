import Parser from "rss-parser";
import axios from "axios";

const parser = new Parser();
const cache = new Map();
const TTL = 5 * 60 * 1000;

export async function getNewsForStock(stock) {
  const key = stock.symbol;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < TTL) return cached.items;
  const query = encodeURIComponent(`${stock.name || stock.symbol} stock India finance`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
  try {
    const response = await axios.get(url, { timeout: 8000, responseType: "text" });
    const feed = await parser.parseString(response.data);
    const items = (feed.items || []).slice(0, 8).map(item => ({
      title: item.title || "Untitled",
      url: item.link || "",
      publishedAt: item.isoDate || item.pubDate || null,
      source: item.creator || item.source?.title || "Google News"
    }));
    cache.set(key, { time: Date.now(), items });
    return items;
  } catch {
    return [];
  }
}
