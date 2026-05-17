"use client";

import Link from "next/link";
import { Client } from "@/lib/tax-engine/types";
import { formatBRL } from "@/lib/tax-engine/engine";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface ClientRowProps {
  client: Client;
  aum: number;
  irProjected: number;
  status: "ok" | "warn" | "alert";
  statusText: string;
}

export function ClientRow({ client, aum, irProjected, status, statusText }: ClientRowProps) {
  const statusConfig = {
    ok: { icon: CheckCircle, color: "text-success-500", bg: "bg-success-50" },
    warn: { icon: AlertTriangle, color: "text-warn-500", bg: "bg-amber-50" },
    alert: { icon: AlertCircle, color: "text-danger-500", bg: "bg-red-50" },
  };
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Link
      href={`/clients/${client.id}`}
      className="flex items-center justify-between border-b border-slate-100 px-4 py-3 hover:bg-slate-50"
    >
      <div className="flex flex-1 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-900 font-medium">
          {client.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
        </div>
        <div>
          <div className="font-medium text-slate-900">{client.name}</div>
          <div className="text-xs text-slate-500">{client.cpf} • {client.residency}</div>
        </div>
      </div>
      <div className="hidden flex-1 text-right md:block">
        <div className="font-mono text-sm tabular text-slate-900">{formatBRL(aum)}</div>
        <div className="text-xs text-slate-500">patrimônio</div>
      </div>
      <div className="hidden flex-1 text-right md:block">
        <div className="font-mono text-sm tabular text-slate-900">{formatBRL(irProjected)}</div>
        <div className="text-xs text-slate-500">IR projetado 2026</div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        <Icon size={16} className={config.color} />
        <span className={`text-sm ${config.color}`}>{statusText}</span>
      </div>
    </Link>
  );
}
