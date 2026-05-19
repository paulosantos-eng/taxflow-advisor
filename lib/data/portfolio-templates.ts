import { getOperationsForClient } from "@/lib/data/mock-clients";
import type { Operation } from "@/lib/tax-engine/types";

export type PortfolioTemplateId = "joao" | "marina" | "roberto";

export interface PortfolioTemplate {
  id: PortfolioTemplateId;
  title: string;
  subtitle: string;
  description: string;
  sourceClientId: string;
}

export const PORTFOLIO_TEMPLATES: PortfolioTemplate[] = [
  {
    id: "joao",
    title: "Carteira balanceada",
    subtitle: "PF com renda, FIIs, RF, fundos e exterior",
    description: "Boa para demonstrar visão geral, rebalanceamento e Lei 15.270 pontual.",
    sourceClientId: "cli_joao",
  },
  {
    id: "marina",
    title: "Alta renda",
    subtitle: "Renda alta, dividendos mensais e IRPFM",
    description: "Mostra gatilhos críticos: Lei 15.270 recorrente, IRPFM e exterior.",
    sourceClientId: "cli_marina",
  },
  {
    id: "roberto",
    title: "Conservadora",
    subtitle: "RF, FII, debênture incentivada e UCITS",
    description: "Boa para cliente em dia, com carteira defensiva e baixa fricção fiscal.",
    sourceClientId: "cli_roberto",
  },
];

export function buildPortfolioTemplateOperations(
  templateId: PortfolioTemplateId,
  clientId: string,
  vehicleId: string,
): Operation[] {
  const template = PORTFOLIO_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return [];

  return getOperationsForClient(template.sourceClientId).map((operation) => ({
    ...operation,
    id: `template_${templateId}_${clientId}_${operation.id}`,
    vehicleId,
    note: `Carteira modelo: ${template.title}`,
  }));
}
