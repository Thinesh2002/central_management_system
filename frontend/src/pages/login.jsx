import React, { useState } from "react";
import API from "../config/api";
import { storeAuth } from "../config/auth";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, ArrowRight, Zap, AlertCircle } from "lucide-react";

export default function Login({ onAuth }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await API.post("/user/login", { login, password });
      const { token, user } = res.data;

      storeAuth(user, token);
      if (onAuth) onAuth(user);

      navigate("/dashboard"); 
    } catch (err) {
      setMsg(err.response?.data?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4 relative overflow-hidden">
      
      {/* BACKGROUND DECORATION */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 animate-in fade-in zoom-in duration-700">

        {/* LEFT PANEL: Branding & Visual */}
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-12 relative overflow-hidden">
          <div className="z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20">
              <Zap size={24} className="fill-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter mb-4 leading-tight">
              Central <br /> Management <br /> <span className="text-blue-200 italic">System</span>
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-xs opacity-80 font-medium">
              Enterprise-grade inventory and administration control at your fingertips.
            </p>
          </div>

  

          {/* Abstract decoration */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* RIGHT PANEL: Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-[#020617]/40">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-white tracking-tighter">
              Welcome <span className="text-blue-500 italic">Back</span>
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Enter your secure credentials</p>
          </div>

          {msg && (
            <div className="mb-6 flex items-center gap-3 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl animate-in slide-in-from-top-2">
              <AlertCircle size={16} />
              {msg}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Email or Username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  className="w-full bg-white/[0.03] border border-white/10 px-12 py-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/[0.03] border border-white/10 px-12 py-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] font-bold">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 accent-blue-500" />
                <span className="group-hover:text-slate-300 transition-colors">Remember instance</span>
              </label>
              <Link to="/forgot-password" size={14} className="text-blue-500 hover:text-blue-400 transition-colors tracking-tight">
                Recovery Access?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-xl shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              {loading ? "Authenticating..." : (
                <>
                  Login
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>


          </form>
        </div>

      </div>
    </div>
  );
}