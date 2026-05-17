// TaxFlow Advisor — Tax Engine (porta do PoC Python, simplificado para MVP)

import { Rules } from "./rules";
import type {
  Operation,
  Position,
  Asset,
  MonthlyApuracao,
  AnnualApuracao,
  Opportunity,
  FiscalEvent,
} from "./types";

function blankMonth(vehicleId: string, year: number, month: number): MonthlyApuracao {
  return {
    vehicleId, year, month,
    volumeSwingShares: 0, gainSwingShare: 0, gainSwingEtfRv: 0,
    gainFii: 0, gainDay: 0,
    rendFiiIsento: 0, rendFiiTributado: 0,
    rendRfTrib: 0, rendRfIsento: 0,
    dividends: 0, jcpGross: 0, jcpIrrf: 0, proLabore: 0,
    irrf15270: 0,
    irSwingShare: 0, irDay: 0, irEtfRv: 0, irFiiGain: 0, irProgressive: 0,
    totalDarf6015: 0, opsRef: [],
  };
}

export interface EngineResult {
  positions: Map<string, Position>;
  monthly: Map<string, MonthlyApuracao>;
  annual: Map<string, AnnualApuracao>;
  dividendAccumulator: Map<string, number>;
}

const keyPos = (vehId: string, assetCode: string) => `${vehId}::${assetCode}`;
const keyMonth = (vehId: string, y: number, m: number) => `${vehId}::${y}::${m}`;
const keyAnnual = (vehId: string, y: number) => `${vehId}::${y}`;
const keyDiv = (cnpj: string, vehId: string, y: number, m: number) =>
  `${cnpj}::${vehId}::${y}::${m}`;

