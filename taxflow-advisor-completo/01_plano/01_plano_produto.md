# Plano de Produto — App de Rebalanceamento e Otimização Tributária

**Codinome de trabalho:** TaxFlow Advisor
**Público:** Consultores de investimento (B2B2C) gerenciando carteiras de clientes
**Plataforma:** Web responsivo
**Data:** 08/05/2026

---

## 1. Tese e visão

Consultor brasileiro hoje opera com Excel + planilhas terceirizadas + apuração contábil reativa. O cliente perde dinheiro em três frentes invisíveis: (i) DARF não compensado contra prejuízos, (ii) janela de R$ 20k/mês de isenção desperdiçada em swing, (iii) decisões de veículo (PF vs holding vs offshore) sem cálculo do delta tributário. Com a Lei 14.754/2023 e a Lei 15.270/2025, a complexidade saltou: come-cotas em fundos fechados, IRPFM, IRRF de 10% sobre dividendos > R$ 50k/mês, regime único de 15% para ativos no exterior. **A tese é que o consultor de investimentos vai precisar de uma ferramenta de tax-aware portfolio management ou perde relevância.** Nosso produto é essa ferramenta.

A visão de uma frase: *o consultor abre o app pela manhã e em uma única tela enxerga, por cliente, quanto imposto ele está a caminho de pagar, quais movimentos tributários ainda dão pra fazer no mês/ano, e o impacto de cada rebalanceamento antes de executá-lo.*

## 2. Decisões já tomadas

Para tirar do limbo:

| Eixo | Decisão |
|------|---------|
| Público-alvo MVP | Consultores B2B2C (não DIY direto) |
| Escopo de ativos | BR completo + internacional (Lei 14.754) + veículos (PF, PJ, holding, offshore PIC, trust) |
| Origem de dados MVP | Importação CSV + entrada manual |
| Plataforma MVP | Web responsivo |

## 3. Persona principal

**Renato, 38, planejador CFP em escritório de assessoria.** Carteira de 60-80 clientes, ticket médio R$ 1,5M. Hoje usa Excel + Money Manager + sistema da home broker. Sua dor real: quando o cliente liga em dezembro perguntando "como reduzo meu IR?", Renato leva 2 dias para responder com cálculo confiável. Quando recomenda um rebalanceamento (trocar FIA por FII, por exemplo), ele *acha* que o impacto fiscal é OK, mas não roda o número.

Persona secundária: **Helena, sócia de family office**, lida com 8-12 famílias com PF + holding + offshore + trust. Para ela, o desafio é a consolidação multi-veículo e a otimização do IRPFM (que entrou agora em 2026).

## 4. Jobs-to-be-done

1. *Quando recebo dados novos do cliente, quero atualizar a posição em < 5 min e ver imposto projetado, sem refazer planilha.*
2. *Quando o cliente quer mudar a alocação, quero simular o trade antes e ver impacto fiscal e quanto sobra líquido depois do imposto.*
3. *Quando o calendário fiscal aperta (DARF, come-cotas, distribuição de dividendos antes de 31/12), quero ser avisado com tempo de agir.*
4. *Quando faço o relatório anual, quero exportar GCAP, controle de custódia e auxiliar de DAA prontos.*
5. *Quando o cliente questiona "vale criar uma holding?", quero rodar um cenário side-by-side com 3 anos de projeção tributária.*
6. *Quando há tax-loss harvesting disponível, quero ser proativamente alertado.*

## 5. Princípios de produto

- **O número certo na primeira tela.** Cada visualização responde a uma pergunta tributária. Sem dashboard genérico.
- **Side-by-side é nativo.** Toda recomendação acompanha cenário "se eu não fizer nada".
- **O calendário pilota o produto.** Datas de DARF, come-cotas, último dia útil de novembro, 31/12 do ano fiscal são triggers nativos da UI.
- **Auditoria total.** Toda apuração é rastreável até a operação que a originou — para se defender da Receita.
- **Multi-veículo é cidadão de primeira classe.** Cliente nunca é uma única conta; é um conjunto de PF + PJ + holding + offshore.
- **Conservadorismo tributário.** Quando regra é dúbia, mostramos as duas interpretações e deixamos consultor escolher (com nota de risco).

