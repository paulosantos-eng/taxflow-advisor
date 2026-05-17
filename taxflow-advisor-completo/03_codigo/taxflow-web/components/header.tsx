import Link from "next/link";
import { Calculator, Bell, Search, User } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-900 text-white">
            <Calculator size={18} />
          </div>
          <span className="font-semibold tracking-tight">TaxFlow Advisor</span>
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Demo
          </span>
        </Link>
        <div className="flex items-center gap-3 text-slate-500">
          <button className="rounded-md p-2 hover:bg-slate-100" aria-label="Buscar">
            <Search size={18} />
          </button>
          <button className="rounded-md p-2 hover:bg-slate-100" aria-label="Notificações">
            <Bell size={18} />
          </button>
          <button className="rounded-md p-2 hover:bg-slate-100" aria-label="Perfil">
            <User size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
