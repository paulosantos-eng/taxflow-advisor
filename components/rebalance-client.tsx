"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle, Lightbulb, Minus, ShieldCheck } from "lucide-react";
import { OptimizerPanel } from "@/components/optimizer-panel";
import { SavingsProjection } from "@/components/savings-projection";
import {
  computeAllocation,
  formatBRL,
  formatPercent,
  getDetailedPositions,
  runEngine,
  type DetailedPosition,
  type EngineResult,
} from "@/lib/tax-engine/engine";
import {
  getPrimaryVehicle,
  getRuntimeClient,
  getRuntimeOperations,
} from "@/lib/data/runtime-clients";
import { optimize } from "@/lib/tax-engine/optimizer/optimizer";
import {
  clampToPolicy,
  isInsidePolicy,
  resolveInvestorPolicy,
  type InvestorPolicy,
} from "@/lib/tax-engine/investor-profile";
import type { Client, Operation, Vehicle } from "@/lib/tax-engine/types";

interface Props {
  clientId: string;
}

interface RebalanceState {
  client: Client;
  vehicle: Vehicle;
  operations: Operation[];
  result: EngineResult;
  positions: DetailedPosition[];
}

type ProposedAllocation = {
  classLabel: string;
  totalBrl: number;
  pct: number;
  targetPct: number;
  targetBrl: number;
  delta: number;
};

const YEAR = 2026;

const TARGETS: Record<string, Record<string, number>> = {
  cli_joao: {
    "Ações BR": 0.18,
    "ETF RV BR": 0.05,
    "FII / Fiagro": 0.20,
    "Renda Fixa Trib.": 0.20,
    "Renda Fixa Isenta": 0.15,
    Exterior: 0.22,
  },
  cli_marina: {
    "Ações BR": 0.10,
    "FII / Fiagro": 0.18,
    "Renda Fixa Trib.": 0.30,
    "Renda Fixa Isenta": 0.20,
    Exterior: 0.22,
  },
  cli_roberto: {
    "FII / Fiagro": 0.20,
    "Renda Fixa Trib.": 0.40,
    "Renda Fixa Isenta": 0.30,
    Exterior: 0.10,
  },
};

function resolveTargets(clientId: string, operations: Operation[]): Record<string, number> {
  if (TARGETS[clientId]) return TARGETS[clientId];

  const templateOperation = operations.find((operation) => operation.id.startsWith("template_"));
  if (!templateOperation) return {};

  if (templateOperation.id.startsWith("template_joao_")) return TARGETS.cli_joao;
  if (templateOperation.id.startsWith("template_marina_")) return TARGETS.cli_marina;
  if (templateOperation.id.startsWith("template_roberto_")) return TARGETS.cli_roberto;

  return {};
}

