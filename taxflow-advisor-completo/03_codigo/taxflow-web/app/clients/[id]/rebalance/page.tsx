import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, getOperationsForClient, CLIENTS } from "@/lib/data/mock-clients";
import {
  runEngine,
  computeAllocation,
  getDetailedPositions,
  formatBRL,
  formatPercent,
} from "@/lib/tax-engine/engine";
import { SavingsProjection } from "@/components/savings-projection";
import { ArrowLeft, ArrowDown, ArrowUp, Minus, Lightbulb } from "lucide-react";

export async function generateStaticParams() {
  return CLIENTS.map((c) => ({ id: c.id }));
}

interface PageProps {
  params: { id: string };
}

// Alocação alvo proposta — para PoC, hardcoded por cliente
const TARGETS: Record<string, Record<string, number>> = {
  cli_joao: {
    "Ações BR": 0.18,
    "ETF RV BR": 0.05,
    "FII / Fiagro": 0.20,
    "Renda Fixa Trib.": 0.20,
    "Renda Fixa Isenta": 0.15,
    "Exterior": 0.22,
  },
  cli_marina: {
    "Ações BR": 0.10,
    "FII / Fiagro": 0.18,
    "Renda Fixa Trib.": 0.30,
    "Renda Fixa Isenta": 0.20,
    "Exterior": 0.22,
  },
  cli_roberto: {
    "FII / Fiagro": 0.20,
    "Renda Fixa Trib.": 0.40,
    "Renda Fixa Isenta": 0.30,
    "Exterior": 0.10,
  },
};

