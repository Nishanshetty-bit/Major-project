import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const processedDir = path.resolve(__dirname, "../../../data/processed");
const cache = new Map();

function readJson(file) {
  if (cache.has(file)) return cache.get(file);
  try {
    const value = JSON.parse(fs.readFileSync(path.join(processedDir, file), "utf8"));
    cache.set(file, value);
    return value;
  } catch { return null; }
}

export function getStocks() { return readJson("stocks.json") || []; }
export function getHistory(symbol) {
  const history = readJson("history.json");
  return history?.[symbol.toUpperCase()] || [];
}
export function getStock(symbol) { return getStocks().find(s => s.symbol.toUpperCase() === symbol.toUpperCase()); }
