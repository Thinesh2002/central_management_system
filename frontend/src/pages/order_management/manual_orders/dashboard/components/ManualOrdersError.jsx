export default function ManualOrdersError({ error }) {
  if (!error) return null;

  return (
    <div className="border-b border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
      {error}
    </div>
  );
}
