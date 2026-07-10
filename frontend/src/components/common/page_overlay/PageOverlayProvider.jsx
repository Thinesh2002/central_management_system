import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";

const OverlayContext = createContext(null);

// The overlaid page is a real, independent instance of this same SPA
// loaded in an iframe (its own routing, data-fetching, everything works
// unmodified) — the `embed=1` flag tells Layout.jsx to skip rendering its
// own sidebar/chrome inside that iframe, since the outer page already has
// one and a nested sidebar would look broken.
function withEmbedFlag(url) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}embed=1`;
}

export function PageOverlayProvider({ children }) {
  const [url, setUrl] = useState(null);

  const openOverlay = useCallback((targetUrl) => {
    setUrl(withEmbedFlag(targetUrl));
  }, []);

  const closeOverlay = useCallback(() => setUrl(null), []);

  return (
    <OverlayContext.Provider value={{ openOverlay, closeOverlay }}>
      {children}

      {url && (
        <div className="page-overlay-backdrop fixed inset-y-0 right-0 left-0 z-60 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4 lg:left-58">
          <div className="page-overlay-card flex h-full w-full max-w-475 flex-col overflow-hidden rounded-2xl border border-purple-500/40 bg-slate-950">
            <div className="flex h-12 shrink-0 items-center justify-between gap-3 rounded-t-2xl border-b border-purple-500/30 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-purple-300">
                Central Management
              </span>

              <button
                type="button"
                onClick={closeOverlay}
                title="Close"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-200 transition hover:bg-purple-500/25 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <iframe title="Page overlay" src={url} className="h-full w-full flex-1 border-0 bg-slate-950" />
          </div>
        </div>
      )}
    </OverlayContext.Provider>
  );
}

export function usePageOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("usePageOverlay must be used within a PageOverlayProvider");
  return ctx;
}