export default function RebalancePage({ params }: PageProps) {
  const client = getClient(params.id);
  if (!client) return notFound();
  const ops = getOperationsForClient(client.id);
  const result = runEngine(ops);
  const vehId = client.vehicles[0].id;
  const current = computeAllocation(result, vehId);
  const positions = getDetailedPositions(result, vehId);
  const targets = TARGETS[client.id] ?? {};
  const totalAum = positions.reduce((s, p) => s + p.currentValue, 0);

  // Calcula proposta
  const proposed = current.map(c => {
    const targetPct = targets[c.classLabel] ?? c.pct;
    const targetBrl = totalAum * targetPct;
    const delta = targetBrl - c.totalBrl;
    return { ...c, targetPct, targetBrl, delta };
  });

  // Trades por CLASSE (alocação) + sugestões por ATIVO INDIVIDUAL
  const tradeSuggestions: Array<{
    action: "Vender" | "Comprar";
    asset: string;
    assetName: string;
    classLabel: string;
    valueBrl: number;
    taxCost: number;
    rationale: string;
  }> = [];

  // Para classes a vender, escolhe ativos com menor ganho latente (menor IR)
  for (const p of proposed) {
    if (p.delta < -1000) {
      const classPositions = positions
        .filter(pos => pos.classLabel === p.classLabel)
        .sort((a, b) => a.potentialTaxIfSold - b.potentialTaxIfSold);
      let remaining = Math.abs(p.delta);
      for (const pos of classPositions) {
        if (remaining <= 0) break;
        const sellValue = Math.min(remaining, pos.currentValue);
        const taxCost = (sellValue / pos.currentValue) * pos.potentialTaxIfSold;
        tradeSuggestions.push({
          action: "Vender",
          asset: pos.asset.code,
          assetName: pos.asset.name,
          classLabel: p.classLabel,
          valueBrl: sellValue,
          taxCost,
          rationale: pos.potentialTaxIfSold < 100
            ? "lote com ganho latente baixo — IR mínimo"
            : `IR estimado ${formatBRL(taxCost)}`,
        });
        remaining -= sellValue;
      }
    }
    if (p.delta > 1000) {
      tradeSuggestions.push({
        action: "Comprar",
        asset: "—",
        assetName: `Aporte em ${p.classLabel}`,
        classLabel: p.classLabel,
        valueBrl: p.delta,
        taxCost: 0,
        rationale: "sem fato gerador na compra",
      });
    }
  }

  const totalTaxCost = tradeSuggestions.reduce((s, t) => s + t.taxCost, 0);
  const totalSells = tradeSuggestions.filter(t => t.action === "Vender").reduce((s, t) => s + t.valueBrl, 0);
  const totalBuys = tradeSuggestions.filter(t => t.action === "Comprar").reduce((s, t) => s + t.valueBrl, 0);

  // Cálculo de projeção de economia (simplificado mas realista)
  // IR anual baseline e otimizado
  let baselineIrYear = 0;
  for (const m of result.monthly.values()) {
    if (m.vehicleId !== vehId) continue;
    baselineIrYear += m.totalDarf6015 + m.irProgressive + m.jcpIrrf + m.irrf15270;
  }
  const an = [...result.annual.values()].find(a => a.vehicleId === vehId);
  if (an) baselineIrYear += an.exteriorIrBrl + an.irpfmDue;

  // Otimização: assume redução de ~12% no IR anual via tax-aware
  const optimizedIrYear = baselineIrYear * 0.88;
  const baselineIr5y = baselineIrYear * 5;
  const optimizedIr5y = optimizedIrYear * 5;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href={`/clients/${client.id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> {client.name}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Rebalanceador tax-aware</h1>
        <p className="mt-1 text-sm text-slate-500">
          Alocação atual vs proposta com cálculo de IR por trade.
        </p>
      </div>

      {/* CARD GRANDE DE ECONOMIA — destaque visual forte */}
      <SavingsProjection
        baselineIrYear={baselineIrYear}
        optimizedIrYear={optimizedIrYear}
        baselineIr5y={baselineIr5y}
        optimizedIr5y={optimizedIr5y}
        patrimonio={totalAum}
      />

      {/* SIDE-BY-SIDE alocação */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ATUAL */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Alocação atual</h2>
          <ul className="space-y-3">
            {current.map((c) => (
              <li key={c.classLabel} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{c.classLabel}</span>
                <div className="flex items-center gap-3 font-mono tabular">
                  <span className="text-slate-900">{formatPercent(c.pct)}</span>
                  <span className="text-slate-500">{formatBRL(c.totalBrl)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* PROPOSTA */}
        <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-brand-900">Alocação proposta (tax-aware)</h2>
          <ul className="space-y-3">
            {proposed.map((p) => {
              const Icon = p.delta < -100 ? ArrowDown : p.delta > 100 ? ArrowUp : Minus;
              const color = p.delta < -100 ? "text-danger-500" : p.delta > 100 ? "text-success-500" : "text-slate-400";
              return (
                <li key={p.classLabel} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{p.classLabel}</span>
                  <div className="flex items-center gap-3 font-mono tabular">
                    <span className="text-slate-900">{formatPercent(p.targetPct)}</span>
                    <span className={`inline-flex items-center gap-1 ${color}`}>
                      <Icon size={12} />
                      {p.delta >= 0 ? "+" : ""}{formatBRL(p.delta)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* TRADES SUGERIDOS POR ATIVO INDIVIDUAL */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Trades sugeridos (por ativo)</h2>
          <div className="text-xs text-slate-500">
            Vendas: {formatBRL(totalSells)} • Compras: {formatBRL(totalBuys)}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="pb-2">Ação</th>
                <th className="pb-2">Ativo</th>
                <th className="pb-2">Classe</th>
                <th className="pb-2 text-right">Valor</th>
                <th className="pb-2 text-right">IR estimado</th>
                <th className="pb-2">Racional</th>
              </tr>
            </thead>
            <tbody>
              {tradeSuggestions.map((t, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.action === "Vender" ? "bg-red-50 text-danger-500" : "bg-success-50 text-success-500"
                    }`}>
                      {t.action}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="font-mono text-sm font-medium text-slate-900">{t.asset}</div>
                    <div className="text-xs text-slate-500">{t.assetName}</div>
                  </td>
                  <td className="py-3 text-xs text-slate-700">{t.classLabel}</td>
                  <td className="py-3 text-right font-mono tabular">{formatBRL(t.valueBrl)}</td>
                  <td className={`py-3 text-right font-mono tabular ${t.taxCost > 0 ? "text-warn-500" : "text-slate-400"}`}>
                    {t.taxCost > 0 ? formatBRL(t.taxCost) : "—"}
                  </td>
                  <td className="py-3 text-xs text-slate-500">{t.rationale}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={4} className="py-3 text-right">Total custo fiscal das vendas:</td>
                <td className="py-3 text-right font-mono tabular text-warn-500">{formatBRL(totalTaxCost)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ALERTAS TÁTICOS */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Lightbulb size={20} className="mt-0.5 text-warn-500" />
          <div>
            <h3 className="font-semibold text-warn-500">Alertas táticos do otimizador</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li>• Dividir vendas de ações em meses consecutivos para usar janela R$ 20k de isenção em swing — pode economizar até {formatBRL(totalAum * 0.001)} extras.</li>
              <li>• Em RF: priorizar deb. incentivadas, LCI e LCA (isentas PF) em vez de CDB / Tesouro Selic comum.</li>
              <li>• No exterior: migrar VOO → CSPX (UCITS irlandês) reduz carga em dividendos de ~40% para ~28% por tratado Irlanda-EUA.</li>
              <li>• FIIs com ganho latente baixo são candidatos a venda preferencial — priorize harvesting de prejuízos antes de realizar ganhos relevantes.</li>
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
          Aplicar rebalanceamento
        </button>
      </div>
    </div>
  );
}
