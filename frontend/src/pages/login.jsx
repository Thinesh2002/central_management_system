import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  UserRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

import api, { getApiError } from "../config/api";
import { saveAuth } from "../config/auth";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    identifier: "Thinesh",
    password: "Admin@123",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password show / hide state
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);

      saveAuth(data.token, data.user, data.menu || []);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiError(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      {/* Background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#13233f_0%,#020617_45%,#020617_100%)]" />
      <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute bottom-[-120px] right-[-120px] h-80 w-80 rounded-full bg-slate-700/30 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/50 backdrop-blur-xl lg:grid-cols-2">
        {/* Left panel */}
        <div className="hidden border-r border-slate-800 bg-[#07111f] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-lg">
              <ShieldCheck size={28} />
            </div>

            <h1 className="text-3xl font-bold leading-tight text-white">
              Central Management System
            </h1>

            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Secure user access control system for dashboard, users,
              permissions, logs, and management tools.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Sparkles size={16} className="text-[#FFD400]" />
              Individual Access Control
            </div>

            <p className="text-xs leading-5 text-slate-400">
              Every user can access only the pages and actions allowed by the
              master admin.
            </p>
          </div>
        </div>

        {/* Right login form */}
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-[#07111f] text-white shadow-lg lg:mx-0">
              <ShieldCheck size={28} />
            </div>

            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>

            <p className="mt-2 text-sm text-slate-400">
              Login using Email or User ID.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                {error}
              </div>
            )}

            {/* Email / User ID */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Email / User ID
              </label>

              <div className="relative">
                <UserRound
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />

                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  type="text"
                  name="identifier"
                  value={form.identifier}
                  onChange={handleChange}
                  placeholder="Example: Thinesh or master@admin.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Password
              </label>

              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />

                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-10 pr-11 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>


          </form>
        </div>
      </div>
    </div>
  );
}