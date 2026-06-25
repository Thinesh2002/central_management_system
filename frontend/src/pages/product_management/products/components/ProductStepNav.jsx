import { Image, Layers, ListChecks, Package, Settings, Tags } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const steps = [
  { key: "basic", label: "Basic Details", icon: Package, to: (id) => `/product/local-products/edit/${id}/basic` },
  { key: "price-inventory", label: "Price & Inventory", icon: Tags, to: (id) => `/product/local-products/edit/${id}/price-inventory` },
  { key: "attributes", label: "Attributes", icon: ListChecks, to: (id) => `/product/local-products/edit/${id}/attributes` },
  { key: "variants", label: "Variants / SKU", icon: Layers, to: (id) => `/product/local-products/edit/${id}/variants` },
];

export default function ProductStepNav({ productId, active = "basic", product }) {
  const navigate = useNavigate();

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 rounded-2xl bg-slate-950 p-4 text-white">
        <p className="text-xs font-medium text-slate-300">Local Product</p>
        <p className="mt-1 truncate text-lg font-bold">{product?.title || product?.sku || `#${productId}`}</p>
        <p className="truncate text-xs text-slate-300">{product?.sku || "SKU not set"}</p>
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <NavLink
              key={step.key}
              to={step.to(productId)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive || active === step.key
                    ? "bg-slate-950 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              <Icon size={17} />
              {step.label}
            </NavLink>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate("/product/local-products")}
        className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        Back to Dashboard
      </button>
    </aside>
  );
}
