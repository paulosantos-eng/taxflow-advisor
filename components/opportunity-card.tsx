import { Lightbulb, AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { Opportunity } from "@/lib/tax-engine/types";
import { formatBRL } from "@/lib/tax-engine/engine";

interface OpportunityCardProps {
  opp: Opportunity;
}

export function OpportunityCard({ opp }: OpportunityCardProps) {
  const config = {
    info: { Icon: Info, bg: "bg-blue-50", border: "border-blue-200", text: "text-brand-900" },
    warn: { Icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-200", text: "text-warn-500" },
    high: { Icon: AlertCircle, bg: "bg-red-50", border: "border-red-200", text: "text-danger-500" },
  };
  const { Icon, bg, border, text } = config[opp.severity];
  return (
    <div className={`rounded-lg border ${border} ${bg} p-3`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`mt-0.5 ${text}`} />
        <div className="flex-1">
          <div className={`text-sm font-semibold ${text}`}>{opp.title}</div>
          <p className="mt-1 text-sm text-slate-700">{opp.description}</p>
          {typeof opp.estimatedSavingBrl === "number" && opp.severity !== "info" && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <Lightbulb size={12} />
              Impacto estimado: <span className="font-mono tabular">{formatBRL(opp.estimatedSavingBrl)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
