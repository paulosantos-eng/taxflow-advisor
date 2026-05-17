// TaxFlow Advisor — Dados mock (3 clientes, ano fiscal 2026)

import type { Client, Operation, Asset } from "@/lib/tax-engine/types";

// ============================================================================
// ATIVOS (catálogo)
// ============================================================================

const A = {
  PETR4: { code: "PETR4", name: "Petrobras PN", class: "acao_br", currency: "BRL" } as Asset,
  WEGE3: { code: "WEGE3", name: "WEG ON", class: "acao_br", currency: "BRL" } as Asset,
  VALE3: { code: "VALE3", name: "Vale ON", class: "acao_br", currency: "BRL" } as Asset,
  ITSA4: { code: "ITSA4", name: "Itaúsa PN", class: "acao_br", currency: "BRL" } as Asset,
  BBSE3: { code: "BBSE3", name: "BB Seguridade", class: "acao_br", currency: "BRL" } as Asset,
  KNRI11: { code: "KNRI11", name: "Kinea Renda Imob", class: "fii", currency: "BRL", meetsFiiIsencao: true } as Asset,
  BTLG11: { code: "BTLG11", name: "BTG Pactual Log", class: "fii", currency: "BRL", meetsFiiIsencao: true } as Asset,
  MXRF11: { code: "MXRF11", name: "Maxi Renda", class: "fii", currency: "BRL", meetsFiiIsencao: true } as Asset,
  LFT2027: { code: "LFT2027", name: "Tesouro Selic 2027", class: "tesouro_selic", currency: "BRL" } as Asset,
  LFT2029: { code: "LFT2029", name: "Tesouro Selic 2029", class: "tesouro_selic", currency: "BRL" } as Asset,
  CDB_XP: { code: "CDB_XP", name: "CDB XP 110% CDI", class: "cdb", currency: "BRL" } as Asset,
  LCA_BB: { code: "LCA_BB", name: "LCA Banco do Brasil", class: "lca", currency: "BRL" } as Asset,
  LCI_ITAU: { code: "LCI_ITAU", name: "LCI Itaú", class: "lci", currency: "BRL" } as Asset,
  DEB_ELET: { code: "DEB_ELET", name: "Debênture Eletrobras IE", class: "debenture_incentivada", currency: "BRL", isLei12431: true } as Asset,
  IVVB11: { code: "IVVB11", name: "iShares S&P 500", class: "etf_rv_br", currency: "BRL" } as Asset,
  BOVA11: { code: "BOVA11", name: "iShares Bovespa", class: "etf_rv_br", currency: "BRL" } as Asset,
  VOO: { code: "VOO", name: "Vanguard S&P 500 ETF", class: "etf_exterior_acumulacao", currency: "USD", policy: "acumulacao", origin: "US" } as Asset,
  SCHD: { code: "SCHD", name: "Schwab US Div ETF", class: "etf_exterior_distribuicao", currency: "USD", policy: "distribuicao", origin: "US" } as Asset,
  CSPX: { code: "CSPX", name: "iShares Core S&P 500 UCITS", class: "etf_exterior_acumulacao", currency: "USD", policy: "acumulacao", origin: "IE" } as Asset,
  AAPL: { code: "AAPL", name: "Apple Inc.", class: "stock_exterior", currency: "USD", origin: "US" } as Asset,
  AGG: { code: "AGG", name: "iShares Core US Aggregate Bond", class: "etf_exterior_acumulacao", currency: "USD", policy: "acumulacao", origin: "US" } as Asset,
  // Fundos abertos e fechados
  ITAU_MULTI: { code: "ITAU_MULTI", name: "Itau Multimercado FIM LP", class: "fundo_multimercado_lp", currency: "BRL" } as Asset,
  XP_MACRO: { code: "XP_MACRO", name: "XP Macro Multimercado FIM", class: "fundo_multimercado_lp", currency: "BRL" } as Asset,
  BB_FIA: { code: "BB_FIA", name: "BB Acoes FIA", class: "fia_aberto", currency: "BRL" } as Asset,
  FIDC_SUP: { code: "FIDC_SUP", name: "FIDC Supply Chain BTG", class: "fidc", currency: "BRL" } as Asset,
  FIP_INO: { code: "FIP_INO", name: "FIP Inovacao Brasil Qualificado", class: "fip_qualificado", currency: "BRL" } as Asset,
};

