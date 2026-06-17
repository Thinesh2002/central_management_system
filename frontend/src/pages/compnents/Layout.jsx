import { useEffect, useState, useRef } from "react";
import Header from "./header";
import Sidebar from "./sidebar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const sidebarRef = useRef(null);

  useEffect(() => {
    // Prevent double scrollbars on viewports
    document.body.style.overflow = "hidden";
    
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => {
      document.body.style.overflow = "";
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        if (!event.target.closest("button")) {
          setSidebarOpen(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    // 1. flex-col potta header component accurate-ah mela settle aagum
    <div className="h-screen w-screen bg-stone-50 text-stone-900 overflow-hidden font-sans relative flex flex-col">
      
      {/* HEADER LAYER */}
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

      {/* MAIN CONTENT AREA CONTAINER */}
      {/* 2. flex-1 and h-full kuduthu overflow-hidden panna thaan scroll main tag-kulla control aagum */}
      <div className="flex flex-1 h-full min-h-0 relative overflow-hidden z-10">
        
        {/* 3. h-full overflow-y-auto elements dynamic scroll-ah perfect-ah handle pannum */}
        <main className="flex-1 h-full overflow-y-auto p-2 sm:p-3 bg-stone-50 relative z-10">
          <div className="mx-auto max-w-7xl"> {/* Nalla layout structural control-ku max-w help pannum */}

            {loading ? (
              <div className="flex items-center justify-center h-[50vh]">
                <div className="relative flex items-center justify-center">
                  {/* Clean Light-Theme Spinner Loader */}
                  <div className="w-12 h-12 rounded-full border-4 border-stone-200 border-t-cyan-500 animate-spin"></div>
                </div>
              </div>
            ) : (
              <>
                {children}
                <footer className="mt-6 mb-2 border-t border-stone-200 bg-white rounded-sm px-4 py-3 text-[11px] text-stone-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>Daraz Seller Central CMS • Product, order, finance, and inventory automation workspace</span>
                  <span>Auto sync every 30 minutes when tokens are active</span>
                </footer>
              </>
            )}

          </div>
        </main>
      </div>

      {/* FULL PAGE OVERLAY + LIGHT BLUR EFFECTS */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-stone-950/30 backdrop-blur-sm z-40 transition-all duration-300 left-0 top-0"
        />
      )}

      {/* FIXED SIDEBAR WITH AUTO HIDE & FLYOUT OVERFLOW CAPABILITIES */}
      <aside
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 z-50 h-screen
          bg-white border-r border-stone-200
          transition-all duration-300 ease-in-out
          w-60 overflow-visible
          ${
            sidebarOpen
              ? "translate-x-0 opacity-100 shadow-[4px_0_24px_rgba(0,0,0,0.06)]"
              : "-translate-x-full opacity-0 pointer-events-none"
          }
        `}
      >
        {/* Wrapper component providing context bounds for sublinks */}
        <div className="w-full h-full overflow-visible">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      </aside>

    </div>
  );
}