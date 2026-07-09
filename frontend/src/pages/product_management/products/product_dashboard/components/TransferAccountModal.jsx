import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Send, X } from "lucide-react";
import { marketplaceApi } from "../../../../../config/sub_api/marketplace_management_api/marketplace_api";
import { usePageOverlay } from "../../../../../components/common/page_overlay/PageOverlayProvider";

function getAccountId(account = {}) {
  return account.id || account.account_id;
}

function getAccountName(account = {}) {
  return account.account_name || account.account_code || `#${getAccountId(account)}`;
}

export default function TransferAccountModal({ product, onClose }) {
  const { openOverlay } = usePageOverlay();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    marketplaceApi
      .getAccounts({ platform_code: "DARAZ" })
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.data || res?.data?.accounts || res?.data || [];
        setAccounts(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleAccount(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(accounts.map((account) => String(getAccountId(account))));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function handleContinue() {
    if (!selectedIds.length) return;

    const productId = product?.id || product?.product_id || product?.local_product_id;
    const url = `/product/daraz-products/transfer-preview/${productId}?accounts=${selectedIds
      .map(encodeURIComponent)
      .join(",")}`;

    openOverlay(url);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[560px] overflow-hidden rounded-md border border-zinc-700 bg-[#172235] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-orange-700 px-4 py-3">
          <div>
            <h3 className="text-[15px] font-semibold text-white">Transfer to Daraz</h3>
            <p className="mt-0.5 text-[12px] text-orange-100/80">
              Select the Daraz account(s) to transfer "{product?.title || product?.product_name || product?.name || "this product"}" to.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-[13px] text-zinc-300">
              Selected: <b className="text-white">{selectedIds.length}</b> of{" "}
              <b className="text-white">{accounts.length}</b>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="h-8 rounded-sm border border-orange-400/30 bg-orange-500 px-3 text-[12px] font-semibold text-zinc-950 hover:bg-orange-400"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="h-8 rounded-sm border border-white/10 bg-white px-3 text-[12px] font-semibold text-zinc-800 hover:bg-zinc-100"
              >
                Clear
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-6 text-center text-[13px] text-zinc-500">Loading Daraz accounts...</p>
          ) : accounts.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {accounts.map((account) => {
                const id = String(getAccountId(account));
                const checked = selectedIds.includes(id);

                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-center justify-between rounded-sm border px-3 py-3 transition ${
                      checked
                        ? "border-orange-400/40 bg-orange-400/5"
                        : "border-white/10 bg-white/[0.03] hover:border-orange-400/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">
                        {getAccountName(account)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">Daraz</p>
                    </div>

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAccount(id)}
                      className="h-4 w-4 cursor-pointer accent-orange-400"
                    />
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-[13px] text-zinc-500">No Daraz accounts found.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-sm border border-white/10 bg-white px-3 text-[12px] font-semibold text-zinc-800 hover:bg-zinc-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedIds.length}
            className="inline-flex h-9 items-center gap-2 rounded-sm border border-orange-400/30 bg-orange-500 px-4 text-[12px] font-semibold text-zinc-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={13} />
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
