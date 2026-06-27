export default function SkeletonTable({ rows = 6 }) {
  return (
    <div className="loading-card space-y-3">
      <div className="skeleton-line max-w-xs" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton-table-row" />
      ))}
    </div>
  );
}
