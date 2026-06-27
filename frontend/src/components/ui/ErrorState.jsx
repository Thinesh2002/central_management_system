import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ title = 'Something went wrong', text = 'Please try again.' }) {
  return (
    <div className="error-state">
      <AlertTriangle size={28} className="mb-3 text-red-300" />
      <p className="error-state-title">{title}</p>
      <p className="error-state-text">{text}</p>
    </div>
  );
}
