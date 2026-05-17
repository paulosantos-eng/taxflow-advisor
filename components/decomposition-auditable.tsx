"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { CalculationDrillDown } from "./calculation-drilldown";
import { explainCalculation, type CalculationKind, type CalculationExplanation } from "@/lib/tax-engine/audit";
import type { EngineResult } from "@/lib/tax-engine/engine";
import type { Operation } from "@/lib/tax-engine/types";
import { formatBRL } from "@/lib/tax-engine/engine";

interface DecompositionItem {
  kind: CalculationKind;
  label: string;
  value: number;
  hint?: string;
  alert?: boolean;
}

interface Props {
  items: DecompositionItem[];
  total: number;
  result: EngineResult;
  operations: Operation[];
  vehicleId: string;
  year: number;
}

export function DecompositionAuditable({ items, total, result, operations, vehicleId, year }: Props) {
  const [explanation, setExplanation] = useState<CalculationExplanation | null>(null);

  const openDrill = (kind: CalculationKind) => {
    const exp = explainCalculation(kind, result, operations, vehicleId, year);
    setExplanation(exp);
  };

  return (
    <>
      <dl className="space-y-2 text-sm">
        {items.map((item) => (
          <button
            key={item.kind}
            onClick={() => openDrill(item.kind)}
            className="group flex w-full items-center justify-between rounded-md p-2 text-left hover:bg-brand-500/5 focus:bg-brand-500/10 focus:outline-none"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <dt className="text-ink-700 group-hover:text-brand-500">{item.label}</dt>
                <Search size={12} className="text-ink-300 group-hover:text-brand-500" />
              </div>
              {item.hint && <div className="text-xs text-ink-400">{item.hint}</div>}
            </div>
            <dd
              className={`font-mono tabular ${
                item.alert ? "font-semibold text-danger-500" : "text-ink-900"
              }`}
            >
              {formatBRL(item.value)}
            </dd>
          </button>
        ))}
        <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3">
          <span className="font-semibold text-ink-900">Total IR {year}</span>
          <span className="font-mono text-lg font-bold tabular text-ink-900">{formatBRL(total)}</span>
        </div>
        <div className="text-center text-xs text-ink-400 italic">
          Clique em qualquer linha para auditar o calculo
        </div>
      </dl>

      <CalculationDrillDown explanation={explanation} onClose={() => setExplanation(null)} />
    </>
  );
}
