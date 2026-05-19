"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle, FileText, Printer, ShieldAlert, TrendingDown } from "lucide-react";
import {
  findOpportunities,
  formatBRL,
  getDetailedPositions,
  listFiscalEvents,
  runEngine,
  type DetailedPosition,
  type EngineResult,
} from "@/lib/tax-engine/engine";
import {
  getPrimaryVehicle,
  getRuntimeClient,
  getRuntimeOperations,
} from "@/lib/data/runtime-clients";
import type { Client, Operation, Vehicle } from "@/lib/tax-engine/types";

interface ReportState {
  client: Client;
  vehicle: Vehicle;
  operations: Operation[];
  result: EngineResult;
  positions: DetailedPosition[];
}

const YEAR = 2026;

export function ClientReportClient({ clientId }: { clientId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<ReportState | null>(null);

  useEffect(() => {
    const client = getRuntimeClient(clientId);
    const vehicle = client ? getPrimaryVehicle(client) : undefined;

    if (client && vehicle) {
      const operations = getRuntimeOperations(client, YEAR);
      const result = runEngine(operations);
      const positions = getDetailedPositions(result, vehicle.id);
      setState({ client, vehicle, operations, result, positions });
    } else {
      setState(null);
    }

    setLoaded(true);
  }, [clientId]);

  if (!loaded) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Montando relatório...
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Cliente não encontrado</h1>
        <Link href="/" className="mt-4 inline-flex text-sm font-medium text-brand-900">
          Voltar para clientes
        </Link>
      </div>
    );
  }

  const { client, vehicle, operations, result, positions } = state;
  const opportunities = findOpportunities(result, vehicle.id, YEAR);
  const events = listFiscalEvents(result, vehicle.id, YEAR).slice(0, 5);

  let costAum = 0;
  let marketAum = 0;
  let unrealizedGain = 0;
  let latentTax = 0;
  for (const position of positions) {
    costAum += position.costTotal;
    marketAum += position.currentValue;
    unrealizedGain += position.unrealizedGain;
    latentTax += position.potentialTaxIfSold;
  }

  let monthlyIr = 0;
  let irrf15270 = 0;
  for (const month of result.monthly.values()) {
    if (month.vehicleId !== vehicle.id) continue;
    monthlyIr += month.totalDarf6015 + month.irProgressive + month.jcpIrrf + month.irrf15270;
    irrf15270 += month.irrf15270;
  }

  const annual = [...result.annual.values()].find(
    (item) => item.vehicleId === vehicle.id && item.year === YEAR,
  );
  const exteriorIr = annual?.exteriorIrBrl ?? 0;
  const irpfmDue = annual?.irpfmDue ?? 0;
  const totalIr = monthlyIr + exteriorIr + irpfmDue;
  const effectiveTax = marketAum > 0 ? totalIr / marketAum : 0;
  const optimizedIrYear = totalIr * 0.88;
  const estimatedSaving5y = Math.max(0, (totalIr - optimizedIrYear) * 5);

  const topClasses = summarizeClasses(positions).slice(0, 5);
  const riskNotes = [
    irrf15270 > 0
      ? "Dividendos acima de R$ 50 mil no mês acionaram retenção da Lei 15.270."
      : "Não há gatilho de dividendos acima de R$ 50 mil nos dados atuais.",
    irpfmDue > 0
      ? "A renda anual entrou na faixa de tributação mínima da Lei 15.270."
      : "IRPFM não aparece como imposto adicional neste cenário.",
    exteriorIr > 0
      ? "Ativos no exterior geram apuração anual pela Lei 14.754."
      : "Sem imposto anual relevante de exterior nos dados atuais.",
  ];

  return (
    <div className="space-y-6 print:bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={14} /> Voltar para ficha
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/clients/${client.id}/rebalance`}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Abrir rebalanceamento
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800"
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-900 ring-1 ring-brand-200">
              <FileText size={14} /> Relatório executivo
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {client.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Visão em linguagem direta: patrimônio, imposto projetado, riscos tributários e
              próximos movimentos recomendados para 2026.
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>Ano-calendário {YEAR}</div>
            <div>{new Date().toLocaleDateString("pt-BR")}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <ReportMetric label="Patrimônio" value={formatBRL(marketAum)} hint={`custo ${formatBRL(costAum)}`} />
          <ReportMetric label="Ganho não realizado" value={formatBRL(unrealizedGain)} tone="success" hint="ainda não virou imposto" />
          <ReportMetric label="IR projetado" value={formatBRL(totalIr)} tone="warn" hint={`${(effectiveTax * 100).toFixed(2)}% do patrimônio`} />
          <ReportMetric label="Economia 5 anos" value={formatBRL(estimatedSaving5y)} tone="success" hint="estimativa tax-aware" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-success-500" />
            <h2 className="font-semibold text-slate-900">O que fazer agora</h2>
          </div>
          <div className="mt-4 space-y-3">
            {opportunities.length > 0 ? (
              opportunities.slice(0, 4).map((opportunity) => (
                <div key={opportunity.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{opportunity.title}</div>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{opportunity.description}</p>
                    </div>
                    {opportunity.estimatedSavingBrl !== undefined && (
                      <div className="font-mono text-sm font-semibold text-success-500">
                        {formatBRL(opportunity.estimatedSavingBrl)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma oportunidade automática foi detectada. Complete os dados de carteira e renda
                para aumentar a precisão do diagnóstico.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-warn-500" />
            <h2 className="font-semibold text-slate-900">Pontos de atenção</h2>
          </div>
          <ul className="mt-4 space-y-3">
            {riskNotes.map((note) => (
              <li key={note} className="flex gap-2 text-sm leading-5 text-slate-600">
                <CheckCircle size={15} className="mt-0.5 shrink-0 text-brand-900" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-md border border-red-100 bg-red-50 p-3">
            <div className="text-xs uppercase tracking-wide text-danger-500">IR se zerar hoje</div>
            <div className="mt-1 font-mono text-xl font-semibold text-danger-500">
              {formatBRL(latentTax)}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Composição da carteira</h2>
          <div className="mt-4 space-y-4">
            {topClasses.length > 0 ? (
              topClasses.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-mono tabular text-slate-600">
                      {(item.pct * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${item.pct * 100}%` }} />
                  </div>
                  <div className="mt-1 text-right font-mono text-xs text-slate-500">
                    {formatBRL(item.value)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sem carteira cadastrada.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-900" />
            <h2 className="font-semibold text-slate-900">Próximos eventos fiscais</h2>
          </div>
          {events.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{event.description}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(event.date).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  {event.amount !== undefined && (
                    <div className="font-mono text-sm font-semibold text-slate-700">
                      {formatBRL(event.amount)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Sem eventos fiscais pendentes.</p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Qualidade dos dados usados no cálculo</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <DataQualityItem label="Operações processadas" value={String(operations.length)} ok={operations.length > 0} />
          <DataQualityItem label="Ativos em carteira" value={String(positions.length)} ok={positions.length > 0} />
          <DataQualityItem label="Veículo calculado" value={vehicle.type} ok />
          <DataQualityItem label="Ano-base" value={String(YEAR)} ok />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500 shadow-sm">
        Este relatório é uma simulação para apoio à decisão do consultor. Antes de executar
        operações, valide dados de custódia, notas de corretagem, informes e interpretação
        tributária aplicável ao caso concreto.
      </section>
    </div>
  );
}

function ReportMetric({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "success" | "warn";
}) {
  const toneClass = {
    default: "text-slate-950",
    success: "text-success-500",
    warn: "text-warn-500",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 font-mono text-xl font-semibold tabular ${toneClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function DataQualityItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            ok ? "bg-success-50 text-success-500" : "bg-amber-50 text-warn-500"
          }`}
        >
          {ok ? "ok" : "pendente"}
        </span>
      </div>
      <div className="mt-2 font-mono text-lg font-semibold tabular text-slate-900">{value}</div>
    </div>
  );
}

function summarizeClasses(positions: DetailedPosition[]) {
  const total = positions.reduce((sum, position) => sum + position.currentValue, 0);
  const byClass = new Map<string, number>();
  for (const position of positions) {
    byClass.set(position.classLabel, (byClass.get(position.classLabel) ?? 0) + position.currentValue);
  }

  return [...byClass.entries()]
    .map(([label, value]) => ({ label, value, pct: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}
