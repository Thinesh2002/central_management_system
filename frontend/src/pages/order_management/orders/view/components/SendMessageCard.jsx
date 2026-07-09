import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Send } from "lucide-react";

import ordersApi from "../../../../../config/sub_api/order_management_api/orders_api";
import messageTemplatesApi from "../../../../../config/sub_api/order_management_api/message_templates_api";
import { getApiError } from "../../../../../config/api";
import { useToast } from "../../../../../components/common/toast/ToastProvider";

function buildTemplateValues(order) {
  return {
    customer_name: order.customer_name || order.shipping_name || "",
    order_no: order.order_number || order.display_order_no || order.order_no || "",
    total: order.grand_total || "",
    currency: order.currency || "LKR",
    tracking_number: order.tracking_number || "",
    waybill_id: order.waybill_id || "",
    status: order.order_status || "",
    account_name: order.account_name || "",
  };
}

function renderTemplate(content, values) {
  return String(content || "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    const value = values[key];
    return value === undefined || value === null || value === "" ? "" : String(value);
  });
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function SendMessageCard({ order }) {
  const showToast = useToast();

  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [content, setContent] = useState("");
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const values = useMemo(() => buildTemplateValues(order), [order]);

  useEffect(() => {
    messageTemplatesApi
      .list()
      .then((res) => setTemplates((res?.data || []).filter((t) => t.is_active)))
      .catch(() => setTemplates([]));

    ordersApi
      .getMessages(order.source, order.source_order_id)
      .then((res) => setHistory(res?.data || []))
      .catch(() => setHistory([]));
  }, [order.source, order.source_order_id]);

  function selectTemplate(id) {
    setTemplateId(id);
    const template = templates.find((t) => String(t.id) === String(id));
    setContent(template ? renderTemplate(template.content, values) : "");
  }

  async function send() {
    if (!content.trim()) {
      setError("Message content is required.");
      return;
    }

    setSending(true);
    setError("");

    try {
      await ordersApi.sendMessage(order.source, order.source_order_id, {
        template_id: templateId || undefined,
        content,
      });

      showToast("Message sent.");
      setContent("");
      setTemplateId("");

      const res = await ordersApi.getMessages(order.source, order.source_order_id);
      setHistory(res?.data || []);
    } catch (err) {
      setError(getApiError(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="overflow-hidden border border-slate-800 bg-[#0b1220]">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-[#07101f] px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
          <Send size={13} className="text-orange-400" />
          Message Buyer
        </h3>
      </div>

      <div className="space-y-2.5 p-4">
        {error && (
          <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[12px] text-red-300">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Template
          </span>
          <select
            value={templateId}
            onChange={(e) => selectTemplate(e.target.value)}
            className="h-9 w-full border border-slate-700 bg-[#070b16] px-2.5 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
          >
            <option value="">Custom message...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Message
          </span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Type a message to the buyer..."
            className="w-full border border-slate-700 bg-[#070b16] px-2.5 py-2 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="inline-flex h-8 items-center gap-1.5 bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={13} />
            {sending ? "Sending..." : "Send Message"}
          </button>
        </div>

        {history.length > 0 && (
          <div className="border-t border-slate-800 pt-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Sent Messages
            </p>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {history.map((log) => (
                <div key={log.id} className="border border-slate-800 bg-[#070b16] px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={log.status === "sent" ? "text-emerald-400" : "text-red-400"}>
                      {log.status === "sent" ? "Sent" : "Failed"}
                    </span>
                    <span className="text-[10px] text-slate-500">{formatDate(log.sent_at)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-300">{log.content}</p>
                  {log.error_message && (
                    <p className="mt-0.5 text-[10px] text-red-400">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