const PLACEHOLDER: Asset = {
  code: "PRO_LABORE",
  name: "Pró-labore Mendes Adv.",
  class: "acao_br",
  currency: "BRL",
};

const PLACEHOLDER_DIST: Asset = {
  code: "DIST_PJ",
  name: "Distribuição PJ Própria",
  class: "acao_br",
  currency: "BRL",
};

const CNPJ_MENDES = "12.345.678/0001-90";

// ============================================================================
// CLIENTES
// ============================================================================

export const CLIENTS: Client[] = [
  {
    id: "cli_joao",
    name: "João Mendes",
    cpf: "***.***.***-00",
    birthDate: "1988-03-15",
    residency: "BR",
    vehicles: [{ id: "vec_pf_joao", clientId: "cli_joao", type: "PF", country: "BR" }],
  },
  {
    id: "cli_marina",
    name: "Marina Costa",
    cpf: "***.***.***-11",
    birthDate: "1979-11-22",
    residency: "BR",
    vehicles: [
      { id: "vec_pf_marina", clientId: "cli_marina", type: "PF", country: "BR" },
    ],
  },
  {
    id: "cli_roberto",
    name: "Roberto Lima",
    cpf: "***.***.***-22",
    birthDate: "1965-06-10",
    residency: "BR",
    vehicles: [{ id: "vec_pf_roberto", clientId: "cli_roberto", type: "PF", country: "BR" }],
  },
];

// ============================================================================
// OPERAÇÕES — JOÃO (advogado tributarista, R$ 4M, ativo, carteira mista)
// ============================================================================

