import { PackagePlus } from "lucide-react";

export default function ManualOrdersHeader({ onCreate }) {
  return (
    <div className="flex items-center justify-end border-b border-slate-800 bg-[#020617] px-4 py-2">
      <button
        type="button"
        onClick={onCreate}
        className="group inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-[#ff7300] px-3 text-xs font-bold text-white shadow-[0_0_10px_rgba(147,51,234,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-purple-500 hover:shadow-[0_0_18px_rgba(168,85,247,0.75)] active:scale-95"
      >
        <PackagePlus
          size={14}
          className="transition-transform duration-300 group-hover:rotate-90"
        />
        Create Order
      </button>
    </div>
  );
}