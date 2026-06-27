import { Loader2 } from 'lucide-react';

export default function PageLoader({ label = 'Loading data...' }) {
  return (
    <div className="page-loading">
      <Loader2 size={20} className="mr-2 animate-spin text-yellow-300" />
      {label}
    </div>
  );
}
