import type { AllocationItem } from "@/lib/tax-engine/engine";
import { formatBRL } from "@/lib/tax-engine/engine";

const COLORS = [
  "bg-brand-900",
  "bg-brand-600",
  "bg-success-500",
  "bg-warn-500",
  "bg-slate-400",
  "bg-purple-600",
  "bg-pink-600",
  "bg-cyan-600",
];

interface AllocationBarsProps {
  items: AllocationItem[];
}

export function AllocationBars({ items }: AllocationBarsProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.classLabel}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.classLabel}</span>
            <span className="font-mono tabular text-slate-600">
              {(item.pct * 100).toFixed(1)}% • {formatBRL(item.totalBrl)}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full ${COLORS[i % COLORS.length]} transition-all`}
              style={{ width: `${item.pct * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
