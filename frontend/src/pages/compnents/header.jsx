import { useState, useRef, useEffect } from "react";
import { Menu as MenuIcon, Search, Globe, Bell, Settings, ChevronDown, Edit, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../../config/auth";

export default function Header({ onMenuClick }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sample navigation links for the second row matching the layout style
  const navLinks = [
    { name: "Manage All Inventory", path: "/products" },
    { name: "Manage Orders", path: "/orders" },
  ];

  return (
    <div className="sticky top-0 z-50 flex flex-col w-full select-none text-white font-sans">
      
      {/* 1st Header Layer */}
      <header className="h-14 bg-[#002f36] border-b border-[#001f24] flex items-center justify-between px-4">
        
        {/* Left Section: Menu, Brand and Marketplace Selector */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-1 text-white hover:opacity-80 transition-all cursor-pointer"
          >
            <MenuIcon size={24} />
          </button>

          <div className="cursor-pointer flex items-baseline gap-1" onClick={() => navigate("/dashboard")}>
            <span className="font-bold text-xl tracking-tight">marketplace</span>
            <span className="text-xs text-slate-300 font-light">central</span>
          </div>

   
        </div>



        {/* Right Section: Configuration controls and Profile dropdown */}
        <div className="flex items-center gap-4 text-sm font-medium">
          




          <button className="hover:text-slate-300 cursor-pointer">
            <Bell size={18} />
          </button>

          <button className="hover:text-slate-300 cursor-pointer">
            <Settings size={18} />
          </button>



          <button className="hover:text-slate-300 cursor-pointer">Help</button>

          {/* Dropdown Menu for Logout/Settings */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1 hover:text-slate-300 cursor-pointer"
            >
              <span className="hidden xl:inline">{user?.name || "Account"}</span>
              <ChevronDown size={14} />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 bg-[#002f36] border border-[#001f24] shadow-xl overflow-hidden z-50 text-xs">
                <div className="px-4 py-2 border-b border-white/10 bg-black/10">
                  <p className="font-semibold truncate">{user?.name || "Admin User"}</p>
                </div>
                <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-left transition-colors">
                  Profile Summary
                </button>
                <button 
                  onClick={() => { logout(); navigate("/login"); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-white/10 text-left transition-colors border-t border-white/5"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* 2nd Header Layer */}
      <div className="h-9 bg-[#001f24] overflow-x-auto scrollbar-none flex items-center px-4 justify-between gap-6 shadow-md border-b border-white/5">
        
        {/* Navigation Items */}
        <div className="flex items-center gap-5 whitespace-nowrap text-xs font-semibold tracking-normal text-slate-200">
          <button className="hover:text-slate-400 transition-colors cursor-pointer">
         
          </button>
          
          {navLinks.map((link, idx) => (
            <span 
              key={idx}
              onClick={() => navigate(link.path)} 
              className="hover:text-[#00a8e1] transition-colors cursor-pointer font-medium"
            >
              {link.name}
            </span>
          ))}
        </div>

        {/* Action Button at the right end */}
        <div className="pl-4 whitespace-nowrap hidden md:block">
          <button className="flex items-center gap-1 px-3 py-0.5 border border-white/40 hover:border-white text-xs rounded-sm transition-colors cursor-pointer bg-white/5">
            <span>Edit</span>
            <Edit size={12} />
          </button>
        </div>

      </div>

    </div>
  );
}