export function runEngine(ops: Operation[]): EngineResult {
  const positions = new Map<string, Position>();
  const monthly = new Map<string, MonthlyApuracao>();
  const annual = new Map<string, AnnualApuracao>();
  const dividendAcc = new Map<string, number>();

  const getMonth = (vehId: string, y: number, m: number): MonthlyApuracao => {
    const k = keyMonth(vehId, y, m);
    if (!monthly.has(k)) monthly.set(k, blankMonth(vehId, y, m));
    return monthly.get(k)!;
  };
  const getAnnual = (vehId: string, y: number): AnnualApuracao => {
    const k = keyAnnual(vehId, y);
    if (!annual.has(k)) {
      annual.set(k, {
        vehicleId: vehId, year: y,
        totalIncomeForIrpfm: 0, irPaidInYear: 0,
        irpfmGross: 0, irpfmDue: 0,
        exteriorGainBrl: 0, exteriorIrBrl: 0,
      });
    }
    return annual.get(k)!;
  };
  const updatePos = (op: Operation, deltaQty: number, deltaCost: number) => {
    const k = keyPos(op.vehicleId, op.asset.code);
    const existing = positions.get(k);
    if (!existing) {
      positions.set(k, {
        asset: op.asset,
        qty: deltaQty,
        totalCostBrl: deltaCost,
        meanCost: deltaQty > 0 ? deltaCost / deltaQty : 0,
      });
    } else {
      existing.qty += deltaQty;
      existing.totalCostBrl += deltaCost;
      existing.meanCost = existing.qty > 0 ? existing.totalCostBrl / existing.qty : 0;
    }
  };

  // Ordena por data
  const sorted = [...ops].sort((a, b) => (a.date < b.date ? -1 : 1));

  for (const op of sorted) {
    const d = new Date(op.date);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const ap = getMonth(op.vehicleId, y, m);
    ap.opsRef.push(op.id);

    switch (op.type) {
      case "compra": {
        const valueBrl = op.totalValue * (op.ptax ?? 1) + (op.costs ?? 0);
        updatePos(op, op.qty ?? 0, valueBrl);
        break;
      }
      case "venda_swing": {
        const k = keyPos(op.vehicleId, op.asset.code);
        const pos = positions.get(k);
        if (!pos || pos.qty < (op.qty ?? 0)) break;
        const valueSell = op.totalValue * (op.ptax ?? 1) - (op.costs ?? 0);
        const allocCost = pos.meanCost * (op.qty ?? 0);
        const gain = valueSell - allocCost;

        const cls = op.asset.class;
        if (cls === "acao_br") {
          ap.volumeSwingShares += valueSell;
          ap.gainSwingShare += gain;
        } else if (cls === "etf_rv_br") {
          ap.gainSwingEtfRv += gain;
        } else if (cls === "fii" || cls === "fiagro") {
          ap.gainFii += gain;
        } else if (
          cls === "stock_exterior" ||
          cls === "etf_exterior_acumulacao" ||
          cls === "etf_exterior_distribuicao" ||
          cls === "reit_exterior"
        ) {
          const an = getAnnual(op.vehicleId, y);
          an.exteriorGainBrl += gain;
        }
        // Atualiza posição
        const newQty = pos.qty - (op.qty ?? 0);
        const newCost = pos.totalCostBrl - allocCost;
        pos.qty = newQty;
        pos.totalCostBrl = newCost;
        pos.meanCost = newQty > 0 ? newCost / newQty : 0;
        break;
      }
      case "venda_day": {
        const k = keyPos(op.vehicleId, op.asset.code);
        const pos = positions.get(k);
        if (!pos) break;
        const valueSell = op.totalValue * (op.ptax ?? 1) - (op.costs ?? 0);
        const allocCost = pos.meanCost * (op.qty ?? 0);
        const gain = valueSell - allocCost;
        ap.gainDay += gain;
        const newQty = pos.qty - (op.qty ?? 0);
        const newCost = pos.totalCostBrl - allocCost;
        pos.qty = newQty;
        pos.totalCostBrl = newCost;
        pos.meanCost = newQty > 0 ? newCost / newQty : 0;
        break;
      }
      case "dividendo":
      case "distribuicao_pj_propria": {
        ap.dividends += op.totalValue;
        const opDate = new Date(op.date);
        if (opDate >= Rules.LEI_15270_START && op.payerCnpj) {
          const dk = keyDiv(op.payerCnpj, op.vehicleId, y, m);
          const acc = (dividendAcc.get(dk) ?? 0) + op.totalValue;
          dividendAcc.set(dk, acc);
          if (acc > Rules.TRIGGER_IRRF_LEI_15270) {
            ap.irrf15270 = acc * Rules.ALIQ_IRRF_LEI_15270;
          }
        }
        break;
      }
      case "jcp": {
        ap.jcpGross += op.totalValue;
        ap.jcpIrrf += op.totalValue * Rules.ALIQ_JCP;
        break;
      }
      case "rendimento_fii": {
        if (op.asset.meetsFiiIsencao) ap.rendFiiIsento += op.totalValue;
        else ap.rendFiiTributado += op.totalValue;
        break;
      }
      case "cupom_rf": {
        if (op.asset.class === "debenture_incentivada" ||
            op.asset.class === "lci" || op.asset.class === "lca") {
          ap.rendRfIsento += op.totalValue;
        } else {
          const irrf = op.totalValue * 0.15;
          ap.rendRfTrib += op.totalValue - irrf;
        }
        break;
      }
      case "vencimento_rf": {
        const k = keyPos(op.vehicleId, op.asset.code);
        const pos = positions.get(k);
        if (!pos) break;
        const gain = op.totalValue - pos.totalCostBrl;
        const irrf = Math.max(0, gain) * 0.15;
        ap.rendRfTrib += gain - irrf;
        pos.qty = 0;
        pos.totalCostBrl = 0;
        pos.meanCost = 0;
        break;
      }
      case "pro_labore": {
        ap.proLabore += op.totalValue;
        break;
      }
    }
  }

  // Fecha apurações mensais (calcula IR por categoria)
  for (const ap of monthly.values()) {
    if (ap.volumeSwingShares <= Rules.ISENCAO_SWING_ACAO_MES) {
      ap.irSwingShare = 0;
    } else {
      ap.irSwingShare = Math.max(0, ap.gainSwingShare) * Rules.ALIQ_SWING_ACAO;
    }
    ap.irEtfRv = Math.max(0, ap.gainSwingEtfRv) * Rules.ALIQ_ETF_RV_SWING;
    ap.irDay = Math.max(0, ap.gainDay) * Rules.ALIQ_DAY;
    ap.irFiiGain = Math.max(0, ap.gainFii) * Rules.ALIQ_FII_GAIN;

    if (ap.proLabore > 0) {
      const { rate, deduction } = Rules.irpfProgressive(ap.proLabore);
      ap.irProgressive = Math.max(0, ap.proLabore * rate - deduction);
    }
    ap.totalDarf6015 = ap.irSwingShare + ap.irDay + ap.irEtfRv + ap.irFiiGain;
  }

  // Fecha anuais — IRPFM
  for (const [k, ap] of annual.entries()) {
    let totalIncome = 0;
    let irPaid = 0;
    for (const m of monthly.values()) {
      if (m.vehicleId !== ap.vehicleId || m.year !== ap.year) continue;
      totalIncome += m.proLabore + m.dividends + m.jcpGross
        + m.rendFiiIsento + m.rendFiiTributado
        + m.rendRfIsento + m.rendRfTrib
        + Math.max(0, m.gainSwingShare) + Math.max(0, m.gainSwingEtfRv)
        + Math.max(0, m.gainFii) + Math.max(0, m.gainDay);
      irPaid += m.totalDarf6015 + m.irProgressive + m.jcpIrrf + m.irrf15270;
    }
    totalIncome += Math.max(0, ap.exteriorGainBrl);
    ap.exteriorIrBrl = Math.max(0, ap.exteriorGainBrl) * Rules.ALIQ_LEI_14754;
    irPaid += ap.exteriorIrBrl;
    ap.totalIncomeForIrpfm = totalIncome;
    ap.irPaidInYear = irPaid;
    const rate = Rules.irpfmRate(totalIncome);
    ap.irpfmGross = totalIncome * rate;
    ap.irpfmDue = Math.max(0, ap.irpfmGross - irPaid);
  }

  return { positions, monthly, annual, dividendAccumulator: dividendAcc };
}

