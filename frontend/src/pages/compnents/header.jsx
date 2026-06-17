import { useState, useRef, useEffect } from "react";
import { Menu as MenuIcon, Search, Bell, Settings, ChevronDown, Edit, Mail, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../../config/auth";
import { darazApi } from "../../services/daraz/darazCentral.service";

export default function Header({ onMenuClick }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const defaultNavLinks = [
    { name: "Dashboard", path: "/daraz/advanced" },
    { name: "Manage All Inventory", path: "/manage-all-inventory" },
    { name: "Manage Orders", path: "/daraz/orders" },
    { name: "Manage Products", path: "/daraz/manage-products" },
    { name: "Business Reports", path: "/daraz/business-reports" },
    { name: "Net Sales", path: "/daraz/net-sales" },
    { name: "SKU Mapping", path: "/daraz/sku-mapping" },
    { name: "Daraz Accounts", path: "/daraz/accounts" },
  ];

  const [navLinks, setNavLinks] = useState(defaultNavLinks);

  useEffect(() => {
    let mounted = true;
    darazApi.getSystemBookmarks()
      .then((res) => {
        const rows = (res.rows || []).map((item) => ({ name: item.label, path: item.path }));
        if (mounted && rows.length > 0) setNavLinks(rows.slice(0, 10));
      })
      .catch(() => {
        if (mounted) setNavLinks(defaultNavLinks);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="sticky top-0 z-50 flex flex-col w-full select-none text-white font-sans">
      <header className="h-12 bg-[#00343d] border-b border-[#00262c] flex items-center justify-between px-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuClick} className="p-1 text-white hover:bg-white/10 rounded transition-all cursor-pointer">
            <MenuIcon size={21} />
          </button>

          <div className="cursor-pointer flex items-baseline gap-1 shrink-0" onClick={() => navigate("/daraz/advanced")}>
            <span className="font-black text-lg tracking-tight lowercase">daraz seller central</span>
            <span className="text-[10px] text-slate-300 font-light">lk</span>
          </div>

          <div className="hidden md:flex items-center h-8 bg-white text-stone-900 border border-cyan-900/30 rounded-sm overflow-hidden text-xs font-bold">
            <button onClick={() => navigate("/daraz/accounts")} className="px-3 h-full border-r border-stone-200 hover:bg-stone-50">BH</button>
            <button className="px-3 h-full font-normal text-stone-600">Sri Lanka</button>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 max-w-md mx-6 h-8 bg-[#006a75] border border-cyan-900/40 rounded-sm overflow-hidden">
          <input className="flex-1 bg-transparent text-white placeholder:text-white/80 px-3 text-xs outline-none" placeholder="Search SKUs, orders, products, accounts" />
          <button className="w-10 bg-[#00869a] flex items-center justify-center hover:bg-[#0096ac]"><Search size={16} /></button>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
          <span className="hidden xl:inline-flex items-center gap-1 text-white/90"><span className="w-7 h-4 bg-stone-300 rounded-full inline-block relative"><span className="w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5" /></span> New Seller Central</span>
          <Sparkles size={16} className="hidden md:block" />
          <Mail size={16} className="hidden md:block" />
          <Bell size={16} />
          <Settings size={16} />
          <span className="hidden sm:block">EN</span>
          <button className="hover:text-slate-300">Help</button>
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1 hover:text-slate-300">
              <span className="hidden xl:inline max-w-24 truncate">{user?.name || "Account"}</span>
              <ChevronDown size={14} />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-52 bg-[#00343d] border border-[#001f24] shadow-xl overflow-hidden z-50 text-xs">
                <div className="px-4 py-2 border-b border-white/10 bg-black/10"><p className="font-semibold truncate">{user?.name || "Admin User"}</p></div>
                <button onClick={() => navigate("/daraz/accounts")} className="w-full px-4 py-2 hover:bg-white/10 text-left">Daraz Account Settings</button>
                <button onClick={() => { logout(); navigate("/login"); }} className="w-full px-4 py-2 text-red-300 hover:bg-white/10 text-left border-t border-white/5">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="h-9 bg-[#00272d] overflow-x-auto scrollbar-none flex items-center px-3 justify-between gap-6 shadow-md border-b border-white/5">
        <div className="flex items-center gap-5 whitespace-nowrap text-xs font-bold text-slate-100">
          {navLinks.map((link) => (
            <span key={link.path} onClick={() => navigate(link.path)} className="hover:text-[#00b7d0] transition-colors cursor-pointer">{link.name}</span>
          ))}
        </div>
        <div className="pl-4 whitespace-nowrap hidden md:block">
          <button onClick={() => navigate("/daraz/accounts")} className="flex items-center gap-1 px-3 py-0.5 border border-white/40 hover:border-white text-xs rounded-sm transition-colors bg-white/5"><span>Edit</span><Edit size={12} /></button>
        </div>
      </div>
    </div>
  );
}
