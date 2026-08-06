import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff } from "lucide-react";

// The old hover:scale-[2.4] zoom lived inside the table's own DOM, so the
// table's overflow-x-auto (and its wrapping overflow-hidden section) clipped
// the enlarged image instead of letting it float over the page. Rendering
// the zoomed preview through a portal (same technique RowActionsMenu.jsx
// already uses for its dropdown, for the same reason) escapes that clipping
// entirely - it's positioned in fixed/viewport coordinates, not table ones.
export default function HoverZoomImage({ src, alt, onClick, onError, title, ringClassName = "hover:ring-orange-400" }) {
  const [hovering, setHovering] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  function handleEnter() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        top: rect.top + rect.height / 2,
        left: Math.min(rect.right + 10, window.innerWidth - 170),
      });
    }
    setHovering(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setHovering(false)}
        className={`h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded bg-white ring-1 ring-slate-600 transition ${ringClassName}`}
        title={title}
      >
        {src ? (
          <img src={src} alt={alt} className="h-full w-full object-contain" onError={onError} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <ImageOff size={14} className="text-slate-400" />
          </div>
        )}
      </button>

      {hovering && src
        ? createPortal(
            <div
              style={{ position: "fixed", top: coords.top, left: coords.left, transform: "translateY(-50%)" }}
              className="pointer-events-none z-100 h-40 w-40 overflow-hidden rounded-lg border-2 border-orange-400 bg-white shadow-2xl shadow-black/50"
            >
              <img src={src} alt={alt} className="h-full w-full object-contain" />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
