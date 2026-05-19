import type { Asset } from "@/lib/tax-engine/types";

export const ASSET_CATALOG: Asset[] = [
  { code: "PETR4", name: "Petrobras PN", class: "acao_br", currency: "BRL" },
  { code: "VALE3", name: "Vale ON", class: "acao_br", currency: "BRL" },
  { code: "WEGE3", name: "WEG ON", class: "acao_br", currency: "BRL" },
  { code: "ITSA4", name: "Itaúsa PN", class: "acao_br", currency: "BRL" },
  { code: "BOVA11", name: "iShares Bovespa", class: "etf_rv_br", currency: "BRL" },
  { code: "IVVB11", name: "iShares S&P 500", class: "etf_rv_br", currency: "BRL" },
  { code: "KNRI11", name: "Kinea Renda Imob", class: "fii", currency: "BRL", meetsFiiIsencao: true },
  { code: "BTLG11", name: "BTG Pactual Log", class: "fii", currency: "BRL", meetsFiiIsencao: true },
  { code: "MXRF11", name: "Maxi Renda", class: "fii", currency: "BRL", meetsFiiIsencao: true },
  { code: "LFT2029", name: "Tesouro Selic 2029", class: "tesouro_selic", currency: "BRL" },
  { code: "CDB_XP", name: "CDB XP 110% CDI", class: "cdb", currency: "BRL" },
  { code: "LCA_BB", name: "LCA Banco do Brasil", class: "lca", currency: "BRL" },
  { code: "LCI_ITAU", name: "LCI Itaú", class: "lci", currency: "BRL" },
  {
    code: "DEB_ELET",
    name: "Debênture Eletrobras IE",
    class: "debenture_incentivada",
    currency: "BRL",
    isLei12431: true,
  },
  {
    code: "ITAU_MULTI",
    name: "Itaú Multimercado FIM LP",
    class: "fundo_multimercado_lp",
    currency: "BRL",
  },
  { code: "BB_FIA", name: "BB Ações FIA", class: "fia_aberto", currency: "BRL" },
  { code: "FIDC_SUP", name: "FIDC Supply Chain BTG", class: "fidc", currency: "BRL" },
  {
    code: "VOO",
    name: "Vanguard S&P 500 ETF",
    class: "etf_exterior_distribuicao",
    currency: "USD",
    policy: "distribuicao",
    origin: "US",
  },
  {
    code: "CSPX",
    name: "iShares Core S&P 500 UCITS",
    class: "etf_exterior_acumulacao",
    currency: "USD",
    policy: "acumulacao",
    origin: "IE",
  },
  { code: "AAPL", name: "Apple Inc.", class: "stock_exterior", currency: "USD", origin: "US" },
];

export function getAssetByCode(code: string): Asset | undefined {
  return ASSET_CATALOG.find((asset) => asset.code === code);
}
