"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, TrendingUp, UserPlus } from "lucide-react";
import { ClientRow } from "@/components/client-row";
import { MetricCard } from "@/components/metric-card";
import { formatBRL } from "@/lib/tax-engine/engine";
import { summarizeRuntimeClients } from "@/lib/data/runtime-clients";

type DashboardData = ReturnType<typeof summarizeRuntimeClients>;

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    setData(summarizeRuntimeClients());
  }, []);

  if (!data) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Carregando base de clientes...
      </div>
    );
  }

  const { rows, totals } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visão consolidada da base de clientes • {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <UserPlus size={16} /> Novo cliente
        </Link>
      </div>

      {totals.clientsWithAlert > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-warn-500">
            <AlertTriangle size={18} />
            <h2 className="font-semibold">Alertas que precisam de atenção</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <AlertCircle size={14} className="text-danger-500" />
              {totals.clientsWithAlert}{" "}
              {totals.clientsWithAlert === 1 ? "cliente exige" : "clientes exigem"} ação
              fiscal — IRPFM ou Lei 15.270 disparada
            </li>
            <li className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-warn-500" />
              Janela R$ 20k de isenção: revisar trimestralmente
            </li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Clientes" value={String(rows.length)} hint="ativos" />
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

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Clientes</h2>
          <div className="flex gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1">Todos ({rows.length})</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-warn-500">
              Atenção ({totals.clientsWithAlert})
            </span>
            <span className="rounded-full bg-success-50 px-2 py-1 text-success-500">
              Em dia ({rows.length - totals.clientsWithAlert})
            </span>
          </div>
        </div>
        <div>
          {rows.map(({ client, summary }) => (
            <ClientRow
              key={client.id}
              client={client}
              aum={summary.aum}
              irProjected={summary.irProjected}
              status={summary.status}
              statusText={summary.statusText}
            />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        TaxFlow Advisor • Demo navegável • Dados mock e clientes custom processados pelo Tax
        Engine TypeScript em tempo real
      </p>
    </div>
  );
}
