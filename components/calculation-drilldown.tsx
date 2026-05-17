"use client";

import { useState } from "react";
import { X, FileText, BookOpen, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import type { CalculationExplanation } from "@/lib/tax-engine/audit";
import { formatBRL } from "@/lib/tax-engine/engine";

interface Props {
  explanation: CalculationExplanation | null;
  onClose: () => void;
}

export function CalculationDrillDown({ explanation, onClose }: Props) {
  const [showOps, setShowOps] = useState(false);

  if (!explanation) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-500/10 text-brand-500">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{explanation.title}</h2>
              <div className="text-xs text-ink-500">Auditoria do calculo</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Total destacado */}
          <div className="rounded-lg border border-warn-500/30 bg-amber-50/40 p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-500">Valor calculado</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular text-warn-500">
              {formatBRL(explanation.totalValue)}
            </div>
          </div>

          {/* Resumo da regra */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <BookOpen size={16} className="text-brand-500" />
              Resumo da regra
            </div>
            <p className="text-sm leading-relaxed text-ink-700">{explanation.ruleSummary}</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-ink-100 px-2 py-1 text-xs font-medium text-ink-600">
              Referencia: {explanation.legalReference}
            </div>
          </div>

          {/* Passos do calculo */}
          <div>
            <div className="mb-2 text-sm font-semibold text-ink-900">Calculo passo-a-passo</div>
            <div className="overflow-hidden rounded-md border border-ink-200">
              {explanation.steps.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between border-b border-ink-100 px-4 py-3 last:border-b-0 ${
                    s.isResult ? "bg-success-500/5 font-semibold" : "bg-white"
                  }`}
                >
                  <div className="flex-1">
                    <div className={`text-sm ${s.isResult ? "text-ink-900" : "text-ink-700"}`}>{s.label}</div>
                    {s.formula && (
                      <div className="mt-0.5 font-mono text-xs text-ink-500">{s.formula}</div>
                    )}
                  </div>
                  {s.value !== undefined && (
                    <div
                      className={`ml-4 font-mono tabular ${
                        s.isResult
                          ? "text-base font-bold text-success-500"
                          : s.value < 0
                          ? "text-sm text-danger-500"
                          : "text-sm text-ink-700"
                      }`}
                    >
                      {s.value < 0 ? "-" : ""}{formatBRL(Math.abs(s.value))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Operacoes relacionadas (expansivel) */}
          {explanation.relatedOperations.length > 0 && (
            <div>
              <button
                onClick={() => setShowOps(!showOps)}
                className="flex items-center gap-2 text-sm font-semibold text-ink-900 hover:text-brand-500"
              >
                {showOps ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Operacoes relacionadas ({explanation.relatedOperations.length})
              </button>
              {showOps && (
                <div className="mt-2 overflow-x-auto rounded-md border border-ink-200">
                  <table className="w-full text-xs">
                    <thead className="bg-ink-50 text-ink-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Data</th>
                        <th className="px-3 py-2 text-left font-medium">Tipo</th>
                        <th className="px-3 py-2 text-left font-medium">Ativo</th>
                        <th className="px-3 py-2 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {explanation.relatedOperations.slice(0, 50).map((op, i) => (
                        <tr key={i} className="border-t border-ink-100">
                          <td className="px-3 py-2 font-mono text-ink-700">
                            {new Date(op.date).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-3 py-2 text-ink-700">{op.type}</td>
                          <td className="px-3 py-2 font-mono text-ink-900">{op.assetCode}</td>
                          <td className="px-3 py-2 text-right font-mono tabular text-ink-700">
                            {formatBRL(op.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {explanation.relatedOperations.length > 50 && (
                    <div className="border-t border-ink-100 bg-ink-50 px-3 py-2 text-xs text-ink-500">
                      Mostrando 50 de {explanation.relatedOperations.length} operacoes
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notas / arestas */}
          {explanation.notes.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900">
                <AlertCircle size={16} className="text-warn-500" />
                Notas e particularidades
              </div>
              <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50/40 p-3">
                {explanation.notes.map((n, i) => (
                  <li key={i} className="text-xs text-ink-700">
                    • {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
