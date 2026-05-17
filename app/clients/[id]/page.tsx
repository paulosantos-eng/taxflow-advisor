import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, getOperationsForClient, CLIENTS } from "@/lib/data/mock-clients";
import {
  runEngine,
  findOpportunities,
  listFiscalEvents,
  formatBRL,
  getDetailedPositions,
} from "@/lib/tax-engine/engine";
import { MetricCard } from "@/components/metric-card";
import { PositionsTable } from "@/components/positions-table";
import { OpportunityCard } from "@/components/opportunity-card";
import { ArrowLeft, Calculator, Calendar, FileText, User, Building2 } from "lucide-react";

export async function generateStaticParams() {
  return CLIENTS.map((c) => ({ id: c.id }));
}

interface PageProps {
  params: { id: string };
}

export default function ClientPage({ params }: PageProps) {
  const client = getClient(params.id);
  if (!client) return notFound();
  const ops = getOperationsForClient(client.id);
  const result = runEngine(ops);
  const vehId = client.vehicles[0].id;
  const opportunities = findOpportunities(result, vehId, 2026);
  const positions = getDetailedPositions(result, vehId);
  const events = listFiscalEvents(result, vehId, 2026);

  // Métricas
  let costAum = 0;
  let marketAum = 0;
  let unrealizedGain = 0;
  let latentTax = 0;
  for (const p of positions) {
    costAum += p.costTotal;
    marketAum += p.currentValue;
    unrealizedGain += p.unrealizedGain;
    latentTax += p.potentialTaxIfSold;
  }
  let darfTotal = 0;
  let irrf15270 = 0;
  let jcpIrrf = 0;
  let irProgressive = 0;
  for (const m of result.monthly.values()) {
    if (m.vehicleId !== vehId) continue;
    darfTotal += m.totalDarf6015;
    irrf15270 += m.irrf15270;
    jcpIrrf += m.jcpIrrf;
    irProgressive += m.irProgressive;
  }
  const annual = [...result.annual.values()].find((a) => a.vehicleId === vehId);
  const exteriorIr = annual?.exteriorIrBrl ?? 0;
  const irpfmDue = annual?.irpfmDue ?? 0;
  const totalIr = darfTotal + irrf15270 + jcpIrrf + irProgressive + exteriorIr + irpfmDue;

  const idade = Math.floor((Date.now() - new Date(client.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Voltar para clientes
      </Link>

      {/* Header do cliente */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-950 text-xl font-semibold text-white">
              {client.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
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
                {client.vehicles.map((v) => (
                  <span key={v.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900 ring-1 ring-brand-200">
                    {v.type === "PF" ? <User size={12} /> : <Building2 size={12} />}
                    {v.type === "PF" ? "Pessoa Física" : v.type}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                  + Adicionar veículo (holding / offshore / trust)
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/clients/${client.id}/rebalance`}
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Calculator size={16} /> Rebalancear
            </Link>
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <FileText size={16} /> Relatório
            </button>
          </div>
        </div>
      </div>

      {/* Sub-header: Veículo PF */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <User size={16} className="text-brand-900" />
        <h2 className="text-base font-semibold text-slate-900">Pessoa Física</h2>
        <span className="text-xs text-slate-400">(único veículo neste cliente)</span>
      </div>

      {/* Métricas - 4 colunas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Patrimônio a mercado"
          value={formatBRL(marketAum)}
          hint={`custo: ${formatBRL(costAum)}`}
        />
        <MetricCard
          label="Ganho latente"
          value={formatBRL(unrealizedGain)}
          hint={`+${((unrealizedGain / costAum) * 100).toFixed(1)}% sobre custo`}
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

      {/* Posições detalhadas — DETALHE DE CLASSES e ATIVOS INDIVIDUAIS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Posições detalhadas</h2>
          <div className="text-xs text-slate-500">
            {positions.length} ativos • clique no grupo para expandir/recolher
          </div>
        </div>
        <PositionsTable positions={positions} />
      </div>

      {/* Painel principal — 2 colunas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Decomposição do IR */}
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Decomposição do IR projetado</h2>
          <dl className="space-y-2 text-sm">
            <Line label="DARF 6015 (RV / FII)" value={darfTotal} hint="Apuração mensal" />
            <Line label="IR progressivo (pró-labore)" value={irProgressive} hint="Tabela mensal" />
            <Line label="JCP IRRF (15% definitivo)" value={jcpIrrf} hint="Retido na fonte" />
            <Line label="IRRF Lei 15.270 (10% > R$ 50k/mês)" value={irrf15270} alert={irrf15270 > 0} hint="Gatilho dividendos" />
            <Line label="Lei 14.754 (exterior anual)" value={exteriorIr} hint="DAA anual, 15%" />
            <Line label="IRPFM (Lei 15.270 / tributação mínima)" value={irpfmDue} alert={irpfmDue > 0} hint="Anual em DAA" />
            <div className="mt-3 border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Total IR 2026</span>
              <span className="font-mono text-lg font-bold tabular text-slate-900">{formatBRL(totalIr)}</span>
            </div>
          </dl>
        </div>

        {/* Carga efetiva */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Carga efetiva</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">% do patrimônio</div>
              <div className="mt-1 font-mono text-2xl font-bold tabular text-slate-900">
                {((totalIr / marketAum) * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-slate-400">IR / patrimônio a mercado</div>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Carga 5 anos (projetada)</div>
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

      {/* Oportunidades */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Oportunidades identificadas pelo engine</h2>
        <div className="space-y-3">
          {opportunities.map((o) => (
            <OpportunityCard key={o.id} opp={o} />
          ))}
        </div>
      </div>

      {/* Calendário fiscal — eventos */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-brand-900" />
          <h2 className="text-base font-semibold text-slate-900">Calendário fiscal 2026</h2>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">Sem eventos fiscais pendentes.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md ${
                    ev.kind === "darf" ? "bg-blue-50 text-brand-900" :
                    ev.kind === "trigger" ? "bg-red-50 text-danger-500" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{ev.description}</div>
                    <div className="text-xs text-slate-500">{new Date(ev.date).toLocaleDateString("pt-BR")}</div>
                  </div>
                </div>
                {ev.amount !== undefined && (
                  <div className="font-mono text-sm tabular font-semibold text-slate-700">{formatBRL(ev.amount)}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Line({ label, value, alert, hint }: { label: string; value: number; alert?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <dt className="text-slate-700">{label}</dt>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      <dd className={`font-mono tabular ${alert ? "text-danger-500 font-semibold" : "text-slate-900"}`}>
        {formatBRL(value)}
      </dd>
    </div>
  );
}