## 6. Mapa funcional do MVP

Nove módulos, agrupados em três camadas.

**Camada 1 — Dados.** (a) Importação CSV (notas de corretagem, extratos de custódia, NFe de fundo, eventos corporativos). (b) Lançamento manual com auto-completar e validação. (c) Reconciliação (detecta divergência entre custódia e nota).

**Camada 2 — Tax Engine.** (d) Apuração mensal por classe e por veículo. (e) Apuração anual (DAA, IRPFM, exterior). (f) Simulador what-if (impacto líquido de qualquer operação futura).

**Camada 3 — Decisão.** (g) Rebalanceador tax-aware (alocação alvo vs atual + custo fiscal de cada trade sugerido). (h) Otimização tributária proativa (tax-loss harvesting, uso da janela R$ 20k, timing de JCP, distribuição pré-31/12). (i) Calendário fiscal e relatórios (GCAP, DARF gerada, auxiliar de DAA, relatório executivo para o cliente).

## 7. Arquitetura do Tax Engine

O coração do produto. Quem errar isto entrega um xelim caro de Excel; quem acertar tem moat técnico real.

**Princípios:**
- **Imutável e idempotente.** Toda apuração é função pura de (operações, regras, data). Reapurar o mesmo mês sempre dá o mesmo número.
- **Versionado por regra fiscal.** Lei 14.754 vigora a partir de 01/2024; Lei 15.270 a partir de 01/2026; exemplos. Cada operação é classificada com a "versão de regra" aplicável.
- **Decomposto por dimensão.** Cada operação cruza quatro eixos: classe de ativo, veículo, residência fiscal, regime tributário aplicável.

**Núcleo de regras (um módulo por regime):**

| Módulo | Regra que codifica |
|--------|--------------------|
| `RV_BR` | Swing 15%, day 20%, isenção R$ 20k/mês swing-ações, dedo-duro, prejuízos por classe. |
| `FII_FIAGRO` | Isenção rendimentos PF (com checagem de requisitos), 20% ganho cota, prejuízo por classe. |
| `RF_BR` | Tabela regressiva 22,5/20/17,5/15 por prazo, retenção fonte, isenções (LCI/LCA/CRI/CRA/deb. inc./LIG). |
| `FUND_ABERTO` | Come-cotas semestral, complemento no resgate, classificação CP/LP, FIA isento de come-cotas. |
| `FUND_FECHADO` | Come-cotas pós-Lei 14.754, FIP qualificado (15% só em distribuição), FIDC por prazo médio. |
| `EXTERIOR` | 15% anual, compensação prejuízos exterior x exterior, regime opaco x transparência, FX neutro. |
| `DIV_JCP` | Regime atual + nova regra Lei 15.270/2025 (IRRF 10% > R$ 50k/mês mesma fonte, regra de transição). |
| `IRPFM` | Cálculo da tributação mínima anual (faixas R$ 600k–1,2M), redutor anti-bitributação por carga PJ. |
| `PJ_HOLDING` | Lucro Presumido (presunção 32% aluguel/serviço, 8% imobiliária venda), IRPJ + adicional + CSLL + PIS/COFINS, distribuição PJ→PF. |
| `IRPF_PROG` | Tabela mensal e anual (já com nova faixa de R$ 5k em 2026). |

**Saída do engine, por (cliente, ano-mês):**
- DARF devida por classe e código
- IRRF retido a compensar
- Resultado anual projetado (DAA)
- IRPFM projetado e gap
- Saldo de prejuízos a compensar por categoria
- Calendário de come-cotas
- Eventos relevantes (R$ 20k de venda excedido, gatilho IRRF dividendos, etc.)

## 8. Modelo de dados (esqueleto)

