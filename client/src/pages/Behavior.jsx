import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Brain, Clock3, Fingerprint, ShieldAlert, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import api from "../services/api";

const sessionId = localStorage.getItem("stockAdvisorSession") || "guest";
const signals = [["FOMO", "fomo"], ["Panic selling", "panicSelling"], ["Loss aversion", "lossAversion"], ["Herd behaviour", "herdBehavior"], ["Overconfidence", "overconfidence"]];

function insightFor(label, score) {
  if (score >= 50) return `${label} appeared in a notable share of your recorded simulation responses.`;
  if (score > 0) return `${label} has appeared in some responses; continue the simulation to build a clearer sample.`;
  return `No ${label.toLowerCase()} signal has been observed in your recorded responses so far.`;
}

function Skeleton() { return <div className="space-y-5"><div className="skeleton h-28 rounded-3xl" /><div className="grid gap-5 lg:grid-cols-2"><div className="skeleton h-[390px] rounded-2xl" /><div className="skeleton h-[390px] rounded-2xl" /></div></div>; }

export default function Behavior() {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [storage, setStorage] = useState("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.allSettled([api.get(`/behavior/profile?sessionId=${sessionId}`), api.get(`/behavior/history?sessionId=${sessionId}`)]).then(([profileResponse, historyResponse]) => {
      if (!active) return;
      if (profileResponse.status === "fulfilled") setProfile(profileResponse.value.data.profile);
      else setError("Your behavioral profile could not be loaded. Check the API connection.");
      if (historyResponse.status === "fulfilled") { setHistory(historyResponse.value.data.data || []); setStorage(historyResponse.value.data.persistence || "mongodb"); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const radar = useMemo(() => signals.map(([label, key]) => ({ subject: label, score: Number(profile?.[key]) || 0 })), [profile]);
  const patternCounts = useMemo(() => history.reduce((counts, response) => { const key = response.pattern || "unclassified"; counts[key] = (counts[key] || 0) + 1; return counts; }, {}), [history]);

  if (loading) return <Skeleton />;

  return <div className="space-y-6">
    <header className="behavior-hero relative overflow-hidden rounded-3xl p-5 sm:p-7"><div className="hero-orb hero-orb-two" /><div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow flex items-center gap-2"><Fingerprint size={13} /> BEHAVIORAL FINANCE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Behavioral fingerprint</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">A profile built from your observed Buy, Hold and Sell choices in simulation scenarios.</p></div><Link to="/simulation" className="primary-button inline-flex w-fit items-center gap-2 px-4 py-2.5 text-sm font-semibold">Continue simulation <ArrowRight size={15} /></Link></div><div className="relative z-10 mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4"><span className="data-tag">{history.length} recorded response{history.length === 1 ? "" : "s"}</span><span className="data-tag">{storage === "in-memory" ? "Session memory" : storage === "mongodb" ? "MongoDB storage" : "Storage status unknown"}</span></div></header>
    {error && <div role="alert" className="error-banner rounded-xl px-4 py-3 text-sm">{error}</div>}
    {storage === "in-memory" && <div className="memory-notice rounded-xl px-4 py-3 text-xs leading-relaxed"><strong className="text-amber-100">Temporary session storage:</strong> MongoDB is disconnected, so this profile will remain available only while the API process is running.</div>}

    <section className="grid gap-5 xl:grid-cols-5"><article className="surface-card min-w-0 p-4 sm:p-6 xl:col-span-3"><div className="flex items-start justify-between"><div><p className="eyebrow">YOUR RESPONSE PATTERN</p><h2 className="mt-1 text-lg font-semibold">Behavioral profile</h2><p className="mt-1 text-xs text-slate-500">Each spoke reflects the share of observed decisions linked to that pattern.</p></div><Brain size={18} className="text-violet-300" /></div>{history.length ? <><div className="mt-2 h-[320px] min-w-0"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radar} outerRadius="72%"><PolarGrid stroke="rgba(148,163,184,.17)" /><PolarAngleAxis dataKey="subject" tick={{ fill: "#bac5d8", fontSize: 11 }} /><PolarRadiusAxis angle={24} domain={[0, 100]} tickCount={5} tick={{ fill: "#74839c", fontSize: 9 }} axisLine={false} /><Radar dataKey="score" name="Observed signal" stroke="#a68aff" fill="#9274ed" fillOpacity={0.23} strokeWidth={2} dot={{ r: 3, fill: "#b9a4ff", strokeWidth: 0 }} /></RadarChart></ResponsiveContainer></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{signals.map(([label, key]) => <div className="signal-chip" key={key}><span className="text-[10px] text-slate-500">{label}</span><b className="text-sm text-slate-200">{Number(profile?.[key]) || 0}%</b></div>)}</div></> : <div className="empty-panel mt-5 rounded-2xl px-4 py-12 text-center"><Fingerprint size={25} className="mx-auto text-slate-500" /><h3 className="mt-3 text-sm font-semibold">Your fingerprint is ready to form</h3><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">Make a few choices in the simulation. The chart and insights will reflect those responses.</p><Link to="/simulation" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-indigo-300">Run first scenario <ArrowRight size={13} /></Link></div>}</article>

      <article className="surface-card p-5 sm:p-6 xl:col-span-2"><div className="flex items-start justify-between"><div><p className="eyebrow">OBSERVED, NOT ASSUMED</p><h2 className="mt-1 text-lg font-semibold">Behavioral insights</h2><p className="mt-1 text-xs text-slate-500">Generated from the response totals above.</p></div><Sparkles size={17} className="text-indigo-300" /></div>{history.length ? <div className="mt-5 space-y-3">{signals.map(([label, key]) => <div className="insight-row flex gap-3 rounded-xl p-3" key={key}><span className="insight-indicator"><Activity size={14} /></span><div><div className="flex items-center gap-2"><p className="text-xs font-semibold text-slate-200">{label}</p><span className="text-[10px] font-semibold text-violet-200">{Number(profile?.[key]) || 0}%</span></div><p className="mt-1 text-[11px] leading-relaxed text-slate-400">{insightFor(label, Number(profile?.[key]) || 0)}</p></div></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-slate-700/70 px-4 py-9 text-center"><p className="text-sm text-slate-400">Insights appear after simulated responses are recorded.</p></div>}<div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-300/[.05] p-3"><p className="flex items-center gap-2 text-[11px] font-semibold text-amber-100"><ShieldAlert size={14} />Interpret with care</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">The behavioral fingerprint is an educational indicator based on a small simulation sample, not a psychological diagnosis.</p></div></article></section>

    <section className="grid gap-5 lg:grid-cols-5"><article className="surface-card p-5 lg:col-span-3"><div className="flex items-center justify-between"><div><p className="eyebrow">RESPONSE DISTRIBUTION</p><h2 className="mt-1 font-semibold">Observed pattern counts</h2></div><Clock3 size={17} className="text-slate-500" /></div>{history.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(patternCounts).sort((a,b)=>b[1]-a[1]).map(([pattern,count]) => <div key={pattern} className="pattern-count flex items-center justify-between rounded-xl px-3 py-2.5"><span className="text-xs text-slate-400">{pattern.replaceAll("_", " ")}</span><b className="text-sm text-slate-200">{count}</b></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No response patterns to summarize.</p>}</article><article className="surface-card p-5 lg:col-span-2"><h2 className="font-semibold">Recent decisions</h2><div className="mt-3 divide-y divide-slate-700/40">{history.slice(0, 5).map((item, index) => <div className="flex items-center justify-between gap-3 py-3" key={item._id || `${item.round}-${index}`}><div><p className="text-xs font-semibold text-slate-200">{item.action} <span className="ml-1 font-normal text-slate-500">{item.symbol || "Simulated asset"}</span></p><p className="mt-1 text-[10px] text-slate-500">{item.pattern?.replaceAll("_", " ") || "unclassified"}</p></div><div className="text-right"><p className={`text-xs font-semibold ${Number(item.marketChange) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{Number(item.marketChange) > 0 ? "+" : ""}{Number(item.marketChange).toFixed(2)}%</p><p className="mt-1 text-[9px] text-slate-600">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "Current session"}</p></div></div>)}{!history.length && <p className="py-5 text-xs text-slate-500">No recorded decisions yet.</p>}</div></article></section>
  </div>;
}
