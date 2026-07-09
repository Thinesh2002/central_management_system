// A plain window.open(url, "_blank") with no window-feature string opens a
// new browser TAB in every modern browser — only passing feature flags
// (width/height/etc.) makes the browser treat it as a genuine separate
// popup window instead. Every "opens as a popup" trigger in the app should
// go through this so they're all consistent.
export function openPopup(url) {
  const width = 1280;
  const height = 860;
  const left = Math.max(0, Math.round((window.screen.width - width) / 2));
  const top = Math.max(0, Math.round((window.screen.height - height) / 2));

  window.open(
    url,
    "_blank",
    `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer,resizable=yes,scrollbars=yes`
  );
}
