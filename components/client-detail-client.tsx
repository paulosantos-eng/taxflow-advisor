"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, User } from "lucide-react";
import { ClientActions } from "@/components/client-actions";
import { DecompositionAuditable } from "@/components/decomposition-auditable";
import { MetricCard } from "@/components/metric-card";
import { OpportunityCard } from "@/components/opportunity-card";
import { PositionsTable } from "@/components/positions-table";
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

interface Props {
  clientId: string;
}

interface ClientDetailState {
  client: Client;
  vehicle: Vehicle;
  operations: Operation[];
  result: EngineResult;
  positions: DetailedPosition[];
}

const YEAR = 2026;

export function ClientDetailClient({ clientId }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<ClientDetailState | null>(null);

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
        Carregando ficha do cliente...
      </div>
    );
  }

  if (!state) {
    return (
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={14} /> Voltar para clientes
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Cliente não encontrado</h1>
          <p className="mt-2 text-sm text-slate-500">
            Este ID não existe nos clientes demo nem nos clientes salvos neste navegador.
          </p>
          <Link
            href="/clients/new"
            className="mt-4 inline-flex rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Criar novo cliente
          </Link>
        </div>
      </div>
    );
  }

  const { client, vehicle, operations, result, positions } = state;
  const opportunities = findOpportunities(result, vehicle.id, YEAR);
  const events = listFiscalEvents(result, vehicle.id, YEAR);

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

  let darfTotal = 0;
  let irrf15270 = 0;
  let jcpIrrf = 0;
  let irProgressive = 0;
  for (const month of result.monthly.values()) {
    if (month.vehicleId !== vehicle.id) continue;
    darfTotal += month.totalDarf6015;
    irrf15270 += month.irrf15270;
    jcpIrrf += month.jcpIrrf;
    irProgressive += month.irProgressive;
  }

  const annual = [...result.annual.values()].find(
    (item) => item.vehicleId === vehicle.id && item.year === YEAR,
  );
  const exteriorIr = annual?.exteriorIrBrl ?? 0;
  const irpfmDue = annual?.irpfmDue ?? 0;
  const totalIr = darfTotal + irrf15270 + jcpIrrf + irProgressive + exteriorIr + irpfmDue;
  const idade = Math.floor(
    (Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000),
  );
  const gainHint =
    costAum > 0 ? `+${((unrealizedGain / costAum) * 100).toFixed(1)}% sobre custo` : "sem posições";
  const effectiveTax = marketAum > 0 ? ((totalIr / marketAum) * 100).toFixed(2) : "0,00";

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Voltar para clientes
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-950 text-xl font-semibold text-white">
              {client.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{client.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{idade} anos</span>
                <span>•</span>
                <span>CPF {client.cpf}</span>
                <span>•</span>
                <span>Residência fiscal: {client.residency}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {client.vehicles.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900 ring-1 ring-brand-200"
                  >
                    {item.type === "PF" ? <User size={12} /> : <Building2 size={12} />}
                    {vehicleLabel(item.type)}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  + Adicionar veículo (holding / offshore / trust)
                </span>
              </div>
            </div>
          </div>
          <ClientActions clientId={client.id} />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {vehicle.type === "PF" ? (
          <User size={16} className="text-brand-900" />
        ) : (
          <Building2 size={16} className="text-brand-900" />
        )}
        <h2 className="text-base font-semibold text-slate-900">{vehicleLabel(vehicle.type)}</h2>
        <span className="text-xs text-slate-400">(veículo principal usado nos cálculos)</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Patrimônio a mercado"
          value={formatBRL(marketAum)}
          hint={`custo: ${formatBRL(costAum)}`}
        />
        <MetricCard
          label="Ganho latente"
          value={formatBRL(unrealizedGain)}
          hint={gainHint}
          emphasis="success"
        />
        <MetricCard
          label="IR projetado 2026"
          value={formatBRL(totalIr)}
          hint="todas as fontes (DAA + DARFs)"
          emphasis="warn"
        />
        <MetricCard
          label="IR latente (se vender hoje)"
          value={formatBRL(latentTax)}
          hint="passivo escondido em ganhos não realizados"
          emphasis="danger"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Posições detalhadas</h2>
          <div className="text-xs text-slate-500">
            {positions.length} ativos • clique no grupo para expandir/recolher
          </div>
        </div>
        {positions.length > 0 ? (
          <PositionsTable positions={positions} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            <span>
              Sem posições financeiras cadastradas. Use os inputs mensais para pró-labore e
              dividendos, ou carregue uma carteira modelo em Operações.
            </span>
            <Link
              href={`/clients/${client.id}/operations`}
              className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Carregar carteira
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Decomposição do IR projetado</h2>
          <DecompositionAuditable
            items={[
              { kind: "darf_6015", label: "DARF 6015 (RV / FII)", value: darfTotal, hint: "Apuração mensal" },
              { kind: "ir_progressivo", label: "IR progressivo (pró-labore)", value: irProgressive, hint: "Tabela mensal" },
              { kind: "jcp_irrf", label: "JCP IRRF (15% definitivo)", value: jcpIrrf, hint: "Retido na fonte" },
              { kind: "irrf_lei_15270", label: "IRRF Lei 15.270 (10% > R$ 50k/mês)", value: irrf15270, hint: "Gatilho dividendos", alert: irrf15270 > 0 },
              { kind: "lei_14754_exterior", label: "Lei 14.754 (exterior anual)", value: exteriorIr, hint: "DAA anual, 15%" },
              { kind: "irpfm", label: "IRPFM (Lei 15.270 / tributação mínima)", value: irpfmDue, hint: "Anual em DAA", alert: irpfmDue > 0 },
            ]}
            total={totalIr}
            result={result}
            operations={operations}
            vehicleId={vehicle.id}
            year={YEAR}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Carga efetiva</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">% do patrimônio</div>
              <div className="mt-1 font-mono text-2xl font-bold tabular text-slate-900">
                {effectiveTax}%
              </div>
              <div className="text-xs text-slate-400">IR / patrimônio a mercado</div>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Carga 5 anos (projetada)
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tabular text-warn-500">
                {formatBRL(totalIr * 5)}
              </div>
              <div className="text-xs text-slate-400">Sem rebalanceamento</div>
            </div>
            <Link
              href={`/clients/${client.id}/rebalance`}
              className="block rounded-md bg-success-500 px-3 py-2 text-center text-sm font-medium text-white hover:bg-success-600"
            >
              Ver como reduzir →
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Oportunidades identificadas pelo engine
        </h2>
        {opportunities.length > 0 ? (
          <div className="space-y-3">
            {opportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opp={opportunity} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Sem oportunidades detectadas com os dados atuais.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-brand-900" />
          <h2 className="text-base font-semibold text-slate-900">Calendário fiscal 2026</h2>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">Sem eventos fiscais pendentes.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((event) => (
              <li key={event.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-md ${
                      event.kind === "darf"
                        ? "bg-blue-50 text-brand-900"
                        : event.kind === "trigger"
                          ? "bg-red-50 text-danger-500"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{event.description}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(event.date).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
                {event.amount !== undefined && (
                  <div className="font-mono text-sm font-semibold tabular text-slate-700">
                    {formatBRL(event.amount)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function vehicleLabel(type: Vehicle["type"]): string {
  const labels: Record<Vehicle["type"], string> = {
    PF: "Pessoa Física",
    PJ_LR: "PJ Lucro Real",
    PJ_LP: "PJ Lucro Presumido",
    HOLDING: "Holding",
    OFFSHORE_OPACA: "Offshore Opaca",
    OFFSHORE_TRANSPARENTE: "Offshore Transparente",
    TRUST: "Trust",
  };

  return labels[type] ?? type;
}
