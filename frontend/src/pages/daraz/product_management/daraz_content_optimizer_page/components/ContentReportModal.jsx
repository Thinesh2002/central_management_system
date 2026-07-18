import { useEffect, useState } from "react";
import { Check, Copy, Loader2, X } from "lucide-react";
import darazContentOptimizerApi from "../../../../../config/sub_api/daraz_api/daraz_content_optimizer_api";
import darazTitleOptimizerApi from "../../../../../config/sub_api/daraz_api/daraz_title_optimizer_api";
import { getApiError } from "../../../../../config/api";
import { useToast } from "../../../../../components/common/toast/ToastProvider";

function copyText(value) {
  if (!value) return;
  navigator.clipboard?.writeText(String(value)).catch(() => {});
}

function scoreTone(score) {
  const value = Number(score) || 0;
  if (value >= 80) return "border-emerald-900 bg-emerald-950 text-emerald-300";
  if (value >= 50) return "border-amber-900 bg-amber-950 text-amber-300";
  return "border-red-900 bg-red-950 text-red-300";
}

function ScoreBadge({ label, value }) {
  return (
    <div className={`rounded-md border px-3 py-2 text-center ${scoreTone(value)}`}>
      <p className="text-[16px] font-bold">{value ?? "-"}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

function Section({ title, right, children }) {
  return (
    <div className="rounded-md border border-slate-800 bg-[#070b16] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-200">{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

function CopyButton({ value }) {
  return (
    <button
      type="button"
      onClick={() => copyText(value)}
      title="Copy to clipboard"
      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 text-slate-400 hover:border-orange-400 hover:text-orange-300"
    >
      <Copy size={12} />
    </button>
  );
}

const RECOMMENDATION_TONE = {
  critical: "border-red-900 bg-red-950 text-red-300",
  high: "border-orange-900 bg-orange-950 text-orange-300",
  medium: "border-amber-900 bg-amber-950 text-amber-300",
  low: "border-slate-700 bg-slate-900 text-slate-300",
};

export default function ContentReportModal({ suggestionId, onClose, onChanged }) {
  const showToast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actingSection, setActingSection] = useState(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await darazContentOptimizerApi.getSuggestion(suggestionId);
      setData(res?.data?.data || null);
    } catch (err) {
      setError(getApiError(err, "Failed to load report"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (suggestionId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionId]);

  if (!suggestionId) return null;

  async function applyTitle() {
    if (!data?.title_suggestion_id) return;
    setActingSection("title");

    try {
      await darazTitleOptimizerApi.approve(data.title_suggestion_id);
      showToast("Title applied to Daraz.", { type: "success" });
      await load();
      onChanged?.();
    } catch (err) {
      showToast(getApiError(err, "Failed to apply title"), { type: "error" });
    } finally {
      setActingSection(null);
    }
  }

  async function reject() {
    setActingSection("reject");

    try {
      await darazContentOptimizerApi.reject(suggestionId);
      showToast("Suggestion rejected.", { type: "success" });
      onChanged?.();
      onClose();
    } catch (err) {
      showToast(getApiError(err, "Failed to reject suggestion"), { type: "error" });
    } finally {
      setActingSection(null);
    }
  }

  const scores = data?.scores_json || {};
  const recommendations = data?.recommendations_json || { critical: [], high: [], medium: [], low: [] };
  const checklist = data?.publishing_checklist_json || [];
  const attributeValidation = data?.attribute_validation_json || { missing: [], incorrect: [], duplicate: [] };
  const originalHighlights = data?.original_highlights_json || [];
  const suggestedHighlights = data?.suggested_highlights_json || [];
  const extractedFeatures = data?.extracted_features_json || [];
  const keywords = data?.keyword_suggestions_json || [];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-purple-500/40 bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-purple-500/30 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white">{data?.product_name || "AI Content Report"}</p>
            <p className="truncate text-[11px] text-purple-200/80">{data?.seller_sku || "-"}</p>
          </div>
          <div className="flex items-center gap-2">
            {typeof data?.readiness_percent === "number" && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white">
                {data.readiness_percent}% ready
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-10 text-center text-[12px] text-slate-500">Loading report...</p>
          ) : error ? (
            <div className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">{error}</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-9">
                <ScoreBadge label="Overall" value={scores.overall} />
                <ScoreBadge label="SEO" value={scores.seo} />
                <ScoreBadge label="Conversion" value={scores.conversion} />
                <ScoreBadge label="Readability" value={scores.readability} />
                <ScoreBadge label="Grammar" value={scores.grammar} />
                <ScoreBadge label="Keyword" value={scores.keyword} />
                <ScoreBadge label="Completeness" value={scores.completeness} />
                <ScoreBadge label="Compliance" value={scores.compliance} />
              </div>

              <Section
                title="Title"
                right={
                  data?.title_status === "pending" && (
                    <button
                      type="button"
                      onClick={applyTitle}
                      disabled={actingSection === "title"}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-900 bg-emerald-950 px-2.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900 disabled:opacity-50"
                    >
                      {actingSection === "title" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Apply to Daraz
                    </button>
                  )
                }
              >
                <p className="text-[11px] text-slate-500">Current</p>
                <p className="mb-2 text-[12px] text-slate-300">{data?.product_name || "-"}</p>
                <p className="text-[11px] text-slate-500">AI Suggested</p>
                <p className="text-[12px] font-semibold text-slate-100">{data?.suggested_title || "-"}</p>
                {data?.title_reasoning && <p className="mt-1 text-[11px] text-slate-500">{data.title_reasoning}</p>}
              </Section>

              <Section title="Highlights" right={<CopyButton value={suggestedHighlights.join("\n")} />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[11px] text-slate-500">Current</p>
                    <ul className="list-inside list-disc space-y-0.5 text-[12px] text-slate-400">
                      {originalHighlights.length ? originalHighlights.map((h, i) => <li key={i}>{h}</li>) : <li>-</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] text-slate-500">AI Suggested</p>
                    <ul className="list-inside list-disc space-y-0.5 text-[12px] text-slate-100">
                      {suggestedHighlights.length ? suggestedHighlights.map((h, i) => <li key={i}>{h}</li>) : <li>-</li>}
                    </ul>
                  </div>
                </div>
              </Section>


              <div className="grid gap-3 sm:grid-cols-2">
                <Section title="Extracted Features">
                  {extractedFeatures.length ? (
                    <table className="w-full text-[12px]">
                      <tbody>
                        {extractedFeatures.map((row, index) => (
                          <tr key={index} className="border-t border-slate-800 first:border-t-0">
                            <td className="py-1 pr-2 text-slate-500">{row.key}</td>
                            <td className="py-1 text-slate-200">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-[12px] text-slate-500">No features confidently extracted.</p>
                  )}
                </Section>

                <Section title="Keyword Suggestions">
                  {keywords.length ? (
                    <div className="space-y-1.5">
                      {keywords.map((row, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 text-[12px]">
                          <span className="truncate text-slate-200">{row.keyword}</span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              row.priority === "high"
                                ? "bg-red-950 text-red-300"
                                : row.priority === "medium"
                                ? "bg-amber-950 text-amber-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {row.priority || "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-slate-500">No keyword suggestions generated.</p>
                  )}
                </Section>
              </div>

              <Section title="Attribute Validation">
                <div className="grid gap-2 sm:grid-cols-3 text-[12px]">
                  <div>
                    <p className="mb-1 font-semibold text-red-300">Missing ({attributeValidation.missing?.length || 0})</p>
                    {attributeValidation.missing?.length ? (
                      attributeValidation.missing.map((label, i) => <p key={i} className="text-slate-400">{label}</p>)
                    ) : (
                      <p className="text-slate-600">None</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-amber-300">Incorrect ({attributeValidation.incorrect?.length || 0})</p>
                    {attributeValidation.incorrect?.length ? (
                      attributeValidation.incorrect.map((label, i) => <p key={i} className="text-slate-400">{label}</p>)
                    ) : (
                      <p className="text-slate-600">None</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-orange-300">Duplicate ({attributeValidation.duplicate?.length || 0})</p>
                    {attributeValidation.duplicate?.length ? (
                      attributeValidation.duplicate.map((label, i) => <p key={i} className="text-slate-400">{label}</p>)
                    ) : (
                      <p className="text-slate-600">None</p>
                    )}
                  </div>
                </div>
                {!attributeValidation.totalDefinitions && (
                  <p className="mt-2 text-[11px] text-slate-600">
                    Category requirements weren't available for this product - attribute checks are limited.
                  </p>
                )}
              </Section>

              <Section title="Recommendations">
                <div className="space-y-1.5">
                  {["critical", "high", "medium", "low"].flatMap((level) =>
                    (recommendations[level] || []).map((text, index) => (
                      <div
                        key={`${level}-${index}`}
                        className={`rounded-md border px-2.5 py-1.5 text-[11px] ${RECOMMENDATION_TONE[level]}`}
                      >
                        <span className="mr-1.5 font-bold uppercase">{level}</span>
                        {text}
                      </div>
                    ))
                  )}
                  {Object.values(recommendations).every((list) => !list?.length) && (
                    <p className="text-[12px] text-slate-500">No issues found.</p>
                  )}
                </div>
              </Section>

              <Section title="Publishing Checklist">
                <div className="grid gap-1.5 sm:grid-cols-3">
                  {checklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-[12px]">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          item.passed ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {item.passed && <Check size={10} />}
                      </span>
                      <span className={item.passed ? "text-slate-300" : "text-slate-500"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 px-4 py-3">
          {data?.status === "pending" && (
            <button
              type="button"
              onClick={reject}
              disabled={actingSection === "reject"}
              className="h-8 rounded-md border border-red-900 bg-red-950 px-3 text-[12px] font-semibold text-red-300 hover:bg-red-900 disabled:opacity-50"
            >
              Reject
            </button>
          )}
          <button type="button" onClick={onClose} className="h-8 rounded-md border border-slate-700 bg-slate-900 px-3 text-[12px] font-semibold text-slate-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
