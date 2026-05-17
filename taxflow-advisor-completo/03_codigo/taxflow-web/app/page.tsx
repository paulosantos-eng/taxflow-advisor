import { CLIENTS, getOperationsForClient } from "@/lib/data/mock-clients";
import { runEngine, formatBRL } from "@/lib/tax-engine/engine";
import { ClientRow } from "@/components/client-row";
import { MetricCard } from "@/components/metric-card";
import { AlertTriangle, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

interface ClientSummary {
  id: string;
  aum: number;
  irProjected: number;
  status: "ok" | "warn" | "alert";
  statusText: string;
}

function summarize(): { perClient: Record<string, ClientSummary>; totals: { totalAum: number; totalIr: number; totalSaved: number; clientsWithAlert: number } } {
  const summaries: Record<string, ClientSummary> = {};
  let totalAum = 0;
  let totalIr = 0;
  let clientsWithAlert = 0;

  for (const c of CLIENTS) {
    const ops = getOperationsForClient(c.id);
    const result = runEngine(ops);
    const vehId = c.vehicles[0].id;
    let aum = 0;
    let irYear = 0;
    let irrf15270 = 0;
    let irpfmDue = 0;

    for (const pos of result.positions.values()) {
      if (pos.qty > 0) aum += pos.totalCostBrl;
    }
    for (const m of result.monthly.values()) {
      if (m.vehicleId !== vehId) continue;
      irYear += m.totalDarf6015 + m.irProgressive + m.jcpIrrf + m.irrf15270;
      irrf15270 += m.irrf15270;
    }
    const an = [...result.annual.values()].find(a => a.vehicleId === vehId);
    if (an) {
      irYear += an.exteriorIrBrl + an.irpfmDue;
      irpfmDue = an.irpfmDue;
    }

    let status: ClientSummary["status"] = "ok";
    let statusText = "Em dia";
    if (irpfmDue > 0) {
      status = "alert";
      statusText = `IRPFM ${formatBRL(irpfmDue)}`;
      clientsWithAlert++;
    } else if (irrf15270 > 0) {
      status = "warn";
      statusText = "Lei 15.270 acionada";
      clientsWithAlert++;
    }

    summaries[c.id] = { id: c.id, aum, irProjected: irYear, status, statusText };
    totalAum += aum;
    totalIr += irYear;
  }

  return { perClient: summaries, totals: { totalAum, totalIr, totalSaved: 1300000, clientsWithAlert } };
}

export default function DashboardPage() {
  const { perClient, totals } = summarize();
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão consolidada da base de clientes • {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* ALERTAS HOJE */}
      {totals.clientsWithAlert > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-warn-500">
            <AlertTriangle size={18} />
            <h2 className="font-semibold">Alertas que precisam de atenção</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <AlertCircle size={14} className="text-danger-500" />
              {totals.clientsWithAlert} {totals.clientsWithAlert === 1 ? "cliente exige" : "clientes exigem"} ação fiscal — IRPFM ou Lei 15.270 disparada
            </li>
            <li className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-warn-500" />
              Janela R$ 20k de isenção: revisar trimestralmente
            </li>
          </ul>
        </div>
      )}

      {/* MÉTRICAS DA BASE */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Clientes" value={String(CLIENTS.length)} hint="ativos" />
        <MetricCard
          label="AUM consolidado"
          value={formatBRL(totals.totalAum)}
          hint="patrimônio sob gestão"
        />
        <MetricCard
          label="IR projetado 2026"
          value={formatBRL(totals.totalIr)}
          hint="total das bases"
          emphasis="warn"
        />
        <MetricCard
          label="Economia gerada"
          value={formatBRL(totals.totalSaved)}
          hint="vs ano anterior (estimado)"
          emphasis="success"
          trend={
            <span className="inline-flex items-center gap-1 text-xs text-success-500">
              <TrendingUp size={12} /> +18,4% YoY
            </span>
          }
        />
      </div>

      {/* LISTA DE CLIENTES */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Clientes</h2>
          <div className="flex gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1">Todos ({CLIENTS.length})</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-warn-500">Atenção ({totals.clientsWithAlert})</span>
            <span className="rounded-full bg-success-50 px-2 py-1 text-success-500">Em dia ({CLIENTS.length - totals.clientsWithAlert})</span>
          </div>
        </div>
        <div>
          {CLIENTS.map((c) => {
            const s = perClient[c.id];
            return (
              <ClientRow
                key={c.id}
                client={c}
                aum={s.aum}
                irProjected={s.irProjected}
                status={s.status}
                statusText={s.statusText}
              />
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        TaxFlow Advisor • Demo navegável • Dados mock processados pelo Tax Engine TypeScript em tempo real
      </p>
    </div>
  );
}
