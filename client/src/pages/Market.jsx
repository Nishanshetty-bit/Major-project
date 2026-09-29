import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Globe2, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function LoadingMarket() { return <div className="space-y-5"><div className="skeleton h-36 rounded-3xl" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="skeleton h-28 rounded-2xl" />)}</div><div className="grid gap-5 lg:grid-cols-2"><div className="skeleton h-80 rounded-2xl" /><div className="skeleton h-80 rounded-2xl" /></div></div>; }

function IndexCoverageCard({ label }) {
  return <article className="market-index-card"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-slate-500">INDEX FEED</p><h2 className="mt-2 text-lg font-semibold text-slate-100">{label}</h2></div><Globe2 size={17} className="text-slate-600" /></div><p className="mt-3 text-2xl font-semibold text-slate-500">—</p><p className="mt-1 text-[10px] text-slate-600">Not included in the supplied equities dataset</p></article>;
}

export default function Market() {
  const [overview, setOverview] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.allSettled([api.get("/stocks/market-overview"), api.get("/stocks/recommendations")]).then(([breadth, ranking]) => {
      if (!active) return;
      if (breadth.status === "fulfilled") setOverview(breadth.value.data);
      else setError("Market breadth is unavailable. Check the backend and processed price data.");
      if (ranking.status === "fulfilled") setStocks(ranking.value.data.data || []);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const sentiment = useMemo(() => {
    const classified = stocks.filter(stock => Number(stock.newsArticleCount) > 0);
    const total = classified.length || 1;
    const positive = classified.filter(stock => String(stock.sentiment).toLowerCase() === "positive").length;
    const negative = classified.filter(stock => String(stock.sentiment).toLowerCase() === "negative").length;
    const neutral = classified.length - positive - negative;
    return { positive, negative, neutral, sample: classified.length, positivePct: positive / total * 100, neutralPct: neutral / total * 100, negativePct: negative / total * 100 };
  }, [stocks]);

  if (loading) return <LoadingMarket />;
  const total = overview?.coverage || 0;
  const breadth = total ? [
    { label: "Advancers", count: overview.advancers, icon: TrendingUp, tint: "green" },
    { label: "Decliners", count: overview.decliners, icon: TrendingDown, tint: "red" },
    { label: "Unchanged", count: overview.unchanged, icon: Activity, tint: "blue" },
    { label: "Coverage", count: total, icon: BarChart3, tint: "violet" }
  ] : [];

  return <div className="space-y-6">
    <header className="market-hero data-grid relative overflow-hidden rounded-3xl p-5 sm:p-7"><div className="hero-orb hero-orb-one" /><div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">HISTORICAL MARKET PULSE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Market overview</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Breadth from each symbol's latest two available price observations.</p></div><div className="market-date-chip flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-300"><CalendarDays size={14} className="text-indigo-300" />{overview?.dateRange ? `${overview.dateRange.earliest} – ${overview.dateRange.latest}` : "No observation dates"}</div></div></header>
    {error && <div role="alert" className="error-banner rounded-xl px-4 py-3 text-sm">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{breadth.map(({ label, count, icon: Icon, tint }) => <article className="metric-card" key={label}><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-3 text-2xl font-semibold text-slate-100">{number.format(count)}</p></div><span className={`metric-icon metric-icon-${tint}`}><Icon size={17} /></span></div><p className="mt-2 text-[10px] text-slate-500">of {number.format(total)} symbols with price history</p></article>)}</section>
    <div className="grid gap-3 sm:grid-cols-2"><IndexCoverageCard label="NIFTY 50" /><IndexCoverageCard label="SENSEX" /></div>
    <section className="grid gap-5 xl:grid-cols-3"><article className="surface-card p-5 sm:p-6 xl:col-span-2"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">LATEST RECORDED CHANGE</p><h2 className="mt-1 text-lg font-semibold">Market breadth</h2><p className="mt-1 text-xs text-slate-500">Per-symbol returns between the two most recent observations. Dates may differ across symbols.</p></div><span className="text-[10px] text-slate-500">{total} symbols</span></div><div className="mt-6 space-y-4">{[["Advancers", overview?.advancers || 0, "breadth-positive"], ["Unchanged", overview?.unchanged || 0, "breadth-neutral"], ["Decliners", overview?.decliners || 0, "breadth-negative"]].map(([label, count, className]) => <div key={label}><div className="mb-1.5 flex justify-between text-xs"><span className="text-slate-300">{label}</span><span className="font-semibold text-slate-200">{number.format(count)} <span className="font-normal text-slate-500">({total ? number.format(count / total * 100) : 0}%)</span></span></div><div className="breadth-track"><div className={className} style={{ width: `${total ? count / total * 100 : 0}%` }} /></div></div>)}</div><div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-700/40 pt-4 text-[10px] text-slate-500"><span className="flex items-center gap-1"><span className="legend-dot bg-emerald-400" />Price rose</span><span className="flex items-center gap-1"><span className="legend-dot bg-rose-400" />Price fell</span><span className="flex items-center gap-1"><span className="legend-dot bg-slate-500" />No change</span></div></article>
      <article className="surface-card p-5 sm:p-6"><p className="eyebrow">RANKED STOCK NEWS</p><h2 className="mt-1 text-lg font-semibold">Sentiment snapshot</h2><p className="mt-1 text-xs text-slate-500">Headline classifications among ranked stocks with at least one fetched article.</p><div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-800">{sentiment.sample > 0 && <><div className="bg-emerald-400 transition-all" style={{ width: `${sentiment.positivePct}%` }} /><div className="bg-slate-500 transition-all" style={{ width: `${sentiment.neutralPct}%` }} /><div className="bg-rose-400 transition-all" style={{ width: `${sentiment.negativePct}%` }} /></>}</div><div className="mt-5 space-y-3">{[["Positive", sentiment.positive, "text-emerald-300"], ["Neutral", sentiment.neutral, "text-slate-300"], ["Negative", sentiment.negative, "text-rose-300"]].map(([label, count, color]) => <div className="flex items-center justify-between text-xs" key={label}><span className="flex items-center gap-2"><span className={`legend-dot ${label === "Positive" ? "bg-emerald-400" : label === "Negative" ? "bg-rose-400" : "bg-slate-500"}`} />{label}</span><span className={`font-semibold ${color}`}>{count} <span className="font-normal text-slate-500">{sentiment.sample ? `(${number.format(count / sentiment.sample * 100)}%)` : ""}</span></span></div>)}</div>{sentiment.sample === 0 && <p className="mt-4 text-[10px] text-slate-500">Headline feed unavailable; no neutral fallback is counted as a news result.</p>}<Link to="/stocks" className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-white">Explore stock intelligence <ArrowUpRight size={14} /></Link></article></section>
    <section className="grid gap-5 lg:grid-cols-2"><Leaders title="Top advancers" items={overview?.leaders || []} positive /><Leaders title="Top decliners" items={overview?.laggards || []} /></section>
    <p className="text-[10px] leading-relaxed text-slate-500">This view summarizes the latest recorded per-symbol price change in the provided historical files. It is not a synchronized live market breadth measure. Index values are omitted because the supplied dataset contains individual equities, not NIFTY 50 or SENSEX index prices.</p>
  </div>;
}

function Leaders({ title, items, positive = false }) {
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return <section className="surface-card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{title}</h2><Icon size={16} className={positive ? "text-emerald-300" : "text-rose-300"} /></div><div className="mt-3 divide-y divide-slate-700/40">{items.length ? items.map(item => <Link to={`/stocks/${item.symbol}`} key={item.symbol} className="flex items-center justify-between py-3"><div><p className="text-sm font-semibold text-slate-200">{item.symbol}</p><p className="mt-0.5 text-[10px] text-slate-500">Observation {item.date}</p></div><span className={`text-sm font-semibold ${item.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{item.change >= 0 ? "+" : ""}{number.format(item.change)}%</span></Link>) : <p className="py-5 text-sm text-slate-500">No price changes available.</p>}</div></section>;
}
