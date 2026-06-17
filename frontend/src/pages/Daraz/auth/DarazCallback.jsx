import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { darazApi, extractApiMessage } from "../../../services/daraz/darazCentral.service";

export default function DarazCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Connecting your Daraz seller account. Please do not close this page.");

  const code = useMemo(() => searchParams.get("code") || "", [searchParams]);
  const accountCode = useMemo(() => searchParams.get("state") || searchParams.get("account_code") || "", [searchParams]);

  useEffect(() => {
    let mounted = true;

    const completeAuthorization = async () => {
      if (!code || !accountCode) {
        if (!mounted) return;
        setStatus("error");
        setMessage("Daraz authorization could not be completed because the authorization code or account code is missing. Please reconnect the seller account again.");
        return;
      }

      try {
        const res = await darazApi.completeDarazAuth(accountCode, code);
        if (!mounted) return;

        setStatus("success");
        setMessage(res?.message || `Daraz seller account ${accountCode} connected successfully. You can run sync now.`);

        setTimeout(() => {
          navigate("/daraz/accounts", {
            replace: true,
            state: {
              notice: `Daraz seller account ${accountCode} connected successfully. You can run sync now.`
            }
          });
        }, 1800);
      } catch (error) {
        if (!mounted) return;
        setStatus("error");
        setMessage(extractApiMessage(error, "Daraz account authorization could not be completed. Please reconnect the seller account again."));
      }
    };

    completeAuthorization();

    return () => {
      mounted = false;
    };
  }, [accountCode, code, navigate]);

  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 text-stone-800">
      <div className="w-full max-w-lg bg-white border border-stone-200 rounded-xl shadow-sm p-6 text-center">
        <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center ${isSuccess ? "bg-emerald-50 text-emerald-700" : isError ? "bg-rose-50 text-rose-700" : "bg-cyan-50 text-cyan-700"}`}>
          {isSuccess ? <CheckCircle2 size={24} /> : isError ? <ShieldAlert size={24} /> : <Loader2 size={24} className="animate-spin" />}
        </div>

        <h1 className="mt-4 text-xl font-bold text-stone-900">Daraz Account Authorization</h1>
        <p className="mt-2 text-sm text-stone-600 leading-6">{message}</p>

        {accountCode && (
          <div className="mt-4 inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-bold text-stone-600 uppercase">
            Account: {accountCode}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Link to="/daraz/accounts" className="px-4 py-2 rounded bg-[#002f36] text-white text-sm font-semibold hover:bg-[#003f48]">
            Back to Daraz Accounts
          </Link>
        </div>
      </div>
    </div>
  );
}