// Computa oportunidades a partir dos resultados
export function findOpportunities(
  result: EngineResult,
  vehicleId: string,
  year: number
): Opportunity[] {
  const opps: Opportunity[] = [];

  // 1. Janela R$ 20k usada
  let maxSwingVol = 0;
  for (const m of result.monthly.values()) {
    if (m.vehicleId === vehicleId && m.year === year) {
      maxSwingVol = Math.max(maxSwingVol, m.volumeSwingShares);
    }
  }
  if (maxSwingVol > 20000) {
    opps.push({
      id: "op_r20k",
      kind: "windowR20k",
      title: "Janela R$ 20k de isenção foi quebrada",
      description: `Pico de ${formatBRL(maxSwingVol)} em vendas swing num mês ultrapassou a janela. Dividir vendas em meses consecutivos economiza IR.`,
      estimatedSavingBrl: (maxSwingVol - 20000) * 0.15,
      severity: "warn",
    });
  } else if (maxSwingVol > 0) {
    opps.push({
      id: "op_r20k_room",
      kind: "windowR20k",
      title: "Janela R$ 20k preservada",
      description: `Pico mensal de ${formatBRL(maxSwingVol)} — sob o limite.`,
      severity: "info",
    });
  }

  // 2. Lei 15.270 disparada
  let irrf15270Total = 0;
  for (const m of result.monthly.values()) {
    if (m.vehicleId === vehicleId && m.year === year) irrf15270Total += m.irrf15270;
  }
  if (irrf15270Total > 0) {
    opps.push({
      id: "op_15270",
      kind: "lei15270Transition",
      title: "IRRF de 10% (Lei 15.270) foi retido",
      description: `${formatBRL(irrf15270Total)} retidos por dispar gatilho R$ 50k/mês. Considerar redistribuir lucros 2025 (regra de transição).`,
      estimatedSavingBrl: irrf15270Total,
      severity: "high",
    });
  }

  // 3. IRPFM
  const an = result.annual.get(keyAnnual(vehicleId, year));
  if (an) {
    if (an.irpfmDue > 0) {
      opps.push({
        id: "op_irpfm",
        kind: "irpfmRoom",
        title: `IRPFM devido: ${formatBRL(an.irpfmDue)}`,
        description: "Cliente está acima do gatilho R$ 600k de renda anual. Explorar redutor anti-bitributação via PJ ou diferimento.",
        estimatedSavingBrl: an.irpfmDue,
        severity: "high",
      });
    } else {
      const room = Rules.IRPFM_LOWER - an.totalIncomeForIrpfm;
      if (room > 0) {
        opps.push({
          id: "op_irpfm_room",
          kind: "irpfmRoom",
          title: "Folga confortável no IRPFM",
          description: `${formatBRL(room)} abaixo do gatilho de R$ 600k. Sem IRPFM aplicável.`,
          severity: "info",
        });
      }
    }

    // 4. Exterior
    if (an.exteriorGainBrl > 5000) {
      opps.push({
        id: "op_ucits",
        kind: "ucitsMigration",
        title: "Ganho relevante no exterior",
        description: `${formatBRL(an.exteriorGainBrl)} de ganho via ativos no exterior. Considerar UCITS irlandeses (CSPX/VUSA) para reduzir carga em dividendos (40% → 28% em ETF americano).`,
        severity: "info",
      });
    }
  }

  return opps;
}

// Helper de formatação
export function formatBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatPercent(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(v);
}

