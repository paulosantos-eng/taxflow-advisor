# TaxFlow Advisor — Pasta de Entrega Completa

Pasta organizada com tudo que produzimos para o projeto **TaxFlow Advisor** — produto de tax-aware portfolio management para consultores brasileiros pós-Lei 14.754/2023 e Lei 15.270/2025.

## O que tem aqui

Tudo organizado em 5 subpastas numeradas por prioridade de leitura/uso.

### 01_plano — Documentos de planejamento

| Arquivo | O que é |
|---------|---------|
| `01_plano_produto.md` | Plano completo do produto (visão, persona, jobs-to-be-done, arquitetura conceitual, roadmap, pricing) |
| `02_sketches_telas.md` | Briefing UX detalhado das 5 telas críticas (Dashboard, Cliente, Rebalanceador, Simulador, Calendário) + design system |
| `03_tax_engine_arquitetura.md` | Arquitetura técnica do motor de cálculo (decisões, padrões, fluxo de dados, como estender) |
| `04_deck_investidor.md` | Storyline de 16 slides + appendix para apresentação a investidor/sócio |

### 02_mgt — Matriz de Granularidade Tributária

**O moat técnico do produto.** 10 capítulos cobrindo todas as classes de ativos relevantes a PF brasileira, no formato declarativo que vira config do tax engine.

| Arquivo | Cobre |
|---------|-------|
| `01_renda_fixa.md` | 19 instrumentos (Tesouro, CDB, debêntures, LCI/LCA/LIG, CRI/CRA, deb. incentivada, COE, poupança) |
| `02_renda_variavel_br.md` | Ações à vista, BDR, opções, futuros, termo, aluguel BTC + 8 eventos corporativos |
| `03_fii_fiagro.md` | FII com 5 requisitos de isenção, Fiagro em 3 subtipos |
| `04_etfs.md` | ETF RV BR, ETF RF BR, ETF exterior (UCITS, acumulação, distribuição), REIT |
| `05_fluxos_pessoa_lei_15270.md` | Salário, pró-labore, dividendos, JCP, aluguel, royalties, pensão, **IRRF Lei 15.270**, **IRPFM** |
| `06_internacional_lei_14754.md` | Stocks/bonds diretos, cripto exterior, offshore PIC, trust, imóveis exterior |
| `07_fundos_abertos.md` | Multimercado, RF, FIA, cambial, FoF — todos com come-cotas |
| `08_fundos_fechados.md` | FIDC, FIP qualificado/não, exclusivos, FIA fechado, FII-IE |
| `09_veiculos.md` | PJ LR/LP/Simples, Holding, Offshore opaca/transparente, Trust, ITCMD |
| `10_consolidacao_transversal.md` | Documento mestre — taxonomia única, matriz cruzada, calendário, hierarquia de cálculo |

### 03_codigo

| Conteúdo | O que é |
|----------|---------|
| `taxflow-web/` | **MVP funcional** em Next.js 14 + TypeScript + Tailwind. 3 telas (Dashboard, Ficha do Cliente, Rebalanceador) + tax engine TS rodando 3 clientes mock (João, Marina, Roberto). Pronto pra deploy Vercel. |
| `tax_engine_poc.py` | Prova de conceito original em Python puro (stdlib only) que demonstra a arquitetura event-driven do engine. Roda o caso do João end-to-end em < 100ms. |

### 04_guias

| Arquivo | O que é |
|---------|---------|
| `EXPLICACAO_SIMPLES.md` | Guia em linguagem direta, sem jargão. Tela por tela, explica o que cada número significa. Tem o pitch de 60 segundos pronto pra investidor. |
| `COMO_RODAR.md` | Passo-a-passo prático para rodar o MVP local e fazer deploy na Vercel. |

### 05_scripts

| Arquivo | O que faz |
|---------|-----------|
| `atualizar_local.ps1` | Script PowerShell que sincroniza a pasta do MVP com qualquer atualização vinda da minha sessão. |

## Por onde começar

Se você é o **fundador / visionário do produto** revisando tudo:

