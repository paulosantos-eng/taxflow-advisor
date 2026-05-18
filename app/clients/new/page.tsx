"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import {
  generateClientId,
  saveCustomClient,
  generateVehicleId,
  addCustomVehicle,
} from "@/lib/storage/local-storage";
import type { Client, Vehicle } from "@/lib/tax-engine/types";

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [residency, setResidency] = useState("BR");
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cpf.trim() || !birthDate) return;
    setSaving(true);
    const id = generateClientId();
    const pfVehicle: Vehicle = {
      id: generateVehicleId(id),
      clientId: id,
      type: "PF",
      country: "BR",
    };
    const client: Client = {
      id,
      name: name.trim(),
      cpf: cpf.trim(),
      birthDate,
      residency,
      vehicles: [pfVehicle],
    };
    saveCustomClient(client);
    addCustomVehicle(id, pfVehicle);
    router.push(`/clients/${id}`);
  };

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
      >
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Novo cliente</h1>
        <p className="mt-1 text-sm text-ink-500">
          Cadastre um cliente novo. Voce podera adicionar veiculos (holding, offshore, trust) e
          inserir operacoes na ficha do cliente.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-4 rounded-lg border border-ink-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-ink-700">Nome completo</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Pedro Almeida"
            className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-ink-700">CPF (mascarado)</label>
            <input
              type="text"
              required
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="***.***.***-XX"
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="mt-1 text-xs text-ink-400">Use mascara — dados sensiveis nao sao armazenados completos</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700">Data de nascimento</label>
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700">Residencia fiscal</label>
          <select
            value={residency}
            onChange={(e) => setResidency(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="BR">Brasil</option>
            <option value="PT">Portugal</option>
            <option value="US">Estados Unidos</option>
            <option value="UK">Reino Unido</option>
            <option value="OTHER">Outros</option>
          </select>
        </div>

        <div className="rounded-md bg-brand-50/40 border border-brand-200 p-3 text-xs text-ink-700">
          <strong className="text-brand-700">Veiculo PF criado automaticamente.</strong> Voce
          podera adicionar Holding, Offshore ou Trust depois na ficha do cliente.
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/"
            className="rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <UserPlus size={16} /> {saving ? "Criando..." : "Criar cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
