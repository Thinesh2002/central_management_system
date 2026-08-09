// The page-overlay iframe (PageOverlayProvider) is a full, independent
// instance of this SPA with its own router - a page that finishes its job
// (e.g. a successful save) and calls its own navigate("/back-to-list") just
// renders that list *inside the iframe* instead of closing the overlay.
// From there, clicking any row action that itself calls openOverlay() opens
// a second overlay nested inside the first, and so on - the "multiple
// popups" a repeated edit produces. Pages with no further step after
// success should call closeEmbeddedOverlay() instead of navigating, so the
// outer window's overlay actually closes and its onClose refresh callback
// runs.
const PAGE_OVERLAY_CLOSE_MESSAGE = { source: "cms-page-overlay", action: "close" };

export function closeEmbeddedOverlay() {
  try {
    if (window.self === window.top) return false;

    window.parent.postMessage(PAGE_OVERLAY_CLOSE_MESSAGE, window.location.origin);
    return true;
  } catch {
    return false;
  }
}

export function isPageOverlayCloseMessage(data) {
  return data?.source === PAGE_OVERLAY_CLOSE_MESSAGE.source && data?.action === "close";
}