```
Cliente
  └── Veículo (PF, PJ, Holding, Offshore PIC, Trust, FII institucional)
        ├── Conta_Custódia (B3, broker BR, broker exterior, custodiante)
        │     └── Posição (calculada a partir de operações)
        │           └── Operação (compra, venda, JCP, dividendo, amortização, evento corporativo, ...)
        ├── Apuração_Mensal (output do engine)
        ├── Apuração_Anual
        └── Documento (nota PDF, CSV, extrato — origem auditável)

Ativo (catálogo global)
  ├── Classe (ação, BDR, ETF_RV, ETF_RF, FII, Fiagro, debênture, CDB, fundo_aberto, fundo_fechado, FIDC, FIP, FIA, exterior_stock, exterior_ETF, ...)
  ├── ISIN, ticker, CNPJ
  ├── Atributos fiscais (incentivada? listado? requisitos FII?)
  └── Histórico de eventos corporativos

Regra_Fiscal (versão temporal)
  ├── Vigência_inicio, Vigência_fim
  ├── Parâmetros (alíquotas, limites)
  └── Referência legal
```

## 9. Fluxos críticos de UX

### 9.1 Onboarding de cliente novo (primeiro uso, ~15 min)

1. Consultor cria cliente → preenche dados básicos (CPF, residência fiscal, regime atual).
2. **Wizard de veículos** — adiciona PF, depois Holding, depois PIC offshore. Cada veículo pede: CNPJ se aplicável, regime tributário, contas de custódia.
3. **Importação CSV** por conta de custódia. Sistema mostra preview, mapeia colunas (com templates por broker), e roda validação. Erros vão pra fila de correção.
4. **Snapshot de abertura** — consultor confirma posição inicial (ou deixa o sistema reconstruir a partir do histórico).
5. **Primeira tela de payoff** — em < 30 segundos, consultor vê: posição consolidada, prejuízo acumulado por classe, calendário fiscal pendente, alertas vermelhos.

> **Princípio de UX:** o sucesso do onboarding é "o consultor saiu da tela com pelo menos uma informação que ele não sabia". Se ele apenas viu a planilha replicada, falhamos.

### 9.2 Atualização mensal (rotina, ~5 min por cliente)

1. Consultor abre cliente → vê banner "novas notas de novembro" (após upload).
2. Sistema reconcilia, mostra divergências em vermelho (ex.: dividendo recebido em conta sem operação correspondente).
3. Consultor resolve divergências (1 clique para aceitar, ou ajusta manualmente).
4. **Apuração mensal** roda automaticamente. DARF gerada com QR/PIX pronto pra pagamento.
5. Tela de fechamento do mês: o que foi pago, o que sobrou de prejuízo, o que mudou na projeção anual.

### 9.3 Rebalanceamento tax-aware (~10-30 min por cenário)

A tela mais importante do produto.

```
┌──────────────────────────────────────────────────────────────────┐
│ Cliente: João Silva  •  Veículo: PF                              │
├──────────────────────────────────────────────────────────────────┤
│ Alocação atual  →  Alocação alvo                                 │
│  RV BR    42% ─────────► 30%   (-12pp / -R$ 240.000)              │
│  RF BR    28% ─────────► 35%   (+7pp  / +R$ 140.000)              │
│  FII      15% ─────────► 15%   (=)                                │
│  Exterior 15% ─────────► 20%   (+5pp  / +R$ 100.000)              │
├──────────────────────────────────────────────────────────────────┤
│ TRADES SUGERIDOS                  Custo fiscal     Líquido sobra  │
│ Vender PETR4 (lote 1)   R$ 80k    +R$ 0  (≤ R$20k!) R$ 80.000     │
│ Vender VALE3 (lote 2)   R$ 80k    +R$ 5.250         R$ 74.750     │
│ Vender BOVA11           R$ 80k    +R$ 4.800         R$ 75.200     │
│ ...                                                                │
│                                                                    │
│ ⚠ Alerta: dividir vendas em 4 meses para usar a janela de         │
│   isenção de R$ 20k/mês economiza R$ 14.250 em IR.                │
│                                                                    │
│ [Ver cenário otimizado] [Aplicar rebalanceamento]                 │
└──────────────────────────────────────────────────────────────────┘
```