1. Leia `04_guias/EXPLICACAO_SIMPLES.md` — entende o produto em 15 minutos
2. Leia `01_plano/01_plano_produto.md` — visão completa
3. Veja `01_plano/04_deck_investidor.md` — como vender pra investidor
4. Rode o MVP (ver `04_guias/COMO_RODAR.md`)

Se você é o **dev contratado** que vai implementar o produto real:

1. Rode o MVP local primeiro
2. Leia `01_plano/03_tax_engine_arquitetura.md`
3. Estude `10_consolidacao_transversal.md` da MGT
4. Estude cada MGT específica conforme implementar
5. O arquivo `taxflow-web/lib/tax-engine/rules-config.json` é a fonte única das regras tributárias

Se você é o **tributarista parceiro** revisando o conteúdo:

1. Vá direto pra `02_mgt/` — 10 capítulos de especificação tributária
2. Cada arquivo termina com "Lacunas conhecidas" e "Checklist para revisão" — esses são os pontos de validação
3. Edits sugeridos diretamente nos arquivos `.md` ou no `rules-config.json`

## Estado atual do produto

**O que JÁ FUNCIONA:**

- App web rodando localmente
- 3 telas navegáveis com dados calculados em tempo real
- Tax engine que processa 41+ operações do caso João Mendes
- Detecção de gatilho da Lei 15.270 (R$ 50k/mês em dividendos PJ)
- Cálculo de IRPFM com redutor anti-bitributação
- Cálculo de exterior pela Lei 14.754
- Tabela de posições detalhadas com drill-down classe → ativo individual
- Card destacado de "Economia projetada em 5 anos" no Rebalanceador
- Sidebar Suno (preto + vermelho + branco)
- Regras tributárias agora consumidas de `rules-config.json` (não mais hardcoded)

**O que FALTA pra ser produto cobrável:**

- Autenticação multi-tenant (Clerk ou Vercel Auth)
- Banco de dados (Vercel Postgres ou Supabase)
- CRUD de cliente/operação/veículo via UI
- Importação CSV de notas de corretagem
- Atualização de preços via API
- Validação tributarista parceiro
- Testes automatizados de regressão
- LGPD compliance

Estimativa: 4-6 meses com equipe de 3-4 pessoas (~R$ 80-120k).

## Próximos passos sugeridos

1. **Validar com 5 consultores parceiros** antes de gastar capital em dev
2. **Contratar tributarista parceiro** para revisar MGT (R$ 15-25k)
3. **Fazer deploy do MVP atual na Vercel** (1 minuto) para mostrar valor
4. **Decidir estratégia de captação** — anjos vs VC vs bootstrapping
5. **Começar engenharia "real"** depois de validação positiva

## Pitch de 60 segundos (mais detalhes em `04_deck_investidor.md`)

> Lei 14.754 de 2023 e Lei 15.270 de 2025 reescreveram a tributação brasileira. Consultor que atende cliente de R$ 1 milhão pra cima não consegue mais fazer apuração em Excel. Renato, planejador CFP, tem 67 clientes. Quando o cliente liga em dezembro perguntando "como reduzo meu IR?", leva 2 dias pra responder. Quando recomenda um trade, ele acha que o impacto fiscal é OK, mas não roda o número. Construímos a primeira ferramenta de portfólio tax-aware do Brasil. Em uma tela, o consultor vê quanto cada cliente vai pagar, descobre onde está perdendo dinheiro, e gera um plano de rebalanceamento com impacto fiscal calculado em tempo real. O moat é a especificação tributária: temos uma matriz documentada cobrindo 19 instrumentos de RF, 8 eventos corporativos de RV, requisitos de isenção de FII em 5 dimensões, Lei 15.270 com gatilho de R$ 50k/mês e redutor anti-bitributação, e Lei 14.754 com regime opaco vs transparência. Isso leva 12-18 meses pra construir do zero com tributarista qualificado. Estamos buscando R$ 2 milhões pra fazer o MVP virar produto cobrável em 6 meses.

---

**Pasta produzida em sessão colaborativa com Claude (Anthropic) — Maio 2026.**