export function RebalanceClient({ clientId }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<RebalanceState | null>(null);

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
        Carregando rebalanceador...
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
            Este cliente não existe nos dados demo nem nos dados salvos neste navegador.
          </p>
        </div>
      </div>
    );
  }

  const { client, vehicle, operations, result, positions } = state;
  const current = computeAllocation(result, vehicle.id);
  const targets = resolveTargets(client.id, operations);
  const policy = resolveInvestorPolicy(client.id, operations);
  const totalAum = positions.reduce((sum, position) => sum + position.currentValue, 0);

  if (totalAum <= 0 || positions.length === 0) {
    return (
      <div className="space-y-6">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={14} /> {client.name}
        </Link>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Rebalanceador tax-aware
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            O rebalanceador precisa de posições financeiras para calcular operações e custo fiscal.
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Sem carteira para rebalancear</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Este cliente já pode receber inputs mensais e veículos, mas ainda não possui operações
            de compra/venda ou posições de ativos. Cadastre posições ou importe operações antes de
            gerar uma proposta de rebalanceamento.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href={`/clients/${client.id}/input`}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Abrir inputs mensais
            </Link>
            <Link
              href={`/clients/${client.id}`}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Voltar para ficha
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allocationLabels = Array.from(
    new Set([...current.map((item) => item.classLabel), ...Object.keys(targets)]),
  );

  const proposed: ProposedAllocation[] = allocationLabels.map((classLabel) => {
    const item = current.find((allocation) => allocation.classLabel === classLabel) ?? {
      classLabel,
      totalBrl: 0,
      pct: 0,
    };
    const rawTargetPct = targets[classLabel] ?? item.pct;
    const targetPct = clampToPolicy(classLabel, rawTargetPct, policy);
    const targetBrl = totalAum * targetPct;
    const delta = targetBrl - item.totalBrl;
    return { ...item, targetPct, targetBrl, delta };
  }).sort((a, b) => b.totalBrl - a.totalBrl);

  const currentOutOfPolicy = current.filter(
    (item) => !isInsidePolicy(item.classLabel, item.pct, policy),
  );
  const proposedOutOfPolicy = proposed.filter(
    (item) => !isInsidePolicy(item.classLabel, item.targetPct, policy),
  );

  const operationSuggestions: Array<{
    action: "Vender" | "Comprar";
    asset: string;
    assetName: string;
    classLabel: string;
    valueBrl: number;
    taxCost: number;
    rationale: string;
  }> = [];

  for (const item of proposed) {
    if (item.delta < -1000) {
      const classPositions = positions
        .filter((position) => position.classLabel === item.classLabel)
        .sort((a, b) => a.potentialTaxIfSold - b.potentialTaxIfSold);
      let remaining = Math.abs(item.delta);

      for (const position of classPositions) {
        if (remaining <= 0) break;
        const sellValue = Math.min(remaining, position.currentValue);
        const taxCost =
          position.currentValue > 0
            ? (sellValue / position.currentValue) * position.potentialTaxIfSold
            : 0;
        operationSuggestions.push({
          action: "Vender",
          asset: position.asset.code,
          assetName: position.asset.name,
          classLabel: item.classLabel,
          valueBrl: sellValue,
          taxCost,
          rationale:
            position.potentialTaxIfSold < 100
              ? "lote com ganho latente baixo — IR mínimo"
              : `IR estimado ${formatBRL(taxCost)}`,
        });
        remaining -= sellValue;
      }
    }

    if (item.delta > 1000) {
      operationSuggestions.push({
        action: "Comprar",
        asset: "—",
        assetName: `Aporte em ${item.classLabel}`,
        classLabel: item.classLabel,
        valueBrl: item.delta,
        taxCost: 0,
        rationale: "sem fato gerador na compra",
      });
    }
  }

  const totalTaxCost = operationSuggestions.reduce((sum, operation) => sum + operation.taxCost, 0);
  const totalSells = operationSuggestions
    .filter((operation) => operation.action === "Vender")
    .reduce((sum, operation) => sum + operation.valueBrl, 0);
  const totalBuys = operationSuggestions
    .filter((operation) => operation.action === "Comprar")
    .reduce((sum, operation) => sum + operation.valueBrl, 0);

  let baselineIrYear = 0;
  for (const month of result.monthly.values()) {
    if (month.vehicleId !== vehicle.id) continue;
    baselineIrYear += month.totalDarf6015 + month.irProgressive + month.jcpIrrf + month.irrf15270;
  }
  const annual = [...result.annual.values()].find(
    (item) => item.vehicleId === vehicle.id && item.year === YEAR,
  );
  if (annual) baselineIrYear += annual.exteriorIrBrl + annual.irpfmDue;

  const optimizedIrYear = baselineIrYear * 0.88;
  const baselineIr5y = baselineIrYear * 5;
  const optimizedIr5y = optimizedIrYear * 5;

  return (
    <div className="space-y-6">
      <Link
        href={`/clients/${client.id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> {client.name}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Rebalanceador tax-aware
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Alocação atual vs proposta com cálculo de IR por operação.
        </p>
      </div>

      <SavingsProjection
        baselineIrYear={baselineIrYear}
        optimizedIrYear={optimizedIrYear}
        baselineIr5y={baselineIr5y}
        optimizedIr5y={optimizedIr5y}
        patrimonio={totalAum}
      />

      <PolicyPanel
        policy={policy}
        proposed={proposed}
        currentOutOfPolicy={currentOutOfPolicy.length}
        proposedOutOfPolicy={proposedOutOfPolicy.length}
      />

      <AllocationComparisonChart proposed={proposed} />

      <OptimizerPanel result={optimize({ result, vehicleId: vehicle.id, year: YEAR })} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Alocação atual</h2>
          <ul className="space-y-3">
            {current.map((item) => (
              <li key={item.classLabel} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.classLabel}</span>
                <div className="flex items-center gap-3 font-mono tabular">
                  <span className="text-slate-900">{formatPercent(item.pct)}</span>
                  <span className="text-slate-500">{formatBRL(item.totalBrl)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-brand-900">Alocação proposta (tax-aware)</h2>
          <ul className="space-y-3">
            {proposed.map((item) => {
              const Icon = item.delta < -100 ? ArrowDown : item.delta > 100 ? ArrowUp : Minus;
              const color =
                item.delta < -100
                  ? "text-danger-500"
                  : item.delta > 100
                    ? "text-success-500"
                    : "text-slate-400";
              return (
                <li key={item.classLabel} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.classLabel}</span>
                  <div className="flex items-center gap-3 font-mono tabular">
                    <span className="text-slate-900">{formatPercent(item.targetPct)}</span>
                    <span className={`inline-flex items-center gap-1 ${color}`}>
                      <Icon size={12} />
                      {item.delta >= 0 ? "+" : ""}
                      {formatBRL(item.delta)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Operações sugeridas (por ativo)</h2>
          <div className="text-xs text-slate-500">
            Vendas: {formatBRL(totalSells)} • Compras: {formatBRL(totalBuys)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="pb-2">Operação</th>
                <th className="pb-2">Ativo</th>
                <th className="pb-2">Classe</th>
                <th className="pb-2 text-right">Valor</th>
                <th className="pb-2 text-right">IR estimado</th>
                <th className="pb-2">Racional</th>
              </tr>
            </thead>
            <tbody>
              {operationSuggestions.map((operation, index) => (
                <tr key={`${operation.action}-${operation.asset}-${index}`} className="border-b border-slate-100">
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        operation.action === "Vender"
                          ? "bg-red-50 text-danger-500"
                          : "bg-success-50 text-success-500"
                      }`}
                    >
                      {operation.action}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="font-mono text-sm font-medium text-slate-900">
                      {operation.asset}
                    </div>
                    <div className="text-xs text-slate-500">{operation.assetName}</div>
                  </td>
                  <td className="py-3 text-xs text-slate-700">{operation.classLabel}</td>
                  <td className="py-3 text-right font-mono tabular">{formatBRL(operation.valueBrl)}</td>
                  <td
                    className={`py-3 text-right font-mono tabular ${
                      operation.taxCost > 0 ? "text-warn-500" : "text-slate-400"
                    }`}
                  >
                    {operation.taxCost > 0 ? formatBRL(operation.taxCost) : "—"}
                  </td>
                  <td className="py-3 text-xs text-slate-500">{operation.rationale}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={4} className="py-3 text-right">
                  Total custo fiscal das vendas:
                </td>
                <td className="py-3 text-right font-mono tabular text-warn-500">
                  {formatBRL(totalTaxCost)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Lightbulb size={20} className="mt-0.5 text-warn-500" />
          <div>
            <h3 className="font-semibold text-warn-500">Alertas táticos do otimizador</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li>
                • Dividir vendas de ações em meses consecutivos para usar janela R$ 20k de isenção
                em swing — pode economizar até {formatBRL(totalAum * 0.001)} extras.
              </li>
              <li>
                • Em RF: priorizar deb. incentivadas, LCI e LCA (isentas PF) em vez de CDB /
                Tesouro Selic comum.
              </li>
              <li>
                • No exterior: migrar VOO → CSPX (UCITS irlandês) reduz carga em dividendos de
                ~40% para ~28% por tratado Irlanda-EUA.
              </li>
              <li>
                • FIIs com ganho latente baixo são candidatos a venda preferencial — priorize
                harvesting de prejuízos antes de realizar ganhos relevantes.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href={`/clients/${client.id}`}
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>
        <button className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
          Aplicar operações
        </button>
      </div>
    </div>
  );
}

function PolicyPanel({
  policy,
  proposed,
  currentOutOfPolicy,
  proposedOutOfPolicy,
}: {
  policy: InvestorPolicy;
  proposed: ProposedAllocation[];
  currentOutOfPolicy: number;
  proposedOutOfPolicy: number;
}) {
  const StatusIcon = proposedOutOfPolicy === 0 ? CheckCircle : AlertTriangle;
  const statusClass =
    proposedOutOfPolicy === 0
      ? "border-success-500 bg-success-50 text-success-500"
      : "border-danger-500 bg-red-50 text-danger-500";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-900" />
            <h2 className="font-semibold text-slate-900">Perfil e política de investimento</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">{policy.description}</p>
          <p className="mt-1 text-xs text-slate-400">{policy.riskNote}</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${statusClass}`}>
          <StatusIcon size={16} />
          {proposedOutOfPolicy === 0 ? "Proposta dentro do perfil" : "Proposta fora do perfil"}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <MiniStat label="Perfil" value={policy.label} />
        <MiniStat label="Fora da faixa hoje" value={String(currentOutOfPolicy)} tone={currentOutOfPolicy > 0 ? "warn" : "ok"} />
        <MiniStat label="Fora da faixa proposto" value={String(proposedOutOfPolicy)} tone={proposedOutOfPolicy > 0 ? "danger" : "ok"} />
      </div>

      <div className="mt-5 space-y-4">
        {proposed.map((item) => {
          const band = policy.bands[item.classLabel];
          const currentInside = isInsidePolicy(item.classLabel, item.pct, policy);
          const targetInside = isInsidePolicy(item.classLabel, item.targetPct, policy);
          return (
            <div key={item.classLabel} className="grid grid-cols-1 gap-2 lg:grid-cols-[160px_1fr_180px] lg:items-center">
              <div>
                <div className="text-sm font-medium text-slate-800">{item.classLabel}</div>
                <div className="text-xs text-slate-400">
                  {band
                    ? `Faixa ${formatPercent(band.min)} a ${formatPercent(band.max)}`
                    : "Sem faixa específica"}
                </div>
              </div>

              <div className="relative h-8 rounded-md bg-slate-100">
                {band && (
                  <div
                    className="absolute top-2 h-4 rounded bg-brand-100"
                    style={{
                      left: `${toTrackPct(band.min)}%`,
                      width: `${Math.max(2, toTrackPct(band.max) - toTrackPct(band.min))}%`,
                    }}
                  />
                )}
                <div
                  className={`absolute top-1 h-6 w-1.5 rounded ${currentInside ? "bg-slate-700" : "bg-danger-500"}`}
                  style={{ left: `calc(${toTrackPct(item.pct)}% - 3px)` }}
                  title="Atual"
                />
                <div
                  className={`absolute top-1 h-6 w-1.5 rounded ${targetInside ? "bg-success-500" : "bg-danger-500"}`}
                  style={{ left: `calc(${toTrackPct(item.targetPct)}% - 3px)` }}
                  title="Proposto"
                />
              </div>

              <div className="flex justify-between gap-3 font-mono text-xs tabular lg:justify-end">
                <span className={currentInside ? "text-slate-700" : "font-semibold text-danger-500"}>
                  atual {formatPercent(item.pct)}
                </span>
                <span className={targetInside ? "font-semibold text-success-500" : "font-semibold text-danger-500"}>
                  alvo {formatPercent(item.targetPct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-1.5 rounded bg-slate-700" /> Atual
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-1.5 rounded bg-success-500" /> Proposto
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-6 rounded bg-brand-100" /> Faixa permitida
        </span>
      </div>
    </div>
  );
}

function AllocationComparisonChart({ proposed }: { proposed: ProposedAllocation[] }) {
  const rows = proposed.filter(
    (item) => item.totalBrl > 0 || item.targetBrl > 0 || Math.abs(item.delta) > 100,
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Mapa visual do rebalanceamento</h2>
          <p className="mt-1 text-sm text-slate-500">
            A barra cinza mostra a carteira atual. A barra verde mostra o alvo proposto depois da
            otimização tributária e do limite de perfil.
          </p>
        </div>
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-5 rounded bg-slate-300" /> Atual
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-5 rounded bg-success-500" /> Alvo
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {rows.map((item) => {
          const deltaTone =
            item.delta < -100
              ? "text-danger-500"
              : item.delta > 100
                ? "text-success-500"
                : "text-slate-500";

          return (
            <div key={item.classLabel} className="grid grid-cols-1 gap-2 lg:grid-cols-[150px_1fr_180px] lg:items-center">
              <div>
                <div className="text-sm font-medium text-slate-800">{item.classLabel}</div>
                <div className={`mt-0.5 font-mono text-xs font-semibold tabular ${deltaTone}`}>
                  {item.delta >= 0 ? "+" : ""}
                  {formatBRL(item.delta)}
                </div>
              </div>

              <div className="space-y-2">
                <ComparisonBar label="Atual" pct={item.pct} color="bg-slate-300" />
                <ComparisonBar label="Alvo" pct={item.targetPct} color="bg-success-500" />
              </div>

              <div className="flex justify-between gap-4 font-mono text-xs tabular text-slate-600 lg:justify-end">
                <span>{formatPercent(item.pct)}</span>
                <span className="font-semibold text-success-500">{formatPercent(item.targetPct)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="grid grid-cols-[40px_1fr] items-center gap-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn" | "danger";
}) {
  const toneClass = {
    default: "text-slate-900",
    ok: "text-success-500",
    warn: "text-warn-500",
    danger: "text-danger-500",
  }[tone];

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold tabular ${toneClass}`}>{value}</div>
    </div>
  );
}

function toTrackPct(value: number): number {
  return Math.min(100, Math.max(0, value * 100));
}
