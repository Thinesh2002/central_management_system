export default function Loader({ label, size = "default", className = "", minHeight = "200px" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`}
      style={minHeight ? { minHeight } : undefined}
    >
      <div className={size === "sm" ? "loader loader-sm" : "loader"} />
      {label ? <span className="text-sm font-semibold">{label}</span> : null}
    </div>
  );
}
