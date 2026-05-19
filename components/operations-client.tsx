"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { ASSET_CATALOG, getAssetByCode } from "@/lib/data/asset-catalog";
import {
  getPrimaryVehicle,
  getRuntimeClient,
  isMockClient,
} from "@/lib/data/runtime-clients";
import {
  buildPortfolioTemplateOperations,
  PORTFOLIO_TEMPLATES,
  type PortfolioTemplateId,
} from "@/lib/data/portfolio-templates";
import { getCustomOperations, saveCustomOperations } from "@/lib/storage/local-storage";
import { formatBRL } from "@/lib/tax-engine/engine";
import type { Client, Operation, OperationType } from "@/lib/tax-engine/types";

const OPERATION_TYPES: Array<{ value: OperationType; label: string }> = [
  { value: "compra", label: "Compra" },
  { value: "venda_swing", label: "Venda swing" },
  { value: "rendimento_fii", label: "Rendimento FII" },
  { value: "cupom_rf", label: "Cupom RF" },
  { value: "dividendo", label: "Dividendo" },
  { value: "jcp", label: "JCP" },
  { value: "aplicacao_fundo", label: "Aplicação em fundo" },
  { value: "resgate_fundo", label: "Resgate de fundo" },
  { value: "come_cotas", label: "Come-cotas" },
];

function operationLabel(type: OperationType): string {
  return OPERATION_TYPES.find((item) => item.value === type)?.label ?? type;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatOperationValue(value: number, currency: string): string {
  if (currency === "BRL") return formatBRL(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function OperationsClient({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [assetCode, setAssetCode] = useState(ASSET_CATALOG[0].code);
  const [type, setType] = useState<OperationType>("compra");
  const [date, setDate] = useState(todayIso());
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [costs, setCosts] = useState("");
  const [ptax, setPtax] = useState("");
  const [payerCnpj, setPayerCnpj] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setClient(getRuntimeClient(clientId) ?? null);
    setOperations(getCustomOperations(clientId));
  }, [clientId]);

  const vehicle = client ? getPrimaryVehicle(client) : undefined;
  const mockClient = isMockClient(clientId);
  const selectedAsset = getAssetByCode(assetCode) ?? ASSET_CATALOG[0];
  const isForeign = selectedAsset.currency !== "BRL";
  const computedTotal = useMemo(() => {
    const numericQty = Number(qty);
    const numericUnitPrice = Number(unitPrice);
    if (numericQty > 0 && numericUnitPrice > 0) return numericQty * numericUnitPrice;
    return Number(totalValue) || 0;
  }, [qty, totalValue, unitPrice]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!vehicle || !selectedAsset) return;

    const numericQty = Number(qty) || 1;
    const numericTotal = Number(totalValue) || computedTotal;
    if (!date || numericTotal <= 0) return;

    const op: Operation = {
      id: `manual_${clientId}_${Date.now().toString(36)}`,
      vehicleId: vehicle.id,
      asset: selectedAsset,
      type,
      date,
      qty: ["compra", "venda_swing"].includes(type) ? numericQty : undefined,
      unitPrice: Number(unitPrice) || undefined,
      totalValue: numericTotal,
      costs: Number(costs) || undefined,
      ptax: Number(ptax) || undefined,
      payerCnpj: payerCnpj.trim() || undefined,
    };

    const next = [...operations, op];
    setOperations(next);
    saveCustomOperations(clientId, next);
    setSaved(true);
    setTotalValue("");
    setUnitPrice("");
    setCosts("");
    setPayerCnpj("");
    setTimeout(() => setSaved(false), 1800);
  };

  const deleteOperation = (operationId: string) => {
    const next = operations.filter((operation) => operation.id !== operationId);
    setOperations(next);
    saveCustomOperations(clientId, next);
  };

  const applyTemplate = (templateId: PortfolioTemplateId) => {
    if (!vehicle) return;
    if (
      operations.length > 0 &&
      !confirm("Substituir as operações manuais atuais por esta carteira modelo?")
    ) {
      return;
    }

    const next = buildPortfolioTemplateOperations(templateId, clientId, vehicle.id);
    setOperations(next);
    saveCustomOperations(clientId, next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  if (!client) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Cliente não encontrado</h1>
        <Link href="/" className="mt-4 inline-flex text-sm font-medium text-brand-900">
          Voltar para clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Voltar para ficha do cliente
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Operações manuais</h1>
          <p className="mt-1 text-sm text-slate-500">
            {client.name} • {vehicle?.type ?? "Sem veículo"} • operações salvas no navegador
          </p>
        </div>
        <button
          onClick={() => router.push(`/clients/${clientId}`)}
          className="rounded-md bg-success-500 px-4 py-2 text-sm font-medium text-white hover:bg-success-600"
        >
          Ver impacto
        </button>
      </div>

      {!mockClient ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-brand-900">Carregar carteira modelo</h2>
              <p className="mt-1 text-sm text-slate-600">
                Use um perfil pronto para transformar um cliente vazio em uma demonstração completa.
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-900 ring-1 ring-brand-200">
              substitui operações manuais
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {PORTFOLIO_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template.id)}
                className="rounded-lg border border-brand-200 bg-white p-4 text-left shadow-sm hover:border-brand-500 hover:bg-white"
              >
                <div className="font-semibold text-slate-900">{template.title}</div>
                <div className="mt-1 text-sm text-brand-900">{template.subtitle}</div>
                <div className="mt-2 text-xs leading-5 text-slate-500">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Este cliente de demonstração já possui uma carteira completa. Operações adicionadas aqui
          serão tratadas como ajustes manuais extras.
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Ativo</label>
            <select
              value={assetCode}
              onChange={(event) => setAssetCode(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {ASSET_CATALOG.map((asset) => (
                <option key={asset.code} value={asset.code}>
                  {asset.code} - {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Operação</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as OperationType)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {OPERATION_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Data</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Quantidade</label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Preço unitário</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              placeholder="0,00"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Valor total</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalValue}
              onChange={(event) => setTotalValue(event.target.value)}
              placeholder={computedTotal > 0 ? String(computedTotal.toFixed(2)) : "0,00"}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Custos</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costs}
              onChange={(event) => setCosts(event.target.value)}
              placeholder="Corretagem"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">PTAX</label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={ptax}
              onChange={(event) => setPtax(event.target.value)}
              placeholder={isForeign ? "Ex: 5.20" : "BRL"}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">CNPJ fonte</label>
            <input
              type="text"
              value={payerCnpj}
              onChange={(event) => setPayerCnpj(event.target.value)}
              placeholder="Dividendos/JCP"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={!vehicle}
            className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <Save size={16} /> {saved ? "Salvo" : "Salvar operação"}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Operações salvas</h2>
          <span className="text-xs text-slate-500">{operations.length} manual(is)</span>
        </div>

        {operations.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            Nenhuma operação manual cadastrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Operação</th>
                  <th className="px-4 py-3">Ativo</th>
                  <th className="px-4 py-3 text-right">Quantidade</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {[...operations].reverse().map((operation) => (
                  <tr key={operation.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {new Date(`${operation.date}T00:00:00`).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{operationLabel(operation.type)}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium text-slate-900">{operation.asset.code}</div>
                      <div className="text-xs text-slate-500">{operation.asset.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-slate-700">
                      {operation.qty ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-slate-900">
                      {formatOperationValue(operation.totalValue, operation.asset.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteOperation(operation.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-red-50 hover:text-danger-500"
                      >
                        <Trash2 size={12} /> Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
