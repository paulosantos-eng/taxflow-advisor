"use client";

import { useState } from "react";
import { X, Building2, Globe, Shield, User } from "lucide-react";
import type { Vehicle, VehicleType } from "@/lib/tax-engine/types";
import { addCustomVehicle, generateVehicleId } from "@/lib/storage/local-storage";

interface Props {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded?: (v: Vehicle) => void;
}

const VEHICLE_TYPES: { type: VehicleType; label: string; icon: typeof Building2; description: string; country: string }[] = [
  {
    type: "HOLDING",
    label: "Holding patrimonial",
    icon: Building2,
    description: "PJ Lucro Presumido para deter imoveis/participacoes. Carga ~12% sobre receita.",
    country: "BR",
  },
  {
    type: "PJ_LR",
    label: "PJ Lucro Real",
    icon: Building2,
    description: "Empresa em regime de Lucro Real. Carga ate 34% sobre lucro liquido.",
    country: "BR",
  },
  {
    type: "PJ_LP",
    label: "PJ Lucro Presumido",
    icon: Building2,
    description: "Empresa em Presumido (servicos/comercio). Carga ~11-14% sobre receita bruta.",
    country: "BR",
  },
  {
    type: "OFFSHORE_OPACA",
    label: "Offshore (PIC opaca)",
    icon: Globe,
    description: "Personal Investment Company no exterior, regime opaco. 15% anual sobre lucro contabil.",
    country: "BVI",
  },
  {
    type: "OFFSHORE_TRANSPARENTE",
    label: "Offshore (PIC transparente)",
    icon: Globe,
    description: "PIC com regime transparente — tributa ativo a ativo como PF direto.",
    country: "BVI",
  },
  {
    type: "TRUST",
    label: "Trust",
    icon: Shield,
    description: "Trust com regime transparente (Lei 14.754). Tributacao como se ativos fossem do instituidor.",
    country: "BS",
  },
];

export function AddVehicleModal({ clientId, isOpen, onClose, onAdded }: Props) {
  const [selectedType, setSelectedType] = useState<VehicleType | null>(null);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("BR");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    const v: Vehicle = {
      id: generateVehicleId(clientId),
      clientId,
      type: selectedType,
      country,
    };
    addCustomVehicle(clientId, v);
    if (onAdded) onAdded(v);
    onClose();
    setSelectedType(null);
    setName("");
    setCountry("BR");
    // Recarrega a pagina para refletir
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-200 p-5">
          <h2 className="text-lg font-semibold text-ink-900">Adicionar veiculo</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-ink-500 hover:bg-ink-100"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-700">Tipo de veiculo</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {VEHICLE_TYPES.map((vt) => {
                const Icon = vt.icon;
                const selected = selectedType === vt.type;
                return (
                  <button
                    key={vt.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(vt.type);
                      setCountry(vt.country);
                    }}
                    className={`flex items-start gap-2 rounded-md border p-3 text-left text-xs transition ${
                      selected
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500"
                        : "border-ink-200 bg-white hover:bg-ink-50"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={`mt-0.5 flex-shrink-0 ${selected ? "text-brand-500" : "text-ink-500"}`}
                    />
                    <div>
                      <div className="font-medium text-ink-900">{vt.label}</div>
                      <div className="mt-0.5 text-[11px] text-ink-500">{vt.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700">
              Pais de domicilio do veiculo
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="BR">Brasil</option>
              <option value="BVI">Ilhas Virgens Britanicas</option>
              <option value="KY">Cayman</option>
              <option value="BS">Bahamas</option>
              <option value="DE">Delaware (EUA)</option>
              <option value="LU">Luxemburgo</option>
              <option value="OTHER">Outros</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedType}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              Adicionar veiculo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
