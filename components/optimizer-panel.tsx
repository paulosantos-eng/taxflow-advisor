import type { OptimizationResult, OptimizationPlan, Suggestion } from "@/lib/tax-engine/optimizer/types";
import { formatBRL } from "@/lib/tax-engine/engine";
import { Sparkles, Clock, Target, TrendingDown } from "lucide-react";

interface Props {
  result: OptimizationResult;
}

export function OptimizerPanel({ result }: Props) {
  const topSavings = result.topActions.slice(0, 3);
  return (
    <div className="space-y-6">
      {/* Header com economia combinada */}
      <div className="rounded-lg border border-success-500/30 bg-gradient-to-br from-emerald-50 to-white p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={20} className="text-success-500" />
          <h2 className="font-semibold text-ink-900">Otimizador Tributario</h2>
        </div>
        <div className="text-xs font-medium uppercase tracking-wider text-ink-500">
          Economia total identificada (12 meses + 5 anos)
        </div>
        <div className="mt-1 font-mono text-3xl font-bold tabular text-success-500">
          {formatBRL(result.totalCombinedSaving)}
        </div>
        <div className="mt-1 text-xs text-ink-500">
          {result.tactical.suggestions.length + result.strategic.suggestions.length} oportunidades detectadas
        </div>
      </div>

      {/* Top 3 oportunidades */}
      {topSavings.length > 0 && (
        <div className="rounded-lg border border-ink-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-500">
            Top {topSavings.length} maiores oportunidades
          </h3>
          <ol className="space-y-3">
            {topSavings.map((s, i) => (
              <TopSuggestionRow key={s.id} rank={i + 1} suggestion={s} />
            ))}
          </ol>
        </div>
      )}

      {/* Dois planos lado a lado */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlanCard
          plan={result.tactical}
          title="Plano Tatico (12 meses)"
          icon={<Clock size={18} className="text-warn-500" />}
          accentBorder="border-amber-200"
          accentBg="bg-amber-50/40"
        />
        <PlanCard
          plan={result.strategic}
          title="Plano Estrategico (5 anos)"
          icon={<Target size={18} className="text-brand-500" />}
          accentBorder="border-brand-200"
          accentBg="bg-brand-50/40"
        />
      </div>
    </div>
  );
}

function TopSuggestionRow({ rank, suggestion }: { rank: number; suggestion: Suggestion }) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-ink-100 p-3 hover:bg-ink-50">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
        {rank}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-ink-900">{suggestion.title}</div>
          <ConfidenceBadge level={suggestion.confidence} />
          <HorizonBadge horizon={suggestion.horizon} />
        </div>
        <div className="mt-1 text-xs text-ink-600">{suggestion.description}</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm tabular font-semibold text-success-500">
          {formatBRL(suggestion.estimatedSavingBrl)}
        </div>
        <div className="text-xs text-ink-400">economia</div>
      </div>
    </li>
  );
}

function PlanCard({
  plan,
  title,
  icon,
  accentBorder,
  accentBg,
}: {
  plan: OptimizationPlan;
  title: string;
  icon: React.ReactNode;
  accentBorder: string;
  accentBg: string;
}) {
  return (
    <div className={`rounded-lg border ${accentBorder} ${accentBg} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-ink-900">{title}</h3>
      </div>
      <div className="text-xs uppercase tracking-wider text-ink-500">
        Economia projetada
      </div>
      <div className="mt-1 font-mono text-2xl font-bold tabular text-success-500">
        {formatBRL(plan.totalSavingBrl)}
      </div>
      <div className="mt-1 text-xs text-ink-500">
        {(plan.totalSavingPctOfPortfolio * 100).toFixed(2)}% do patrimonio • {plan.suggestions.length} acoes
      </div>

      {plan.suggestions.length === 0 ? (
        <div className="mt-4 rounded-md bg-white p-3 text-sm text-ink-500">
          Nenhuma oportunidade detectada nesse horizonte. Carteira otimizada.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {plan.suggestions.slice(0, 5).map((s) => (
            <li key={s.id} className="rounded-md bg-white p-3 ring-1 ring-ink-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink-900">{s.title}</div>
                  <div className="mt-0.5 text-xs text-ink-500">{s.description}</div>
                </div>
                <div className="font-mono text-xs tabular font-semibold text-success-500 whitespace-nowrap">
                  +{formatBRL(s.estimatedSavingBrl)}
                </div>
              </div>
              {s.actions.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-ink-500 hover:text-ink-700">
                    Ver acoes sugeridas ({s.actions.length})
                  </summary>
                  <ul className="mt-2 space-y-1 border-t border-ink-100 pt-2">
                    {s.actions.map((a, i) => (
                      <li key={i} className="text-xs text-ink-600">
                        <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                          a.kind === "sell" ? "bg-red-50 text-danger-500" :
                          a.kind === "buy" ? "bg-success-50 text-success-500" :
                          a.kind === "migrate" ? "bg-brand-50 text-brand-500" :
                          "bg-amber-50 text-warn-500"
                        }`}>
                          {a.kind}
                        </span>
                        <span className="ml-2">
                          {a.assetCode ? `${a.assetCode} ${formatBRL(a.valueBrl)}` : formatBRL(a.valueBrl)} — {a.rationale}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const map = {
    high: "bg-success-50 text-success-500 ring-success-500/20",
    medium: "bg-amber-50 text-warn-500 ring-amber-500/20",
    low: "bg-ink-100 text-ink-500 ring-ink-300",
  };
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase ring-1 ${map[level]}`}>
      {level === "high" ? "alta" : level === "medium" ? "media" : "baixa"}
    </span>
  );
}

function HorizonBadge({ horizon }: { horizon: "tactical_12m" | "strategic_5y" }) {
  return (
    <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[9px] font-medium uppercase text-ink-600">
      {horizon === "tactical_12m" ? "12m" : "5y"}
    </span>
  );
}