// Computa eventos fiscais (calendário)
export function listFiscalEvents(
  result: EngineResult,
  vehicleId: string,
  year: number
): FiscalEvent[] {
  const events: FiscalEvent[] = [];
  for (const m of result.monthly.values()) {
    if (m.vehicleId !== vehicleId || m.year !== year) continue;
    const lastDay = new Date(Date.UTC(m.year, m.month, 0)).toISOString().slice(0, 10);
    if (m.totalDarf6015 > 0) {
      events.push({
        id: `darf-${m.year}-${m.month}`,
        date: lastDay,
        kind: "darf",
        description: `DARF 6015 — ${monthName(m.month)}/${m.year}`,
        amount: m.totalDarf6015,
      });
    }
    if (m.irrf15270 > 0) {
      events.push({
        id: `trig-${m.year}-${m.month}`,
        date: `${m.year}-${String(m.month).padStart(2, "0")}-15`,
        kind: "trigger",
        description: `Gatilho Lei 15.270 — ${monthName(m.month)}/${m.year}`,
        amount: m.irrf15270,
      });
    }
  }
  events.sort((a, b) => (a.date < b.date ? -1 : 1));
  return events;
}

function monthName(m: number): string {
  const names = ["jan", "fev", "mar", "abr", "mai", "jun",
                 "jul", "ago", "set", "out", "nov", "dez"];
  return names[m - 1];
}

// Helper para construir resumo agregado por classe
export interface AllocationItem {
  classLabel: string;
  totalBrl: number;
  pct: number;
}

export function computeAllocation(
  result: EngineResult,
  vehicleId: string
): AllocationItem[] {
  const buckets = new Map<string, number>();
  for (const pos of result.positions.values()) {
    if (pos.qty <= 0) continue;
    const label = classLabel(pos.asset);
    buckets.set(label, (buckets.get(label) ?? 0) + pos.totalCostBrl);
  }
  const total = [...buckets.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return [];
  return [...buckets.entries()]
    .map(([k, v]) => ({ classLabel: k, totalBrl: v, pct: (v / total) }))
    .sort((a, b) => b.totalBrl - a.totalBrl);
}

// Apreciação simulada por classe (em produção viria de cotações)
const APPRECIATION: Record<string, number> = {
  acao_br: 0.12,
  etf_rv_br: 0.10,
  etf_rf_br: 0.06,
  fii: 0.04,
  fiagro: 0.05,
  tesouro_selic: 0.06,
  tesouro_pre: 0.05,
  tesouro_ipca: 0.07,
  cdb: 0.06,
  lci: 0.07,
  lca: 0.07,
  debenture_incentivada: 0.08,
  stock_exterior: 0.15,
  etf_exterior_acumulacao: 0.13,
  etf_exterior_distribuicao: 0.10,
  reit_exterior: 0.08,
};

export interface DetailedPosition {
  asset: Asset;
  qty: number;
  meanCost: number;
  currentValue: number;
  costTotal: number;
  unrealizedGain: number;
  unrealizedGainPct: number;
  classLabel: string;
  potentialTaxIfSold: number;
}

export function getDetailedPositions(result: EngineResult, vehicleId: string): DetailedPosition[] {
  const out: DetailedPosition[] = [];
  for (const [key, pos] of result.positions.entries()) {
    if (pos.qty <= 0) continue;
    if (!key.startsWith(vehicleId + "::")) continue;
    const apprec = APPRECIATION[pos.asset.class] ?? 0.05;
    const currentValue = pos.totalCostBrl * (1 + apprec);
    const gain = currentValue - pos.totalCostBrl;
    const cls = classLabel(pos.asset);
    // Estimativa de IR latente se realizar agora
    let taxRate = 0.15;
    if (pos.asset.class === "fii" || pos.asset.class === "fiagro") taxRate = 0.20;
    if (pos.asset.class === "lci" || pos.asset.class === "lca" ||
        pos.asset.class === "debenture_incentivada") taxRate = 0;
    const potentialTax = Math.max(0, gain) * taxRate;
    out.push({
      asset: pos.asset,
      qty: pos.qty,
      meanCost: pos.meanCost,
      currentValue,
      costTotal: pos.totalCostBrl,
      unrealizedGain: gain,
      unrealizedGainPct: gain / pos.totalCostBrl,
      classLabel: cls,
      potentialTaxIfSold: potentialTax,
    });
  }
  // ordena por classe, depois por valor
  return out.sort((a, b) => {
    if (a.classLabel !== b.classLabel) return a.classLabel.localeCompare(b.classLabel);
    return b.currentValue - a.currentValue;
  });
}

function classLabel(asset: Asset): string {
  switch (asset.class) {
    case "acao_br": return "Ações BR";
    case "etf_rv_br": return "ETF RV BR";
    case "etf_rf_br": return "ETF RF BR";
    case "fii": case "fiagro": return "FII / Fiagro";
    case "tesouro_selic": case "tesouro_pre": case "tesouro_ipca":
    case "cdb": return "Renda Fixa Trib.";
    case "lci": case "lca": case "debenture_incentivada":
      return "Renda Fixa Isenta";
    case "stock_exterior":
    case "etf_exterior_acumulacao":
    case "etf_exterior_distribuicao":
    case "reit_exterior":
      return "Exterior";
    default: return "Outros";
  }
}
