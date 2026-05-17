"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { DetailedPosition } from "@/lib/tax-engine/engine";
import { formatBRL } from "@/lib/tax-engine/engine";

interface Props {
  positions: DetailedPosition[];
}

interface GroupedClass {
  classLabel: string;
  positions: DetailedPosition[];
  totalCurrent: number;
  totalCost: number;
  totalGain: number;
  totalLatentTax: number;
}

export function PositionsTable({ positions }: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(positions.map((p) => p.classLabel))
  );

  const toggle = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // agrupa por classe
  const groups = new Map<string, GroupedClass>();
  for (const p of positions) {
    if (!groups.has(p.classLabel)) {
      groups.set(p.classLabel, {
        classLabel: p.classLabel,
        positions: [],
        totalCurrent: 0,
        totalCost: 0,
        totalGain: 0,
        totalLatentTax: 0,
      });
    }
    const g = groups.get(p.classLabel)!;
    g.positions.push(p);
    g.totalCurrent += p.currentValue;
    g.totalCost += p.costTotal;
    g.totalGain += p.unrealizedGain;
    g.totalLatentTax += p.potentialTaxIfSold;
  }

  const grouped = [...groups.values()].sort((a, b) => b.totalCurrent - a.totalCurrent);
  const totalPortfolio = grouped.reduce((s, g) => s + g.totalCurrent, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Ativo</th>
            <th className="px-4 py-3 text-right">Qtde</th>
            <th className="px-4 py-3 text-right">Custo médio</th>
            <th className="px-4 py-3 text-right">Valor atual</th>
            <th className="px-4 py-3 text-right">Ganho latente</th>
            <th className="px-4 py-3 text-right">IR se vender hoje</th>
            <th className="px-4 py-3 text-right">% Carteira</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((group) => {
            const open = openGroups.has(group.classLabel);
            const pctOfPortfolio = group.totalCurrent / totalPortfolio;
            return (
              <>
                <tr
                  key={group.classLabel}
                  className="cursor-pointer bg-slate-50/50 hover:bg-slate-100"
                  onClick={() => toggle(group.classLabel)}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {group.classLabel}
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                        {group.positions.length}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-slate-400">—</td>
                  <td className="px-4 py-2.5 text-right text-xs text-slate-400">—</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular font-semibold text-slate-900">
                    {formatBRL(group.totalCurrent)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono tabular font-semibold ${group.totalGain >= 0 ? "text-success-500" : "text-danger-500"}`}>
                    {group.totalGain >= 0 ? "+" : ""}{formatBRL(group.totalGain)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular text-warn-500">
                    {formatBRL(group.totalLatentTax)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular text-slate-700">
                    {(pctOfPortfolio * 100).toFixed(1)}%
                  </td>
                </tr>
                {open &&
                  group.positions.map((p) => (
                    <tr key={p.asset.code} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 pl-12">
                        <div>
                          <div className="font-mono text-sm font-medium text-slate-900">{p.asset.code}</div>
                          <div className="text-xs text-slate-500">{p.asset.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular text-slate-700">
                        {p.qty.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular text-slate-700">
                        {formatBRL(p.meanCost)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular text-slate-900">
                        {formatBRL(p.currentValue)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono tabular ${p.unrealizedGain >= 0 ? "text-success-500" : "text-danger-500"}`}>
                        <div>{p.unrealizedGain >= 0 ? "+" : ""}{formatBRL(p.unrealizedGain)}</div>
                        <div className="text-xs">{p.unrealizedGain >= 0 ? "+" : ""}{(p.unrealizedGainPct * 100).toFixed(1)}%</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular text-warn-500">
                        {p.potentialTaxIfSold > 0 ? formatBRL(p.potentialTaxIfSold) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular text-slate-500">
                        {((p.currentValue / totalPortfolio) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