function joaoOperations(): Operation[] {
  const ops: Operation[] = [];
  const v = "vec_pf_joao";
  // Pró-labore mensal
  for (let m = 1; m <= 12; m++) {
    const val = m === 11 ? 35000 : 25000;
    ops.push({
      id: `j_pl_${m}`, vehicleId: v, asset: PLACEHOLDER, type: "pro_labore",
      date: `2026-${String(m).padStart(2, "0")}-05`,
      totalValue: val, payerCnpj: CNPJ_MENDES,
    });
  }
  // Compras iniciais (estrutura da carteira em jan/26)
  ops.push({ id: "j_001", vehicleId: v, asset: A.KNRI11, type: "compra", date: "2026-01-10", qty: 1000, unitPrice: 160, totalValue: 160000, costs: 80 });
  ops.push({ id: "j_002", vehicleId: v, asset: A.BTLG11, type: "compra", date: "2026-01-10", qty: 1500, unitPrice: 100, totalValue: 150000, costs: 75 });
  ops.push({ id: "j_003", vehicleId: v, asset: A.LFT2027, type: "compra", date: "2026-01-20", qty: 200, unitPrice: 1000, totalValue: 200000 });
  ops.push({ id: "j_004", vehicleId: v, asset: A.LCA_BB, type: "compra", date: "2026-01-22", qty: 1, totalValue: 300000 });
  ops.push({ id: "j_005", vehicleId: v, asset: A.DEB_ELET, type: "compra", date: "2026-01-25", qty: 200, unitPrice: 1000, totalValue: 200000 });
  ops.push({ id: "j_006", vehicleId: v, asset: A.PETR4, type: "compra", date: "2026-01-15", qty: 1000, unitPrice: 25, totalValue: 25000, costs: 12 });
  ops.push({ id: "j_007", vehicleId: v, asset: A.WEGE3, type: "compra", date: "2026-01-15", qty: 500, unitPrice: 40, totalValue: 20000, costs: 10 });
  ops.push({ id: "j_008", vehicleId: v, asset: A.ITSA4, type: "compra", date: "2026-01-18", qty: 2000, unitPrice: 10, totalValue: 20000, costs: 10 });
  ops.push({ id: "j_009", vehicleId: v, asset: A.IVVB11, type: "compra", date: "2026-01-20", qty: 300, unitPrice: 330, totalValue: 99000, costs: 50 });
  ops.push({ id: "j_010", vehicleId: v, asset: A.VOO, type: "compra", date: "2026-01-25", qty: 500, unitPrice: 450, totalValue: 225000, ptax: 5.10 });

  // === FUNDOS ABERTOS E FECHADOS ===
  // Aplicação em fundo multimercado LP
  ops.push({ id: "j_f_001", vehicleId: v, asset: A.ITAU_MULTI, type: "aplicacao_fundo", date: "2026-01-22", qty: 1, totalValue: 250000 });
  // Aplicação em FIA aberto
  ops.push({ id: "j_f_002", vehicleId: v, asset: A.BB_FIA, type: "aplicacao_fundo", date: "2026-02-10", qty: 1, totalValue: 150000 });
  // Aplicação em FIDC
  ops.push({ id: "j_f_003", vehicleId: v, asset: A.FIDC_SUP, type: "aplicacao_fundo", date: "2026-03-05", qty: 1, totalValue: 200000 });
  // Come-cotas semestral em maio (fundo multimercado LP)
  ops.push({ id: "j_cc_mai", vehicleId: v, asset: A.ITAU_MULTI, type: "come_cotas", date: "2026-05-29", totalValue: 8500 }); // rendimento estimado do periodo
  // Come-cotas semestral em novembro (fundo multimercado LP)
  ops.push({ id: "j_cc_nov", vehicleId: v, asset: A.ITAU_MULTI, type: "come_cotas", date: "2026-11-27", totalValue: 12000 });
  // Come-cotas FIDC tambem em mai/nov (pos-14.754)
  ops.push({ id: "j_cc_fidc_mai", vehicleId: v, asset: A.FIDC_SUP, type: "come_cotas", date: "2026-05-29", totalValue: 5500 });
  ops.push({ id: "j_cc_fidc_nov", vehicleId: v, asset: A.FIDC_SUP, type: "come_cotas", date: "2026-11-27", totalValue: 9000 });
  // BB FIA NAO sofre come-cotas (excecao FIA)
  // Resgate parcial do multimercado em dezembro
  ops.push({ id: "j_resg_multi", vehicleId: v, asset: A.ITAU_MULTI, type: "resgate_fundo", date: "2026-12-18", totalValue: 280000 });
  // Distribuições FII mensais
  for (let m = 2; m <= 12; m++) {
    ops.push({ id: `j_div_knri_${m}`, vehicleId: v, asset: A.KNRI11, type: "rendimento_fii", date: `2026-${String(m).padStart(2, "0")}-15`, totalValue: 1200 });
    ops.push({ id: `j_div_btlg_${m}`, vehicleId: v, asset: A.BTLG11, type: "rendimento_fii", date: `2026-${String(m).padStart(2, "0")}-15`, totalValue: 1500 });
  }
  // Cupom debênture incentivada
  for (let m of [3, 9]) {
    ops.push({ id: `j_cup_deb_${m}`, vehicleId: v, asset: A.DEB_ELET, type: "cupom_rf", date: `2026-${String(m).padStart(2, "0")}-15`, totalValue: 6000 });
  }
  // Venda PETR4 em março dentro de R$ 20k
  ops.push({ id: "j_vsell_petr", vehicleId: v, asset: A.PETR4, type: "venda_swing", date: "2026-03-12", qty: 600, unitPrice: 30, totalValue: 18000, costs: 9 });
  ops.push({ id: "j_div_petr_q1", vehicleId: v, asset: A.PETR4, type: "dividendo", date: "2026-03-28", totalValue: 800, payerCnpj: "33.000.167/0001-01" });
  // Abril — distribuição PJ R$ 60k DISPARA Lei 15.270
  ops.push({ id: "j_dist_abr", vehicleId: v, asset: PLACEHOLDER_DIST, type: "distribuicao_pj_propria", date: "2026-04-15", totalValue: 60000, payerCnpj: CNPJ_MENDES });
  // Maio — venda WEGE3 estoura R$ 20k
  ops.push({ id: "j_vsell_wege", vehicleId: v, asset: A.WEGE3, type: "venda_swing", date: "2026-05-10", qty: 400, unitPrice: 55, totalValue: 22000, costs: 11 });
  // Julho — distribuição PJ R$ 50k (no limite, não dispara)
  ops.push({ id: "j_dist_jul", vehicleId: v, asset: PLACEHOLDER_DIST, type: "distribuicao_pj_propria", date: "2026-07-15", totalValue: 50000, payerCnpj: CNPJ_MENDES });
  ops.push({ id: "j_div_schd_q3", vehicleId: v, asset: A.SCHD, type: "dividendo", date: "2026-07-28", totalValue: 4800, ptax: 5.20, payerCnpj: "SCHD_US" });
  // Setembro — JCP + day trade
  ops.push({ id: "j_jcp_itsa", vehicleId: v, asset: A.ITSA4, type: "jcp", date: "2026-09-20", totalValue: 3500, payerCnpj: "61.532.644/0001-15" });
  ops.push({ id: "j_dt_vale_buy", vehicleId: v, asset: A.VALE3, type: "compra", date: "2026-09-18", qty: 100, unitPrice: 70, totalValue: 7000, costs: 3.5 });
  ops.push({ id: "j_dt_vale_sell", vehicleId: v, asset: A.VALE3, type: "venda_day", date: "2026-09-18", qty: 100, unitPrice: 72, totalValue: 7200, costs: 3.5 });
  // Outubro — venda KNRI11 (ganho FII)
  ops.push({ id: "j_vsell_knri", vehicleId: v, asset: A.KNRI11, type: "venda_swing", date: "2026-10-22", qty: 400, unitPrice: 178, totalValue: 71200, costs: 36 });
  // Novembro — distribuição PJ R$ 40k
  ops.push({ id: "j_dist_nov", vehicleId: v, asset: PLACEHOLDER_DIST, type: "distribuicao_pj_propria", date: "2026-11-20", totalValue: 40000, payerCnpj: CNPJ_MENDES });
  // Dezembro — venda VOO (USD apreciou)
  ops.push({ id: "j_vsell_voo", vehicleId: v, asset: A.VOO, type: "venda_swing", date: "2026-12-15", qty: 100, unitPrice: 510, totalValue: 51000, ptax: 5.40 });
  return ops;
}

