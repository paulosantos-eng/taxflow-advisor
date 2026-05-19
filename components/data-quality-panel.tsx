"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle, Database, Info, ShieldAlert } from "lucide-react";
import { analyzeDataQuality } from "@/lib/tax-engine/data-quality";
import type { Operation } from "@/lib/tax-engine/types";

interface Props {
  clientId: string;
  operations: Operation[];
  compact?: boolean;
}

export function DataQualityPanel({ clientId, operations, compact = false }: Props) {
  const quality = analyzeDataQuality(operations);
  const statusConfig = {
    ok: {
      label: "Dados consistentes",
      icon: CheckCircle,
      border: "border-success-200",
      bg: "bg-success-50",
      text: "text-success-500",
    },
    info: {
      label: "Dados bons, com observações",
      icon: Info,
      border: "border-blue-200",
      bg: "bg-blue-50",
      text: "text-brand-900",
    },
    warn: {
      label: "Dados incompletos",
      icon: AlertTriangle,
      border: "border-amber-200",
      bg: "bg-amber-50",
      text: "text-warn-500",
    },
    high: {
      label: "Cálculo não confiável ainda",
      icon: ShieldAlert,
      border: "border-red-200",
      bg: "bg-red-50",
      text: "text-danger-500",
    },
  }[quality.status];
  const Icon = statusConfig.icon;

  return (
    <div className={`rounded-lg border ${statusConfig.border} ${statusConfig.bg} p-5 shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className={`mt-0.5 ${statusConfig.text}`}>
            <Icon size={20} />
          </div>
          <div>
            <h2 className={`font-semibold ${statusConfig.text}`}>Qualidade dos dados</h2>
            <p className="mt-1 text-sm text-slate-600">
              {statusConfig.label}. Score operacional: {quality.score}/100.
            </p>
          </div>
        </div>
        <Link
          href={`/clients/${clientId}/operations`}
          className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Corrigir dados
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <QualityStat label="Operações" value={quality.stats.operations} />
        <QualityStat label="Ativos" value={quality.stats.assets} />
        <QualityStat label="Exterior" value={quality.stats.foreignOperations} />
        <QualityStat label="Rendimentos" value={quality.stats.incomeEvents} />
      </div>

      {!compact && (
        <div className="mt-4 space-y-2">
          {quality.issues.length > 0 ? (
            quality.issues.map((issue) => (
              <div key={issue.id} className="rounded-md bg-white/75 p-3 text-sm ring-1 ring-white">
                <div className="font-medium text-slate-900">{issue.title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-600">{issue.description}</div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-white/75 p-3 text-sm text-slate-600 ring-1 ring-white">
              <Database size={15} className="text-success-500" />
              Não há pendências críticas detectadas nos dados usados pelo engine.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QualityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/75 px-3 py-2 ring-1 ring-white">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular text-slate-900">{value}</div>
    </div>
  );
}
