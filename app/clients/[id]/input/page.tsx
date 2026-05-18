"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";
import {
  getMonthlyInputs,
  saveMonthlyInputs,
  type MonthlyInput,
  type MonthlyInputs,
} from "@/lib/storage/local-storage";

const MONTHS = [
  { num: 1, label: "Jan" },
  { num: 2, label: "Fev" },
  { num: 3, label: "Mar" },
  { num: 4, label: "Abr" },
  { num: 5, label: "Mai" },
  { num: 6, label: "Jun" },
  { num: 7, label: "Jul" },
  { num: 8, label: "Ago" },
  { num: 9, label: "Set" },
  { num: 10, label: "Out" },
  { num: 11, label: "Nov" },
  { num: 12, label: "Dez" },
];

const ROW_TYPES = [
  {
    key: "proLabore" as const,
    label: "Pro-labore",
    hint: "Remuneracao mensal recebida da PJ propria",
  },
  {
    key: "dividendoPjPropria" as const,
    label: "Dividendos PJ propria",
    hint: "Lei 15.270: >R$ 50k/mes mesma fonte dispara IRRF 10%",
    highlight: true,
  },
  {
    key: "outrosRendimentos" as const,
    label: "Outros rendimentos",
    hint: "Aluguel, honorarios, etc.",
  },
];

export default function MonthlyInputPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params.id as string;

  const [inputs, setInputs] = useState<MonthlyInputs>({});
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInputs(getMonthlyInputs(clientId));
    setLoaded(true);
  }, [clientId]);

  const updateCell = (month: number, key: keyof MonthlyInput, value: number) => {
    setInputs((prev) => {
      const current = prev[month] ?? {
        proLabore: 0,
        dividendoPjPropria: 0,
        outrosRendimentos: 0,
      };
      return {
        ...prev,
        [month]: { ...current, [key]: value },
      };
    });
    setSaved(false);
  };

  const handleSave = () => {
    saveMonthlyInputs(clientId, inputs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm("Limpar todos os valores?")) {
      setInputs({});
      saveMonthlyInputs(clientId, {});
    }
  };

  const totalRow = (key: keyof MonthlyInput) => {
    return Object.values(inputs).reduce((sum, m) => sum + (m[key] ?? 0), 0);
  };

  // Detecta meses que disparariam Lei 15.270 (>R$ 50k/mes em dividendos PJ propria)
  const disparoMonths: number[] = [];
  for (let m = 1; m <= 12; m++) {
    if ((inputs[m]?.dividendoPjPropria ?? 0) > 50000) disparoMonths.push(m);
  }

  if (!loaded) return <div className="p-6">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
      >
        <ArrowLeft size={14} /> Voltar para ficha do cliente
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Grade de input mensal — 2026
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Insira os valores mes a mes. Engine recalcula em tempo real ao salvar.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
          >
            <RefreshCw size={14} /> Limpar
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Save size={14} /> {saved ? "Salvo!" : "Salvar"}
          </button>
        </div>
      </div>

      {disparoMonths.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-ink-700">
          <strong className="text-warn-500">Alerta Lei 15.270:</strong> dividendos PJ propria
          ultrapassam R$ 50k/mes em {disparoMonths.length} mes(es) ({disparoMonths.map(m => MONTHS[m-1].label).join(", ")}). IRRF de 10% sera retido sobre o total desses meses.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50">
              <th className="sticky left-0 z-10 bg-ink-50 px-3 py-2 text-left font-semibold uppercase tracking-wider text-ink-500">
                Categoria
              </th>
              {MONTHS.map((m) => (
                <th key={m.num} className="px-2 py-2 text-center font-semibold uppercase tracking-wider text-ink-500">
                  {m.label}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider text-ink-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {ROW_TYPES.map((row) => (
              <tr key={row.key} className="border-b border-ink-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-2">
                  <div className="font-medium text-ink-900">{row.label}</div>
                  <div className="text-[10px] text-ink-400">{row.hint}</div>
                </td>
                {MONTHS.map((m) => {
                  const val = inputs[m.num]?.[row.key] ?? 0;
                  const isOver50k = row.key === "dividendoPjPropria" && val > 50000;
                  return (
                    <td key={m.num} className="px-1 py-1">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={val || ""}
                        onChange={(e) =>
                          updateCell(m.num, row.key, parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className={`w-full rounded border px-2 py-1 text-right font-mono tabular text-xs focus:outline-none focus:ring-1 ${
                          isOver50k
                            ? "border-danger-500 bg-red-50 text-danger-500 focus:ring-danger-500"
                            : "border-ink-200 text-ink-900 focus:border-brand-500 focus:ring-brand-500"
                        }`}
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-mono tabular text-sm font-semibold text-ink-900">
                  {totalRow(row.key) > 0
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        maximumFractionDigits: 0,
                      }).format(totalRow(row.key))
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md bg-brand-50/40 border border-brand-200 p-4 text-sm text-ink-700">
        <strong className="text-brand-700">Como funciona:</strong> os valores que voce insere aqui
        sao convertidos em operacoes que o tax engine processa. Depois de salvar, volte para a
        ficha do cliente para ver o impacto recalculado (IR projetado, IRPFM, alertas).
      </div>

      <div className="flex justify-end">
        <Link
          href={`/clients/${clientId}`}
          className="rounded-md bg-success-500 px-4 py-2 text-sm font-medium text-white hover:bg-success-600"
        >
          Voltar e ver impacto do calculo →
        </Link>
      </div>
    </div>
  );
}
