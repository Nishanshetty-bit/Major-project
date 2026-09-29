import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(endpoint, form);
      saveSession(data); navigate("/dashboard");
    } catch (err) { setError(err.response?.data?.message || "Could not complete request"); }
    finally { setLoading(false); }
  }
  return <main className="mx-auto max-w-md px-6 py-16"><div className="rounded-2xl border bg-white p-7 shadow-sm"><h2 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create investor profile"}</h2><p className="mt-1 text-sm text-slate-500">Your profile stores budget, risk preference and simulation history.</p><form onSubmit={submit} className="mt-6 space-y-4">{mode === "register" && <input required className="w-full rounded-xl border px-4 py-3" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>}<input required className="w-full rounded-xl border px-4 py-3" placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input required minLength={6} className="w-full rounded-xl border px-4 py-3" placeholder="Password (6+ characters)" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">{loading ? "Please wait…" : mode === "login" ? "Login" : "Register"}</button></form><button className="mt-5 text-sm font-semibold text-indigo-600" onClick={()=>{setMode(mode === "login" ? "register" : "login");setError("")}}>{mode === "login" ? "Need an account? Register" : "Already registered? Login"}</button></div></main>;
}
