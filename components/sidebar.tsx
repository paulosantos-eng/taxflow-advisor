"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Users, Calendar, FileText, Settings, BarChart3 } from "lucide-react";

const NAV = [
  { href: "/", label: "Clientes", icon: Users },
  { href: "/calendar", label: "Calendário Fiscal", icon: Calendar, disabled: true },
  { href: "/reports", label: "Relatórios", icon: FileText, disabled: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, disabled: true },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col bg-ink-950 text-ink-200">
      <div className="flex h-14 items-center gap-2 border-b border-ink-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-white">
          <Calculator size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-white">TaxFlow</div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400">Advisor</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, disabled }) => {
            const active = path === href || (href !== "/" && path?.startsWith(href));
            return (
              <li key={href}>
                {disabled ? (
                  <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-500 cursor-not-allowed">
                    <Icon size={16} />
                    <span>{label}</span>
                    <span className="ml-auto rounded-full bg-ink-800 px-1.5 py-0.5 text-[9px] font-medium uppercase text-ink-400">
                      em breve
                    </span>
                  </div>
                ) : (
                  <Link
                    href={href}
                    className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition ${
                      active
                        ? "bg-brand-500 font-medium text-white"
                        : "text-ink-300 hover:bg-ink-800 hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-ink-800 px-2 py-3">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-400 hover:bg-ink-800 hover:text-white">
          <Settings size={16} />
          Configurações
        </button>
        <div className="mt-3 flex items-center gap-2 px-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
            R
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-white">Renato Silva</div>
            <div className="text-[10px] text-ink-400">renato@assessoria.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