Características críticas:
- Cada trade mostra custo fiscal isolado e líquido recebido.
- Algoritmo "spread" — distribui vendas em múltiplos meses para esfregar a janela R$ 20k.
- Detecta lotes específicos com prejuízo (tax-loss harvesting) e prioriza.
- Mostra "se em vez de vender ação, distribuir JCP da operacional, economiza X" quando há holding.

### 9.4 Painel anual / planejamento de fim de ano (uso intenso em out-dez)

Dashboards específicos:
- **Saúde do IR-PF anual** — projeção da DAA com a posição atual.
- **IRPFM** — quanto falta para entrar na faixa, quanto pagar se nada mudar, alavancas (rendimentos isentos visíveis no cálculo).
- **Janela de transição Lei 15.270** — destaca lucros apurados até 2025 ainda não distribuídos; calcula janela ótima de distribuição até 31/12/2025 (já passada em 2026, mas relevante para auditoria) e o efeito da nova regra a partir de 2026.
- **Come-cotas projetada** (maio e novembro) com estimativa de retenção.

### 9.5 Cenários comparativos (decisões estruturais)

Telas para perguntas grandes: "vale criar holding?", "vale levar dividendos para offshore?", "vale converter FIA em fundo aberto?". Cada cenário roda projeção 3-5 anos com tributação completa, side-by-side.

## 10. Mapa de telas (information architecture)

```
[Login do consultor]
   └── [Dashboard de clientes]
         ├── alertas globais (DARFs vencendo, divergências, oportunidades)
         ├── lista filtrável (com sinal de "saúde tributária" por cliente)
         └── ações em lote (ex.: gerar relatório anual de todos os clientes)

[Cliente individual]
   ├── Visão consolidada (cabeçalho com todos os veículos, patrimônio total, IR projetado)
   ├── Veículo
   │     ├── Posição
   │     ├── Operações (timeline)
   │     ├── Apuração (mês a mês, ano)
   │     └── Documentos
   ├── Rebalanceador
   ├── Cenários (PF vs holding, offshore vs onshore, etc.)
   ├── Calendário fiscal
   ├── Relatórios (GCAP, auxiliar DAA, executivo)
   └── Configurações (perfil, residência fiscal, regime)

[Engine de regras] (não é tela, mas é módulo administrável)
   └── Versão de regras fiscais (admin) — controle de versão das regras com histórico
```

## 11. Stack técnica recomendada

**Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + TanStack Query. Tabela densa: TanStack Table. Gráficos: Recharts ou Visx. Forms complexos: React Hook Form + Zod.

**Backend de aplicação:** Node.js (Nest.js) com PostgreSQL. tRPC ou GraphQL para o BFF.

**Tax Engine:** **serviço separado em Python** (FastAPI + Pydantic). Justificativa: regras fiscais são DSL natural em Python; pandas/numpy aceleram apuração; testes de regressão tributária ficam mais legíveis. Comunica com app via API interna.

**Banco:** PostgreSQL principal. TimescaleDB para séries de cotações se for hospedar dados de mercado.

**Parser de CSV/PDF:** worker em Python (pdfplumber + regex por broker, evoluindo para pequenos modelos de extração depois).

**Auth:** Auth0 ou WorkOS (B2B-friendly, suporta SSO de escritórios maiores).

**Infra:** AWS (ECS Fargate ou Lambda + RDS) ou Vercel (front) + Render (back). LGPD: dados sensíveis criptografados em repouso, logs sem CPF, rotação de chaves.

**Observabilidade:** Sentry + Datadog ou Grafana Cloud.

**Testes do tax engine:** golden files — fixtures de "operações + ano fiscal → apuração esperada" rodando em CI a cada commit.

## 12. Roadmap faseado

**Fase 0 — Discovery profundo (2-3 semanas).** Entrevistas com 10-15 consultores. Validar persona, dores, disposição a pagar. Mapear formatos de CSV dos 5 brokers mais usados.

**Fase 1 — MVP fechado (3-4 meses).** Consultor + cliente PF + holding básica. Importação CSV de XP, BTG, Avenue. Tax engine com módulos `RV_BR`, `FII_FIAGRO`, `RF_BR`, `FUND_ABERTO`, `DIV_JCP`, `PJ_HOLDING`, `IRPF_PROG`. Rebalanceador tax-aware básico. Calendário fiscal. Beta com 5 consultores parceiros.

