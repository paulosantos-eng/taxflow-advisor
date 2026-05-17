import { TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/tax-engine/engine";

interface Props {
  baselineIrYear: number;
  optimizedIrYear: number;
  baselineIr5y: number;
  optimizedIr5y: number;
  patrimonio: number;
}

export function SavingsProjection({
  baselineIrYear,
  optimizedIrYear,
  baselineIr5y,
  optimizedIr5y,
  patrimonio,
}: Props) {
  const savingYear = baselineIrYear - optimizedIrYear;
  const saving5y = baselineIr5y - optimizedIr5y;
  const savingPct = baselineIr5y > 0 ? (saving5y / baselineIr5y) * 100 : 0;

  return (
    <div className="rounded-lg border border-success-500/30 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={20} className="text-success-500" />
        <h2 className="font-semibold text-slate-900">Projeção de economia com rebalanceamento tax-aware</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Big number — economia em 5 anos */}
        <div className="md:col-span-1 flex flex-col justify-center rounded-md bg-white p-5 ring-1 ring-success-500/20">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Economia projetada em 5 anos
          </div>
          <div className="mt-2 font-mono text-3xl font-bold tabular text-success-500">
            {formatBRL(saving5y)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-success-500">
            <TrendingDown size={12} />
            <span>{savingPct.toFixed(1)}% menos imposto</span>
          </div>
        </div>

        {/* Side by side — ano corrente */}
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Sem rebalancear (1 ano)
            </div>
            <div className="mt-2 font-mono text-xl font-semibold tabular text-slate-900">
              {formatBRL(baselineIrYear)}
            </div>
            <div className="mt-1 text-xs text-slate-400">IR projetado</div>
          </div>
          <div className="rounded-md border border-success-500/30 bg-emerald-50/40 p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-success-500">
              Com tax-otimização (1 ano)
            </div>
            <div className="mt-2 font-mono text-xl font-semibold tabular text-success-500">
              {formatBRL(optimizedIrYear)}
            </div>
            <div className="mt-1 text-xs text-success-500">
              economia: {formatBRL(savingYear)}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Sem rebalancear (5 anos)
            </div>
            <div className="mt-2 font-mono text-xl font-semibold tabular text-slate-900">
              {formatBRL(baselineIr5y)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {((baselineIr5y / patrimonio) * 100).toFixed(1)}% do patrimônio
            </div>
          </div>
          <div className="rounded-md border border-success-500/30 bg-emerald-50/40 p-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-success-500">
              Com tax-otimização (5 anos)
            </div>
            <div className="mt-2 font-mono text-xl font-semibold tabular text-success-500">
              {formatBRL(optimizedIr5y)}
            </div>
            <div className="mt-1 text-xs text-success-500">
              {((optimizedIr5y / patrimonio) * 100).toFixed(1)}% do patrimônio
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
        <strong className="text-slate-900">Como é calculado:</strong> a economia projetada considera (a) uso eficiente da janela de R$ 20k/mês em swing de ações, (b) tax-loss harvesting em FII com prejuízo latente, (c) priorização de ativos isentos (LCI/LCA/debêntures incentivadas) sobre RF tributada quando equivalente, (d) timing de distribuição de dividendos PJ para evitar gatilho da Lei 15.270, (e) migração para UCITS no exterior em vez de ETF americano (redução de carga em dividendos).
      </div>
    </div>
  );
}
