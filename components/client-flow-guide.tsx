"use client";

import Link from "next/link";
import { BarChart3, CheckCircle, ClipboardList, FileText, ListPlus } from "lucide-react";
import { formatBRL } from "@/lib/tax-engine/engine";

interface Props {
  clientId: string;
  positionsCount: number;
  operationsCount: number;
  totalIr: number;
  opportunitiesCount: number;
  eventsCount: number;
}

export function ClientFlowGuide({
  clientId,
  positionsCount,
  operationsCount,
  totalIr,
  opportunitiesCount,
  eventsCount,
}: Props) {
  const hasPortfolio = positionsCount > 0;
  const hasTaxDiagnosis = totalIr > 0 || opportunitiesCount > 0 || eventsCount > 0;
  const steps = [
    {
      title: "1. Dados",
      description: "Cliente e veículo principal estão criados.",
      done: true,
      href: `/clients/${clientId}/input`,
      icon: ClipboardList,
      action: "Inputs mensais",
    },
    {
      title: "2. Carteira",
      description: hasPortfolio
        ? `${positionsCount} ativos e ${operationsCount} operações processadas.`
        : "Carregue uma carteira modelo ou lance operações.",
      done: hasPortfolio,
      href: `/clients/${clientId}/operations`,
      icon: ListPlus,
      action: hasPortfolio ? "Editar operações" : "Carregar carteira",
    },
    {
      title: "3. Diagnóstico",
      description: hasTaxDiagnosis
        ? `${formatBRL(totalIr)} de IR projetado em 2026.`
        : "Sem imposto projetado com os dados atuais.",
      done: hasTaxDiagnosis,
      href: `/clients/${clientId}`,
      icon: BarChart3,
      action: "Ver diagnóstico",
    },
    {
      title: "4. Plano",
      description: hasPortfolio
        ? "Rebalanceamento e relatório prontos para conversa."
        : "O plano depende de uma carteira cadastrada.",
      done: hasPortfolio,
      href: hasPortfolio ? `/clients/${clientId}/rebalance` : `/clients/${clientId}/operations`,
      icon: FileText,
      action: hasPortfolio ? "Abrir plano" : "Completar carteira",
    },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Fluxo recomendado</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ordem prática para transformar dados em uma conversa clara com o cliente.
          </p>
        </div>
        <Link
          href={`/clients/${clientId}/report`}
          className="rounded-md bg-ink-950 px-3 py-2 text-sm font-medium text-white hover:bg-ink-800"
        >
          Modo cliente
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.title}
              href={step.href}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 hover:border-brand-300 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-brand-900 ring-1 ring-slate-200">
                  <Icon size={17} />
                </div>
                {step.done ? (
                  <CheckCircle size={17} className="text-success-500" />
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-warn-500 ring-1 ring-amber-200">
                    pendente
                  </span>
                )}
              </div>
              <div className="mt-3 font-semibold text-slate-900">{step.title}</div>
              <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{step.description}</p>
              <div className="mt-3 text-xs font-medium text-brand-900">{step.action} →</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