// ============================================================================
// OPERAÇÕES — MARINA (sócia executiva, alta renda, dispara IRPFM)
// ============================================================================

function marinaOperations(): Operation[] {
  const ops: Operation[] = [];
  const v = "vec_pf_marina";
  const cnpjMarina = "98.765.432/0001-10";
  // Pró-labore alto
  for (let m = 1; m <= 12; m++) {
    ops.push({ id: `m_pl_${m}`, vehicleId: v, asset: PLACEHOLDER, type: "pro_labore", date: `2026-${String(m).padStart(2, "0")}-05`, totalValue: 80000, payerCnpj: cnpjMarina });
  }
  // Distribuição mensal PJ R$ 70k (DISPARA Lei 15.270 todo mês)
  for (let m = 1; m <= 12; m++) {
    ops.push({ id: `m_dist_${m}`, vehicleId: v, asset: PLACEHOLDER_DIST, type: "distribuicao_pj_propria", date: `2026-${String(m).padStart(2, "0")}-25`, totalValue: 70000, payerCnpj: cnpjMarina });
  }
  // Carteira financeira
  ops.push({ id: "m_001", vehicleId: v, asset: A.KNRI11, type: "compra", date: "2026-01-15", qty: 3000, unitPrice: 162, totalValue: 486000, costs: 240 });
  ops.push({ id: "m_002", vehicleId: v, asset: A.LFT2029, type: "compra", date: "2026-01-15", qty: 1500, unitPrice: 1000, totalValue: 1500000 });
  ops.push({ id: "m_003", vehicleId: v, asset: A.DEB_ELET, type: "compra", date: "2026-02-20", qty: 1000, unitPrice: 1000, totalValue: 1000000 });
  ops.push({ id: "m_004", vehicleId: v, asset: A.VOO, type: "compra", date: "2026-02-15", qty: 1500, unitPrice: 460, totalValue: 690000, ptax: 5.15 });
  ops.push({ id: "m_005", vehicleId: v, asset: A.AAPL, type: "compra", date: "2026-03-10", qty: 800, unitPrice: 220, totalValue: 176000, ptax: 5.10 });
  // Distribuições FII
  for (let m = 2; m <= 12; m++) {
    ops.push({ id: `m_div_knri_${m}`, vehicleId: v, asset: A.KNRI11, type: "rendimento_fii", date: `2026-${String(m).padStart(2, "0")}-15`, totalValue: 3600 });
  }
  // Cupom debênture
  for (let m of [3, 9]) {
    ops.push({ id: `m_cup_deb_${m}`, vehicleId: v, asset: A.DEB_ELET, type: "cupom_rf", date: `2026-${String(m).padStart(2, "0")}-15`, totalValue: 30000 });
  }
  // Dividendo SCHD-like (do VOO ela não recebe — VOO é acumulação)
  // Venda parcial AAPL em novembro (ganho exterior)
  ops.push({ id: "m_vsell_aapl", vehicleId: v, asset: A.AAPL, type: "venda_swing", date: "2026-11-20", qty: 300, unitPrice: 250, totalValue: 75000, ptax: 5.30 });
  return ops;
}

