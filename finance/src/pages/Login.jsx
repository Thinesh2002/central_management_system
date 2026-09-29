import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Wallet } from "lucide-react";
import { authApi, getApiError } from "../lib/api";
import { getToken, saveAuth } from "../lib/auth";
import { useSession } from "../components/Session";
import { Alert, Button, Field, inputClass } from "../components/ui";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh, setUser } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (getToken()) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await authApi.login(identifier.trim(), password);
      saveAuth(data.token, data.user);
      setUser(data.user);
      await refresh();
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(getApiError(err, "Login failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1a1407_0%,#020617_50%)] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl shadow-black/50">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Teckvora Finance</h1>
            <p className="text-xs text-slate-400">Sign in with your central system account</p>
          </div>
        </div>

        <div className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Email or User ID">
            <input className={inputClass} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required />
          </Field>
          <Field label="Password">
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </Field>
          <Button type="submit" className="w-full" disabled={submitting}>
            <Lock size={15} />
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  );
}
