import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CircleHelp, Database, Fingerprint, Gauge, Sparkles, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const sessionId = localStorage.getItem("stockAdvisorSession") || (() => {
  const id = crypto.randomUUID?.() || `s-${Date.now()}`;
  localStorage.setItem("stockAdvisorSession", id);
  return id;
})();

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function LoadingDashboard() {
  return <div aria-label="Loading market intelligence" className="space-y-6">
    <div className="skeleton h-44 rounded-3xl" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div className="skeleton h-32 rounded-2xl" key={i} />)}</div>
    <div className="grid gap-5 xl:grid-cols-3"><div className="skeleton h-[390px] rounded-2xl xl:col-span-2" /><div className="skeleton h-[390px] rounded-2xl" /></div>
  </div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [universe, setUniverse] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([
      api.get("/stocks/recommendations"),
      api.get("/stocks"),
      api.get(`/behavior/profile?sessionId=${sessionId}`)
    ]).then(([rankings, allStocks, behavior]) => {
      if (!active) return;
      if (rankings.status === "fulfilled") setStocks(rankings.value.data.data || []);
      else setError("Stock rankings could not be loaded. Check that the API is running and retry.");
      if (allStocks.status === "fulfilled") setUniverse(allStocks.value.data.data || []);
      if (behavior.status === "fulfilled") setProfile(behavior.value.data.profile || null);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => {
    const up = universe.filter(stock => Number(stock.currentPrice) >= Number(stock.sma20)).length;
    const scoredNews = stocks.filter(stock => Number(stock.newsArticleCount) > 0);
    const sentimentScore = scoredNews.length ? scoredNews.reduce((sum, stock) => sum + Number(stock.sentimentScore ?? 50), 0) / scoredNews.length : null;
    const sentimentLabel = sentimentScore === null ? "Unavailable" : sentimentScore >= 67 ? "Positive" : sentimentScore <= 33 ? "Negative" : "Neutral";
    const averageVolatility = universe.length ? universe.reduce((sum, stock) => sum + Number(stock.volatility || 0), 0) / universe.length : null;
    return { up, sentimentScore, sentimentLabel, averageVolatility };
  }, [stocks, universe]);

  if (loading) return <LoadingDashboard />;

  const top = stocks.slice(0, 8);
  const best = stocks[0];
  const cards = [
    { label: "Stocks in dataset", value: universe.length ? number.format(universe.length) : "—", detail: "Processed NSE equities", icon: Database, tint: "blue" },
    { label: "Top confidence", value: best ? `${Math.round(best.confidenceScore)}/100` : "—", detail: best?.symbol || "Waiting for ranking", icon: Sparkles, tint: "violet" },
    { label: "Above 20-day average", value: universe.length ? `${summary.up} / ${universe.length}` : "—", detail: "Historical breadth signal", icon: Activity, tint: "green" },
    { label: "Average volatility", value: summary.averageVolatility === null ? "—" : `${number.format(summary.averageVolatility)}%`, detail: "Annualized · full universe", icon: Gauge, tint: "amber" },
    { label: "News sentiment", value: summary.sentimentLabel, detail: summary.sentimentScore === null ? "No news signals available" : `Mean signal ${Math.round(summary.sentimentScore)} / 100`, icon: BarChart3, tint: "cyan" }
  ];

  return <div className="space-y-6">
    {error && <div role="alert" className="error-banner flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm"><span>{error}</span><button onClick={() => window.location.reload()} className="font-semibold">Retry</button></div>}

    <section className="dashboard-hero data-grid relative overflow-hidden rounded-[24px] px-5 py-6 sm:px-8 sm:py-8">
      <div className="hero-orb hero-orb-one" />
      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div><p className="eyebrow flex items-center gap-2"><span className="status-pulse" /> YOUR MARKET INTELLIGENCE</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[38px]">{greeting()}, {user?.name?.split(" ")[0] || "Nishan"}</h1><p className="mt-2 text-sm text-slate-300 sm:text-base">Your personalized market intelligence at a glance.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/stocks" className="secondary-button inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">Explore stocks <ArrowRight size={15} /></Link><Link to="/portfolio" className="primary-button inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">Build a portfolio <ArrowUpRight size={15} /></Link></div>
      </div>
      <div className="relative z-10 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate-400"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Historical dataset connected</span><span>{number.format(universe.length)} processed equities</span><span>Scores are evidence summaries, not forecasts</span></div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Market intelligence summary">
      {cards.map(({ label, value, detail, icon: Icon, tint }, i) => <article className={`metric-card reveal reveal-delay-${Math.min(i, 3)}`} key={label}><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-slate-400">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">{value}</p></div><span className={`metric-icon metric-icon-${tint}`}><Icon size={17} /></span></div><p className="mt-2 text-[11px] text-slate-500">{detail}</p></article>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-3">
      <article className="surface-card min-w-0 p-5 sm:p-6 xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">EXPLAINABLE RANKING</p><h2 className="mt-1 text-lg font-semibold">AI stock intelligence</h2><p className="mt-1 text-xs text-slate-500">Confidence scores for the highest-ranked stocks in your dataset.</p></div><Link to="/stocks" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-white">View all stocks <ArrowRight size={14} /></Link></div>
        {top.length ? <><div className="mt-5 h-[230px] min-w-0 sm:h-[260px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={top} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}><defs><linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#718cff" stopOpacity={0.3} /><stop offset="100%" stopColor="#718cff" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="symbol" axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ border: "1px solid rgba(148,163,184,.18)", borderRadius: 12, background: "#101a2a" }} formatter={value => [`${value}/100`, "Confidence"]} /><Area type="monotone" dataKey="confidenceScore" stroke="#8498ff" strokeWidth={2.5} fill="url(#confidenceFill)" activeDot={{ r: 5, fill: "#a8b5ff", stroke: "#1b2540", strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div>
          <div className="mt-2 divide-y divide-slate-700/40">{top.slice(0, 4).map((stock, index) => <Link to={`/stocks/${stock.symbol}`} key={stock.symbol} className="stock-row flex items-center gap-3 py-3"><span className="w-5 text-xs text-slate-600">0{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{stock.symbol}</p><p className="truncate text-[11px] text-slate-500">{stock.name}</p></div><div className="hidden text-right sm:block"><p className="text-xs text-slate-400">Latest dataset price</p><p className="mt-0.5 text-sm font-medium">₹{money.format(stock.currentPrice)}</p></div><div className="w-20 text-right"><p className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</p><p className="mt-0.5 text-sm font-semibold text-indigo-200">{number.format(stock.confidenceScore)}</p></div><ArrowRight size={14} className="text-slate-600" /></Link>)}</div>
        </> : <div className="empty-panel mt-5 rounded-2xl p-8 text-center"><Sparkles className="mx-auto text-slate-500" size={22} /><p className="mt-3 text-sm font-medium">Rankings are not available</p><p className="mt-1 text-xs text-slate-500">Check the backend and processed market data, then retry.</p></div>}
      </article>

      <article className="surface-card p-5 sm:p-6">
        <div className="flex items-start justify-between"><div><p className="eyebrow">BEHAVIORAL FINANCE</p><h2 className="mt-1 text-lg font-semibold">Your fingerprint</h2><p className="mt-1 text-xs text-slate-500">Built from observed simulation responses.</p></div><Fingerprint size={18} className="text-violet-300" /></div>
        {profile ? <div className="mt-6 space-y-5">{[["FOMO", profile.fomo], ["Panic selling", profile.panicSelling], ["Loss aversion", profile.lossAversion], ["Overconfidence", profile.overconfidence]].map(([label, score]) => <div key={label}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-300">{label}</span><span className="font-semibold text-slate-200">{score}%</span></div><div className="profile-track"><div className="profile-fill" style={{ width: `${Math.max(0, Math.min(100, Number(score) || 0))}%` }} /></div></div>)}<Link to="/behavior" className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 hover:text-white">Review behavioral insights <ArrowRight size={14} /></Link></div> : <div className="mt-6 rounded-2xl border border-dashed border-slate-700/80 px-4 py-7 text-center"><CircleHelp className="mx-auto text-slate-500" size={22} /><p className="mt-3 text-sm font-medium text-slate-300">No profile responses yet</p><p className="mx-auto mt-1 max-w-[220px] text-xs leading-relaxed text-slate-500">Complete simulation decisions to calculate a personal fingerprint.</p><Link to="/simulation" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-indigo-300">Start a simulation <ArrowRight size={13} /></Link></div>}
        <div className="mt-6 rounded-xl border border-amber-400/15 bg-amber-300/[0.05] p-3"><p className="flex items-center gap-2 text-[11px] font-semibold text-amber-200"><CircleHelp size={13} /> Educational indicators</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">These describe simulated choices and are not diagnoses or investment instructions.</p></div>
      </article>
    </section>

    <section className="dashboard-note flex items-start gap-3 rounded-2xl px-4 py-4 sm:px-5"><span className="note-icon"><TrendingUp size={17} /></span><div><h3 className="text-sm font-semibold text-slate-200">Ground every decision in evidence</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">Portfolio value and intraday change are not shown because this project uses historical prices and does not connect to a brokerage account or live quote feed.</p></div><div className="ml-auto hidden items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:flex">Historical data <ArrowDownRight size={13} /></div></section>
  </div>;
}
