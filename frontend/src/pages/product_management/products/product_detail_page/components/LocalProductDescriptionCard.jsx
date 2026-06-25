import { CalendarDays, FileText, UserRound } from "lucide-react";
import LocalProductInfoCard, { DetailItem } from "./LocalProductInfoCard";
import { formatDateTime, valueOf } from "../utils/localProductViewHelpers";

export default function LocalProductDescriptionCard({ product }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <LocalProductInfoCard title="Description" icon={FileText}>
          <div className="rounded-xl border border-slate-800 bg-[#070b16] p-4">
            <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-slate-300">
              {valueOf(product, ["description"], "No full description added.")}
            </p>
          </div>
        </LocalProductInfoCard>
      </div>

      <LocalProductInfoCard title="Audit Details" icon={CalendarDays}>
        <div className="grid grid-cols-1 gap-3">
          <DetailItem
            label="Created At"
            value={formatDateTime(valueOf(product, ["created_at", "createdAt"], ""))}
          />
          <DetailItem
            label="Updated At"
            value={formatDateTime(valueOf(product, ["updated_at", "updatedAt"], ""))}
          />
          <DetailItem
            label="Created By"
            value={valueOf(product, ["created_by", "createdBy", "created_user", "created_user_name"])}
          />
          <DetailItem
            label="Updated By"
            value={valueOf(product, ["updated_by", "updatedBy", "updated_user", "updated_user_name"])}
          />
        </div>

        <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500">
          <UserRound size={14} /> Product management record
        </div>
      </LocalProductInfoCard>
    </div>
  );
}