// ============================================================================
// OPERAÇÕES — ROBERTO (aposentado, conservador, R$ 6M)
// ============================================================================

function robertoOperations(): Operation[] {
  const ops: Operation[] = [];
  const v = "vec_pf_roberto";
  // Aposentadoria via INSS (entra como pro_labore para simplificar)
  for (let m = 1; m <= 12; m++) {
    ops.push({ id: `r_apos_${m}`, vehicleId: v, asset: PLACEHOLDER, type: "pro_labore", date: `2026-${String(m).padStart(2, "0")}-05`, totalValue: 15000 });
  }
  // Carteira conservadora
  ops.push({ id: "r_001", vehicleId: v, asset: A.LFT2029, type: "compra", date: "2026-01-10", qty: 2500, unitPrice: 1000, totalValue: 2500000 });
  ops.push({ id: "r_002", vehicleId: v, asset: A.LCI_ITAU, type: "compra", date: "2026-01-15", qty: 1, totalValue: 1500000 });
  ops.push({ id: "r_003", vehicleId: v, asset: A.DEB_ELET, type: "compra", date: "2026-01-15", qty: 1000, unitPrice: 1000, totalValue: 1000000 });
  ops.push({ id: "r_004", vehicleId: v, asset: A.KNRI11, type: "compra", date: "2026-01-15", qty: 3000, unitPrice: 160, totalValue: 480000, costs: 240 });
  ops.push({ id: "r_005", vehicleId: v, asset: A.MXRF11, type: "compra", date: "2026-01-15", qty: 4000, unitPrice: 10, totalValue: 40000, costs: 20 });
  ops.push({ id: "r_006", vehicleId: v, asset: A.CSPX, type: "compra", date: "2026-02-15", qty: 800, unitPrice: 500, totalValue: 400000, ptax: 5.15 });
  // Rendimentos FII
  for (let m = 2; m <= 12; m++) {
    ops.push({ id: `r_div_knri_${m}`, vehicleId: v, asset: A.KNRI11, type: "rendimento_fii", date: `2026-${String(m).padStart(2, "0")}-15`, totalValue: 3600 });
    ops.push({ id: `r_div_mxrf_${m}`, vehicleId: v, asset: A.MXRF11, type: "rendimento_fii", date: `2026-${String(m).padStart(2, "0")}-15`, totalValue: 400 });
  }
  // Cupom debênture
  for (let m of [3, 9]) {
    ops.push({ id: `r_cup_deb_${m}`, vehicleId: v, asset: A.DEB_ELET, type: "cupom_rf", date: `2026-${String(m).padStart(2, "0")}-15`, totalValue: 30000 });
  }
  return ops;
}

// ============================================================================
// EXPORT
// ============================================================================

export function getOperationsForClient(clientId: string): Operation[] {
  switch (clientId) {
    case "cli_joao": return joaoOperations();
    case "cli_marina": return marinaOperations();
    case "cli_roberto": return robertoOperations();
    default: return [];
  }
}

export function getClient(clientId: string): Client | undefined {
  return CLIENTS.find(c => c.id === clientId);
}
