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
        <div className="fixed inset-y-0 right-0 left-0 z-60 flex flex-col border-l border-slate-800 bg-slate-950 lg:left-58">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 bg-[#0b1220] px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Central Management
            </span>

            <button
              type="button"
              onClick={closeOverlay}
              className="flex h-7 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
            >
              <X size={13} />
              Close
            </button>
          </div>

          <iframe title="Page overlay" src={url} className="h-full w-full flex-1 border-0 bg-slate-950" />
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
