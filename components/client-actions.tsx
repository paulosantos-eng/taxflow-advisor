"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, FileText, Edit3, Plus, ListPlus } from "lucide-react";
import { AddVehicleModal } from "./add-vehicle-modal";

interface Props {
  clientId: string;
}

export function ClientActions({ clientId }: Props) {
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/clients/${clientId}/rebalance`}
          className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Calculator size={16} /> Rebalancear
        </Link>
        <Link
          href={`/clients/${clientId}/input`}
          className="inline-flex items-center gap-2 rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          <Edit3 size={16} /> Inputs mensais
        </Link>
        <Link
          href={`/clients/${clientId}/operations`}
          className="inline-flex items-center gap-2 rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          <ListPlus size={16} /> Operações
        </Link>
        <button
          onClick={() => setVehicleModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          <Plus size={16} /> Adicionar veiculo
        </button>
        <Link
          href={`/clients/${clientId}/report`}
          className="inline-flex items-center gap-2 rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          <FileText size={16} /> Relatório
        </Link>
      </div>

      <AddVehicleModal
        clientId={clientId}
        isOpen={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
      />
    </>
  );
}
