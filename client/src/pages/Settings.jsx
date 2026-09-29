import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { getPreferences, savePreferences } from "../utils/preferences";

export default function Settings() {
  const [preferences, setPreferences] = useState(getPreferences);
  const [saved, setSaved] = useState(false);
  function update(field, value) { setPreferences(current => ({ ...current, [field]: value })); setSaved(false); }
  function submit(event) { event.preventDefault(); savePreferences(preferences); setSaved(true); }

  return <div className="space-y-6">
    <header className="page-heading"><p className="eyebrow">WORKSPACE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Preferences</h1><p className="mt-2 text-sm text-slate-400">Set defaults for portfolio planning. Preferences are stored in this browser.</p></header>
    <form onSubmit={submit} className="surface-card max-w-3xl p-5 sm:p-7">
      <div className="flex items-center gap-3"><span className="settings-icon"><SlidersHorizontal size={17} /></span><div><h2 className="font-semibold">Portfolio defaults</h2><p className="mt-0.5 text-xs text-slate-500">You can change these for each plan.</p></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="field-label">Default investment budget<input className="field-control mt-2 w-full rounded-xl px-3.5 py-3" type="number" min="1000" step="500" value={preferences.budget} onChange={event => update("budget", Number(event.target.value))} /></label>
        <label className="field-label">Risk tolerance<select className="field-control mt-2 w-full rounded-xl px-3.5 py-3" value={preferences.riskTolerance} onChange={event => update("riskTolerance", event.target.value)}><option value="conservative">Conservative</option><option value="moderate">Moderate</option><option value="aggressive">Aggressive</option></select></label>
        <label className="field-label sm:col-span-2">Investment horizon<select className="field-control mt-2 w-full rounded-xl px-3.5 py-3 sm:max-w-[calc(50%-8px)]" value={preferences.investmentHorizon} onChange={event => update("investmentHorizon", event.target.value)}><option value="short">Under 1 year</option><option value="medium">1–3 years</option><option value="long">3+ years</option></select></label>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3"><button type="submit" className="primary-button px-4 py-2.5 text-sm font-semibold">Save preferences</button>{saved && <span role="status" className="inline-flex items-center gap-1.5 text-xs text-emerald-300"><Check size={14} /> Saved on this device</span>}</div>
    </form>
    <div className="surface-subtle max-w-3xl p-5"><p className="text-sm font-semibold">Market data source</p><p className="mt-1 text-xs leading-relaxed text-slate-400">The dashboard reads the project's processed NSE historical dataset through the Express API. It does not include live exchange quotes or index feeds.</p></div>
  </div>;
}
