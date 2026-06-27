import { PackageOpen } from 'lucide-react';

export default function EmptyState({ title = 'No data found', text = 'There is no information to show right now.' }) {
  return (
    <div className="empty-state">
      <PackageOpen size={28} className="mb-3 text-slate-500" />
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-text">{text}</p>
    </div>
  );
}
