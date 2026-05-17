import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  trend?: ReactNode;
  emphasis?: "default" | "success" | "warn" | "danger";
}

export function MetricCard({ label, value, hint, trend, emphasis = "default" }: MetricCardProps) {
  const colors = {
    default: "text-slate-900",
    success: "text-success-500",
    warn: "text-warn-500",
    danger: "text-danger-500",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold tabular ${colors[emphasis]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      {trend && <div className="mt-2">{trend}</div>}
    </div>
  );
}
