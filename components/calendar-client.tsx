"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Filter,
  Scale,
} from "lucide-react";
import { getRuntimeFiscalEvents, type RuntimeFiscalEvent } from "@/lib/data/runtime-clients";
import { formatBRL } from "@/lib/tax-engine/engine";
import {
  getFixedFiscalCalendar,
  type CalendarLayer,
  type CalendarPriority,
} from "@/lib/tax-engine/fiscal-calendar";
import type { FiscalEvent } from "@/lib/tax-engine/types";

type CalendarItem = {
  id: string;
  date: string;
  layer: CalendarLayer;
  kind: FiscalEvent["kind"];
  title: string;
  description: string;
  priority: CalendarPriority;
  source: string;
  amount?: number;
  clientId?: string;
  clientName?: string;
  statusText?: string;
};

const MONTHS = [
  { value: "all", label: "Todos os meses" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const LAYERS: Array<{ value: "all" | CalendarLayer; label: string }> = [
  { value: "all", label: "Todas as camadas" },
  { value: "engine", label: "Calculado" },
  { value: "legal", label: "Agenda legal" },
  { value: "advisor", label: "Tarefas" },
];

const KINDS: Array<{ value: "all" | FiscalEvent["kind"]; label: string }> = [
  { value: "all", label: "Todos os tipos" },
  { value: "darf", label: "DARF" },
  { value: "trigger", label: "Gatilhos" },
  { value: "comeCotas", label: "Come-cotas" },
  { value: "venc", label: "Vencimentos" },
  { value: "dividend", label: "Dividendos" },
];

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function kindLabel(kind: FiscalEvent["kind"]): string {
  switch (kind) {
    case "darf":
      return "DARF";
    case "trigger":
      return "Gatilho";
    case "comeCotas":
      return "Come-cotas";
    case "venc":
      return "Vencimento";
    case "dividend":
      return "Dividendo";
  }
}

function layerLabel(layer: CalendarLayer): string {
  switch (layer) {
    case "engine":
      return "Calculado";
    case "legal":
      return "Agenda legal";
    case "advisor":
      return "Tarefa";
  }
}

function layerClass(layer: CalendarLayer): string {
  switch (layer) {
    case "engine":
      return "bg-blue-50 text-brand-900 ring-blue-100";
    case "legal":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "advisor":
      return "bg-success-50 text-success-500 ring-success-100";
  }
}

function kindClass(kind: FiscalEvent["kind"]): string {
  switch (kind) {
    case "trigger":
      return "bg-red-50 text-danger-500 ring-red-100";
    case "darf":
      return "bg-blue-50 text-brand-900 ring-blue-100";
    case "comeCotas":
      return "bg-amber-50 text-warn-500 ring-amber-100";
    case "venc":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "dividend":
      return "bg-success-50 text-success-500 ring-success-100";
  }
}

function priorityClass(priority: CalendarPriority): string {
  switch (priority) {
    case "high":
      return "border-l-danger-500";
    case "warn":
      return "border-l-warn-500";
    case "normal":
      return "border-l-slate-200";
  }
}

function eventIcon(kind: FiscalEvent["kind"], layer: CalendarLayer) {
  if (layer === "advisor") return ClipboardCheck;
  if (layer === "legal") return Scale;
  if (kind === "trigger") return AlertTriangle;
  if (kind === "darf") return Banknote;
  if (kind === "venc") return Clock3;
  return CalendarDays;
}

function normalizeEngineEvent(event: RuntimeFiscalEvent): CalendarItem {
  return {
    id: event.id,
    date: event.date,
    layer: "engine",
    kind: event.kind,
    title: event.description,
    description: event.statusText,
    priority: event.kind === "trigger" ? "high" : "warn",
    source: "Tax engine",
    amount: event.amount,
    clientId: event.clientId,
    clientName: event.clientName,
    statusText: event.statusText,
  };
}

export function CalendarClient() {
  const [engineEvents, setEngineEvents] = useState<RuntimeFiscalEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [month, setMonth] = useState("all");
  const [kind, setKind] = useState<"all" | FiscalEvent["kind"]>("all");
  const [layer, setLayer] = useState<"all" | CalendarLayer>("all");

  useEffect(() => {
    setEngineEvents(getRuntimeFiscalEvents(2026));
    setLoaded(true);
  }, []);

  const items = useMemo<CalendarItem[]>(() => {
    const calculated = engineEvents.map(normalizeEngineEvent);
    const fixed = getFixedFiscalCalendar(2026).map((event) => ({
      ...event,
      amount: undefined,
    }));

    return [...calculated, ...fixed].sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [engineEvents]);

  const filteredItems = useMemo(() => {
    return items.filter((event) => {
      const eventMonth = String(Number(event.date.slice(5, 7)));
      const monthMatches = month === "all" || eventMonth === month;
      const kindMatches = kind === "all" || event.kind === kind;
      const layerMatches = layer === "all" || event.layer === layer;
      return monthMatches && kindMatches && layerMatches;
    });
  }, [items, kind, layer, month]);

  const calculatedAmount = items
    .filter((item) => item.layer === "engine")
    .reduce((sum, event) => sum + (event.amount ?? 0), 0);
  const clientCount = new Set(items.filter((item) => item.clientId).map((item) => item.clientId)).size;
  const legalCount = items.filter((item) => item.layer === "legal").length;
  const highCount = items.filter((item) => item.priority === "high").length;
  const nextItem = items.find((event) => event.date >= new Date().toISOString().slice(0, 10));

  if (!loaded) return <div className="p-6 text-sm text-slate-500">Carregando calendário...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Calendário Fiscal Global
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ano-calendário 2026 com eventos calculados, obrigações fixas e tarefas do consultor.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <CalendarDays size={16} className="text-brand-900" />
          {nextItem ? `Próximo: ${formatDate(nextItem.date)}` : "Sem próximos eventos"}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Calculado" value={formatBRL(calculatedAmount)} hint="eventos do engine" tone="warn" />
        <SummaryCard label="Clientes" value={String(clientCount)} hint="com evento calculado" />
        <SummaryCard label="Agenda legal" value={String(legalCount)} hint="obrigações fixas" />
        <SummaryCard
          label="Alta prioridade"
          value={String(highCount)}
          hint="IRPFM, Lei 15.270 e fechamento"
          tone={highCount > 0 ? "danger" : "success"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter size={16} className="text-slate-500" />
          Filtros
        </div>
        <select
          value={layer}
          onChange={(event) => setLayer(event.target.value as "all" | CalendarLayer)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {LAYERS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {MONTHS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as "all" | FiscalEvent["kind"])}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {KINDS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Eventos fiscais</h2>
          <span className="text-xs text-slate-500">
            {filteredItems.length} de {items.length} eventos
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            Nenhum evento encontrado para os filtros atuais.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Camada</th>
                  <th className="px-4 py-3">Escopo</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((event) => {
                  const Icon = eventIcon(event.kind, event.layer);
                  return (
                    <tr key={event.id} className={`border-b border-l-4 border-b-slate-100 last:border-b-0 ${priorityClass(event.priority)}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular text-slate-700">
                        {formatDate(event.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${layerClass(event.layer)}`}>
                          <Icon size={12} />
                          {layerLabel(event.layer)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{event.clientName ?? event.source}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{event.statusText ?? event.source}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${kindClass(event.kind)}`}>
                          {kindLabel(event.kind)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{event.title}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{event.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular text-slate-900">
                        {event.amount !== undefined ? formatBRL(event.amount) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {event.clientId ? (
                          <Link
                            href={`/clients/${event.clientId}`}
                            className="text-xs font-medium text-brand-900 hover:text-brand-600"
                          >
                            Abrir cliente
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warn" | "danger" | "success";
}) {
  const toneClass = {
    default: "text-slate-900",
    warn: "text-warn-500",
    danger: "text-danger-500",
    success: "text-success-500",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-bold tabular ${toneClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </div>
  );
}