**Fase 2 — Internacional (3 meses).** Módulo `EXTERIOR` (Lei 14.754), suporte a Avenue/IBKR/Charles Schwab. Offshore PIC (transparência vs opaco). Cenários comparativos. `IRPFM` completo.

**Fase 3 — Estruturas (3 meses).** Trust, FIP/FIDC/exclusivos com come-cotas pós-14.754, sucessão (doação com reserva de usufruto, ITCMD por estado). Importação de NFe e contábil.

**Fase 4 — Inteligência (contínuo).** Otimizador automático de cenários multi-ano. Integração API com brokers (substitui CSV). Mobile companion (alertas no celular). Marketplace de cenários compartilháveis entre consultores do mesmo escritório.

## 13. Pricing (hipóteses iniciais)

Três modelos para validar em discovery:

- **Por consultor (SaaS clássico):** R$ 499/mês por consultor + R$ 50/cliente acima de 30 clientes.
- **Por AUM:** 0,02-0,05% do AUM gerenciado pelo escritório, capped.
- **Híbrido:** licença base por escritório + tier por número de clientes.

Provável vencedor: o híbrido. Escritórios resistem a "por AUM" porque acham que ferramenta é overhead, não taxa.

## 14. Métricas de sucesso

- **Norte:** R$ economizado em imposto por cliente/ano (declarado pelo consultor após uso).
- **Engajamento:** % de clientes do consultor com dados atualizados nos últimos 30 dias.
- **Conversão:** % de cenários simulados que viram operação executada.
- **Confiabilidade:** divergência média entre apuração do app e apuração da contabilidade do cliente (alvo < 0,5%).
- **NPS de consultor:** alvo > 50.

## 15. Riscos e questões abertas

**Riscos altos:**

1. **Acurácia tributária.** Errar IR vira passivo do escritório. Mitigação: contrato de revisão com tributarista sênior + testes de regressão + disclaimers + limite de responsabilidade.
2. **Mudança regulatória.** Receita Federal pode publicar IN que muda interpretação. Mitigação: regras versionadas + processo de atualização rápido (< 30 dias).
3. **Parser de CSV/PDF frágil.** Brokers mudam layout. Mitigação: golden files + testes por broker + UI de "novo formato detectado".
4. **LGPD.** Dado de cliente é dado de terceiro do consultor. Modelo de consentimento e contratos precisa ser cristalino.

**Questões abertas (precisam de decisão antes do código):**

1. Quem é o cliente contratante? O consultor ou o escritório? Define modelo multi-tenant.
2. App é multi-cliente em uma instância (saas puro) ou self-hosted (escritórios grandes pedem)? Recomendo saas puro até 1.000 escritórios.
3. Vamos integrar com sistemas contábeis (Domínio, Contábil365, Sage) ou ficamos só no IR-PF? Recomendo só PF no MVP, contábil depois.
4. Como tratar erros do consultor (ex.: confirmou apuração errada)? Trilha de auditoria + permissão de "amend" assinado.
5. Qual o status legal de "sugestão de trade tax-aware"? Risca consultoria de investimento (CVM 178)? Provável que sim — o produto precisa ser "ferramenta para o consultor", não "sugestão para o cliente". UI deve refletir isso.

## 16. Próximos passos imediatos

1. Validar tese com 5 consultores (1 semana).
2. Decidir codinome e domínio.
3. Contratar tributarista parceiro para revisar matriz de regras.
4. Construir protótipo clicável (Figma) das 3 telas críticas: dashboard de cliente, rebalanceador, painel de fim de ano.
5. Definir escopo exato do MVP em forma de epics + cortar gordura agressivamente.
6. Estruturar testes do tax engine antes do código de tela (test-first paga aqui).

---

*Este plano é um ponto de partida vivo. Prioridade de iteração nas próximas semanas: persona (entrevistas), arquitetura do tax engine (matriz de regras), e protótipos das 3 telas críticas.*
