import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Banknote, CircleHelp, PieChart as PieChartIcon, RefreshCw, ShieldCheck, SlidersHorizontal, Wallet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import api from "../services/api";
import { getPreferences, savePreferences } from "../utils/preferences";

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const colors = ["#8194ff", "#ad8af5", "#57cdb2", "#efa864", "#5bbce0", "#e985a7", "#a7bf6e", "#8c9bb4"];

function Skeleton() { return <div className="space-y-5"><div className="skeleton h-32 rounded-3xl" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map(i => <div className="skeleton h-28 rounded-2xl" key={i} />)}</div><div className="skeleton h-[380px] rounded-2xl" /></div>; }

export default function Portfolio() {
  const [preferences, setPreferences] = useState(getPreferences);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const budget = Number(preferences.budget);
    if (!Number.isFinite(budget) || budget < 1000) {
      setError("Enter a budget of at least ₹1,000 to build an allocation.");
      setPlan(null);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      api.post("/portfolio/plan", preferences).then(({ data }) => { if (active) setPlan(data); })
        .catch(reason => { if (active) setError(reason.response?.data?.message || "Could not generate a plan. Check the API connection."); })
        .finally(() => { if (active) setLoading(false); });
    }, 260);
    return () => { active = false; window.clearTimeout(timer); };
  }, [preferences]);

  function update(field, value) {
    const next = { ...preferences, [field]: value };
    setPreferences(next);
    savePreferences(next);
  }

  const allocation = plan?.allocation || [];
  const totals = useMemo(() => {
    const invested = allocation.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const n = allocation.length;
    const weights = allocation.map(item => Number(item.amount || 0) / (invested || 1));
    const hhi = weights.reduce((sum, weight) => sum + weight * weight, 0);
    const spread = n > 1 ? Math.max(0, Math.min(100, (1 - hhi) / (1 - 1 / n) * 100)) : 0;
    return { invested, spread };
  }, [allocation]);

  return <div className="space-y-6">
    <header className="page-heading flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="eyebrow">PERSONALIZED ALLOCATION</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Portfolio planner</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Build a whole-share plan from historical confidence, volatility and your risk preference.</p></div><span className="data-tag"><span className="data-tag-dot" /> Based on processed stock data</span></header>

    <section className="surface-card p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><SlidersTitle /><p className="text-sm font-semibold">Plan assumptions</p><span className="text-[10px] text-slate-500">Saved in this browser</span></div><div className="grid gap-3 md:grid-cols-3">
      <label className="field-label">Investment budget <div className="field-with-prefix mt-2"><span>₹</span><input className="field-control" type="number" min="1000" step="500" value={preferences.budget} onChange={event => update("budget", Number(event.target.value))} /></div></label>
      <label className="field-label">Risk tolerance<select className="field-control mt-2 w-full rounded-xl px-3.5 py-3" value={preferences.riskTolerance} onChange={event => update("riskTolerance", event.target.value)}><option value="conservative">Conservative</option><option value="moderate">Moderate</option><option value="aggressive">Aggressive</option></select></label>
      <label className="field-label">Investment horizon<select className="field-control mt-2 w-full rounded-xl px-3.5 py-3" value={preferences.investmentHorizon} onChange={event => update("investmentHorizon", event.target.value)}><option value="short">Under 1 year</option><option value="medium">1–3 years</option><option value="long">3+ years</option></select></label>
    </div><p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500"><CircleHelp size={12} />Changing an assumption recalculates the allocation using the backend planner.</p></section>

    {error && <div role="alert" className="error-banner flex items-center gap-2 rounded-xl px-4 py-3 text-sm"><AlertCircle size={15} />{error}</div>}
    {loading ? <Skeleton /> : plan && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Portfolio plan summary">
        <SummaryCard label="Investment budget" value={`₹${number.format(plan.budget)}`} detail={`${plan.riskTolerance} · ${plan.investmentHorizon}`} icon={Wallet} />
        <SummaryCard label="Total invested" value={`₹${number.format(totals.invested)}`} detail={`${allocation.length} whole-share positions`} icon={Banknote} />
        <SummaryCard label="Remaining cash" value={`₹${number.format(plan.remainingCash)}`} detail="Unallocated due to share constraints" icon={RefreshCw} />
        <SummaryCard label="Allocation spread" value={`${number.format(totals.spread)} / 100`} detail="Normalized concentration index" icon={PieChartIcon} />
      </section>

      {allocation.length ? <section className="grid gap-5 xl:grid-cols-5">
        <article className="surface-card min-w-0 p-5 sm:p-6 xl:col-span-2"><div><p className="eyebrow">TARGETED INVESTMENT</p><h2 className="mt-1 text-lg font-semibold">Recommended allocation</h2><p className="mt-1 text-xs text-slate-500">Whole shares only. Unspent funds remain as cash.</p></div><div className="relative mx-auto mt-4 h-[250px] w-full max-w-[330px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocation} dataKey="amount" nameKey="symbol" innerRadius="62%" outerRadius="88%" paddingAngle={3} stroke="none">{allocation.map((item, index) => <Cell key={item.symbol} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={{ border: "1px solid rgba(148,163,184,.18)", borderRadius: 12, background: "#101a2a" }} formatter={(value, _name, item) => [`₹${number.format(value)} (${number.format(item.payload.percentage)}%)`, item.payload.symbol]} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] uppercase tracking-wider text-slate-500">Invested</span><span className="mt-1 text-xl font-semibold text-slate-100">₹{number.format(totals.invested)}</span></div></div><div className="grid grid-cols-2 gap-x-3 gap-y-2">{allocation.map((item, index) => <div key={item.symbol} className="flex min-w-0 items-center gap-2 text-[10px] text-slate-400"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="truncate">{item.symbol}</span><span className="ml-auto shrink-0">{number.format(item.percentage)}%</span></div>)}</div></article>

        <article className="surface-card min-w-0 p-5 sm:p-6 xl:col-span-3"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">WHOLE-SHARE HOLDINGS</p><h2 className="mt-1 text-lg font-semibold">Your suggested positions</h2></div><ShieldCheck size={18} className="text-indigo-300" /></div><div className="mt-4 hidden grid-cols-[minmax(0,1fr)_90px_110px_85px_85px] gap-3 border-b border-slate-700/50 px-3 pb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:grid"><span>Stock</span><span className="text-right">Shares</span><span className="text-right">Investment</span><span className="text-right">Allocation</span><span className="text-right">Risk</span></div><div className="mt-2 divide-y divide-slate-700/40">{allocation.map((item, index) => <div key={item.symbol} className="holding-row grid grid-cols-2 items-center gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_90px_110px_85px_85px]"><div className="flex min-w-0 items-center gap-3"><span className="holding-color" style={{ background: colors[index % colors.length] }} /><div className="min-w-0"><Link to={`/stocks/${item.symbol}`} className="text-sm font-semibold text-slate-200 hover:text-white">{item.symbol}</Link><p className="truncate text-[10px] text-slate-500">{item.name || item.rationale}</p><p className="mt-0.5 text-[10px] text-slate-600">₹{number.format(item.price)} / share · confidence {number.format(item.confidenceScore)}</p></div></div><div className="text-right"><p className="text-[9px] text-slate-500 sm:hidden">Shares</p><p className="text-sm font-semibold">{number.format(item.shares)}</p></div><div className="text-right"><p className="text-[9px] text-slate-500 sm:hidden">Investment</p><p className="text-sm font-semibold">₹{number.format(item.amount)}</p></div><div className="text-right"><p className="text-[9px] text-slate-500 sm:hidden">Allocation</p><p className="text-sm text-slate-300">{number.format(item.percentage)}%</p></div><div className="col-span-2 flex justify-end sm:col-span-1"><span className={`risk-badge ${item.riskLevel === "Lower" ? "risk-low" : item.riskLevel === "Elevated" ? "risk-high" : "risk-medium"}`}>{item.riskLevel}</span></div></div>)}</div><div className="mt-4 rounded-xl border border-indigo-300/10 bg-indigo-400/[.04] p-3"><p className="text-xs font-semibold text-indigo-100">Why these positions?</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">Stocks are selected from historical confidence and risk limits for the chosen tolerance. Position sizing accounts for whole-share prices and per-stock concentration caps; the planner leaves any unspendable balance as cash.</p></div></article>
      </section> : <div className="empty-panel rounded-2xl px-5 py-12 text-center"><Wallet size={25} className="mx-auto text-slate-500" /><h2 className="mt-3 font-semibold">No whole-share positions fit this plan</h2><p className="mt-1 text-sm text-slate-500">Increase the budget or change risk tolerance to review another allocation.</p></div>}
      <p className="text-[10px] leading-relaxed text-slate-500">{plan.note} Allocation spread is normalized from position weights; it does not measure sector or industry diversification.</p>
    </>}
  </div>;
}

function SummaryCard({ label, value, detail, icon: Icon }) {
  return <article className="metric-card"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-400">{label}</p><p className="mt-3 text-xl font-semibold text-slate-100">{value}</p></div><span className="metric-icon metric-icon-blue"><Icon size={16} /></span></div><p className="mt-2 text-[10px] text-slate-500">{detail}</p></article>;
}

function SlidersTitle() {
  return <span className="settings-icon"><SlidersHorizontal size={15} /></span>;
}
