import { useEffect, useState } from "react";
import { Check, ImageOff, ListChecks, ShieldAlert, X } from "lucide-react";

import approvalCenterApi from "../../../../config/sub_api/daraz_api/approval_center_api";
import { getApiError } from "../../../../config/api";
import { useToast } from "../../../../components/common/toast/ToastProvider";
import Loader from "../../../../components/common/Loader";

const SCORE_LABELS = {
  seo: "SEO",
  keyword: "Keywords",
  readability: "Readability",
  grammar: "Grammar",
  conversion: "Conversion",
  completeness: "Completeness",
  compliance: "Compliance",
};

function clean(value) {
  return String(value ?? "").trim();
}

function ProductImage({ src, name }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-700 bg-white">
      {src ? (
        <img src={src} alt={name || "Product"} className="h-full w-full object-cover" />
      ) : (
        <ImageOff size={14} className="text-slate-400" />
      )}
    </div>
  );
}

function ScoreBadge({ score }) {
  const value = Number(score);
  const color =
    !Number.isFinite(value)
      ? "border-slate-700 bg-slate-800/60 text-slate-400"
      : value >= 90
      ? "border-emerald-900 bg-emerald-950 text-emerald-300"
      : value >= 70
      ? "border-amber-900 bg-amber-950 text-amber-300"
      : "border-red-900 bg-red-950 text-red-300";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${color}`}>
      {Number.isFinite(value) ? `${value}/100` : "n/a"}
    </span>
  );
}

function SuggestionCard({ row, blocked, onApprove, onReject, busy }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b1220] p-3">
      <div className="flex items-start gap-3">
        <ProductImage src={row.product_image} name={row.product_name} />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-slate-100">{row.product_name || "Product"}</p>
            <ScoreBadge score={row.overall_score} />
          </div>
          <p className="font-mono text-[11px] text-slate-500">
            {row.seller_sku} · {row.account_name || `Account #${row.account_id}`}
          </p>

          {row.suggested_title && (
            <p className="text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Suggested title:</span> {row.suggested_title}
            </p>
          )}

          {row.suggested_description && (
            <p className="line-clamp-2 text-[11px] text-slate-500">{clean(row.suggested_description).slice(0, 220)}</p>
          )}

          {blocked && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(SCORE_LABELS).map(([key, label]) => (
                <span
                  key={key}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                    Number(row.scores_json?.[key]) < 70
                      ? "border-red-900 bg-red-950 text-red-300"
                      : "border-slate-700 text-slate-500"
                  }`}
                >
                  {label}: {row.scores_json?.[key] ?? "-"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-800 pt-2">
        <button
          type="button"
          onClick={() => onReject(row)}
          disabled={busy}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-red-900 bg-red-950 px-2.5 text-[11px] font-semibold text-red-300 hover:bg-red-900 disabled:opacity-50"
        >
          <X size={11} /> Reject
        </button>
        <button
          type="button"
          onClick={() => onApprove(row)}
          disabled={busy || blocked}
          title={blocked ? "Below the quality gate - rework content before approving" : ""}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-[11px] font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check size={11} /> Approve & Publish
        </button>
      </div>
    </div>
  );
}

export default function ApprovalCenterPage() {
  const showToast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await approvalCenterApi.list();
      setRows(res?.data?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to load the approval queue"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(row) {
    setBusyId(row.id);

    try {
      await approvalCenterApi.approve(row.id);
      showToast("Approved and published to Daraz.", { type: "success" });
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to approve"), { type: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(row) {
    if (!window.confirm("Reject this AI-generated content? It stays out of the approval queue.")) return;

    setBusyId(row.id);

    try {
      await approvalCenterApi.reject(row.id);
      showToast("Rejected.", { type: "success" });
      await load();
    } catch (err) {
      showToast(getApiError(err, "Failed to reject"), { type: "error" });
    } finally {
      setBusyId(null);
    }
  }

  const readyRows = rows.filter((r) => r.lifecycle_state === "pending_approval");
  const blockedRows = rows.filter((r) => r.lifecycle_state === "blocked_low_score");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-medium text-slate-100">
          <ListChecks size={20} />
          Approval Center
        </h1>
        <p className="text-[13px] text-slate-500">
          AI-drafted Daraz content, gated by quality score. Only items scoring 90+ can be approved — everything else
          stays blocked with the failing checks shown below it until it's reworked.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        <div className="rounded-md border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-emerald-300">{readyRows.length}</p>
          <p className="text-[11px] text-emerald-400">Ready for Approval</p>
        </div>
        <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-300">{blockedRows.length}</p>
          <p className="text-[11px] text-red-400">Blocked — Needs Rework</p>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">{error}</div>}

      {loading ? (
        <Loader label="Loading approval queue..." minHeight="200px" />
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-emerald-400">Ready for Approval</h2>
            {!readyRows.length ? (
              <p className="rounded-md border border-slate-800 bg-slate-950 px-4 py-6 text-center text-[12px] text-slate-500">
                Nothing is waiting on approval right now.
              </p>
            ) : (
              <div className="grid gap-2 lg:grid-cols-2">
                {readyRows.map((row) => (
                  <SuggestionCard
                    key={row.id}
                    row={row}
                    blocked={false}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    busy={busyId === row.id}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-red-400">
              <ShieldAlert size={13} /> Blocked — Needs Rework
            </h2>
            {!blockedRows.length ? (
              <p className="rounded-md border border-slate-800 bg-slate-950 px-4 py-6 text-center text-[12px] text-slate-500">
                Nothing is currently blocked by the quality gate.
              </p>
            ) : (
              <div className="grid gap-2 lg:grid-cols-2">
                {blockedRows.map((row) => (
                  <SuggestionCard
                    key={row.id}
                    row={row}
                    blocked
                    onApprove={handleApprove}
                    onReject={handleReject}
                    busy={busyId === row.id}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
