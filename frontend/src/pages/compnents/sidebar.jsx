import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Palette,
  Package,
  PlusSquare,
  Tags,
  ShoppingBag,
  GitBranch,
  BarChart3,
  Warehouse,
  FileText,
  X,
  Truck,
  ChevronRight
} from "lucide-react";

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-60 h-full bg-white border-r border-stone-200 flex flex-col relative select-none overflow-visible">
      
      {/* MOBILE CLOSE */}
      <div className="lg:hidden flex justify-end p-4">
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-stone-50 text-stone-500 hover:text-stone-800 border border-stone-200 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* SCROLLABLE MENU */}
      <nav className="flex-1 py-4 space-y-6 overflow-y-auto hover:overflow-visible sidebar-scroll">
        
        {/* SECTION 1: PRODUCTS */}
        <Section title="Products">
          <Item 
            to="/products" 
            icon={Package} 
            label="Product Catalog" 
            onLinkClick={onClose}
            subLinks={[
              { to: "/products", label: "All Products" },
              { to: "/add-product", label: "Add New Product" },
              { to: "/category-view", label: "Categories" },
              { to: "/colours", label: "Colours Management" },
              { to: "/sku-mapping", label: "SKU Mapping Nodes" },
              { to: "/inventory", label: "Stock Control (Warehouse)" }
            ]}
          />
        </Section>

        {/* SECTION 2: ACCOUNTS */}
        <Section title="Accounts">
          <Item 
            to="/daraz-dashboard" 
            icon={ShoppingBag} 
            label="Channel Stores" 
            onLinkClick={onClose}
            subLinks={[
              { to: "/daraz-dashboard", label: "Daraz Seller Central" },
              { to: "/daraz/accounts", label: "Daraz Accounts" },
              { to: "/daraz/products", label: "Daraz Products" },
              { to: "/daraz/orders", label: "Daraz Orders" },
              { to: "/daraz/inventory", label: "Daraz Inventory Health" },
              { to: "/daraz/categories", label: "Daraz Categories" },
              { to: "/daraz/finance", label: "Daraz Finance Ledger" },
              { to: "/woo-Products", label: "WooCommerce Products" }
            ]}
          />
        </Section>

        {/* SECTION 3: ANALYTICS & PRICING */}
        <Section title="Trend & Pricing">
          <Item 
            to="/trend-analysis" 
            icon={BarChart3} 
            label="Daraz Market Trend" 
            onLinkClick={onClose}
          />
          <Item 
            to="/daraz-price-calculation" 
            icon={Tags} 
            label="Price Calculator" 
            onLinkClick={onClose}
          />
        </Section>

        {/* SECTION 4: SUPPLIERS */}
        <Section title="Suppliers Nodes">
          <Item 
            to="/suppliers" 
            icon={Truck} 
            label="Suppliers Network" 
            onLinkClick={onClose}
            subLinks={[
              { to: "/suppliers", label: "Suppliers Dashboard" },
              { to: "/suppliers-shipments", label: "Shipment Matrix Logs" }
            ]}
          />
        </Section>

        {/* SECTION 5: BLOG */}
        <Section title="Content Systems">
          <Item 
            to="/blog" 
            icon={FileText} 
            label="Blog Publisher" 
            onLinkClick={onClose}
          />
        </Section>

      </nav>
    </aside>
  );
}

/* ================= HELPER COMPONENTS ================= */

function Section({ title, children }) {
  return (
    <div className="space-y-1 overflow-visible">
      {title && (
        <p className="px-6 mb-2 text-[10px] text-amber-600 font-bold tracking-[0.15em] uppercase">
          {title}
        </p>
      )}
      <div className="flex flex-col overflow-visible">{children}</div>
    </div>
  );
}

function Item({ to, icon: Icon, label, subLinks = [], onLinkClick }) {
  return (
    <div className="relative group w-full overflow-visible">
      <NavLink
        to={to}
        onClick={() => {
          if (subLinks.length === 0 && onLinkClick) onLinkClick();
        }}
        className={({ isActive }) =>
          `flex items-center justify-between px-6 py-3 text-[12px] transition-all duration-150 cursor-pointer w-full
          ${
            isActive
              ? "bg-stone-50 text-cyan-600 border-l-2 border-cyan-500 font-medium"
              : "text-stone-600 hover:bg-stone-50 hover:text-cyan-600"
          }
          group-hover:bg-stone-50`
        }
      >
        <div className="flex items-center gap-2 truncate">
          <Icon size={14} className="shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        
        {subLinks.length > 0 && (
          <ChevronRight 
            size={14} 
            className="text-stone-400 group-hover:text-cyan-600 transition-transform duration-150" 
          />
        )}
      </NavLink>

      {/* FLYOUT SYSTEM OVERFLOW - LIGHT MODE */}
      {subLinks.length > 0 && (
        <div className="absolute left-full top-0 pl-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50">
          
          {/* Connector triangle */}
          <div className="absolute left-[-5px] top-[14px] w-2.5 h-2.5 bg-white border-l border-b border-stone-200 rotate-45 z-50 hidden group-hover:block" />

          {/* Sub Tabs Light Container Box */}
          <div className="w-64 bg-white border border-stone-200 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] py-2 min-h-[180px] flex flex-col rounded-r-xl z-50 relative ml-[1px] border-r-2 border-r-cyan-500/40">
            {subLinks.map((sub, index) => (
              <NavLink
                key={index}
                to={sub.to}
                onClick={onLinkClick}
                className={({ isActive }) =>
                  `px-6 py-3 text-[12px] transition-colors cursor-pointer flex items-center justify-between
                  ${
                    isActive 
                      ? "text-cyan-600 bg-stone-50 font-medium" 
                      : "text-stone-600 hover:text-cyan-600 hover:bg-stone-50"
                  }`
                }
              >
                <span>{sub.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}