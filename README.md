# TaxFlow Advisor — MVP Demo

Gestão de carteira ciente de imposto para consultores brasileiros, sob Lei 14.754/2023 e Lei 15.270/2025.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Lucide icons
- Tax Engine em TypeScript puro (sem dependências externas)

## Estrutura

```
taxflow-web/
├── app/                    # Páginas Next.js (App Router)
│   ├── layout.tsx
│   ├── page.tsx            # Dashboard de clientes
│   └── clients/[id]/
│       ├── page.tsx        # Ficha do cliente
│       └── rebalance/      # Rebalanceador tax-aware
├── components/             # Componentes UI
├── lib/
│   ├── tax-engine/         # Núcleo de cálculo (porta do PoC Python)
│   │   ├── types.ts
│   │   ├── rules.ts        # Regras versionadas (em produção: YAML)
│   │   └── engine.ts       # Engine event-driven
│   └── data/
│       └── mock-clients.ts # 3 clientes mock (João, Marina, Roberto)
└── tailwind.config.ts
```

## Como rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`.

## Como fazer deploy na Vercel

### Opção 1 — via interface (mais simples)
1. Suba este diretório para um repositório GitHub
2. Acesse https://vercel.com/new
3. Importe o repositório
4. Aceite os defaults (Next.js detectado automaticamente)
5. Deploy → URL pública gerada em ~1 minuto

### Opção 2 — via CLI
```bash
npm i -g vercel
vercel
# segue prompts; aceitar defaults
```

## O que está no MVP

- **Dashboard de clientes** — lista com status (em dia / atenção / alerta), AUM, IR projetado, métricas agregadas.
- **Ficha do cliente** — patrimônio, decomposição do IR, alocação por classe, oportunidades identificadas pelo engine, calendário fiscal.
- **Rebalanceador tax-aware** — alocação atual vs proposta lado a lado, trades sugeridos com custo fiscal estimado, alertas táticos, comparativo de 3 cenários em 5 anos.

## Os 3 clientes mock

- **João Mendes** (R$ 4M) — advogado tributarista, carteira mista, dispara Lei 15.270 em abril
- **Marina Costa** (R$ 7M+) — sócia executiva, alta renda, dispara IRPFM
- **Roberto Lima** (R$ 6M) — aposentado, carteira conservadora, em dia

## O que falta para virar produto cobrável

Esta é uma demo navegável. Para virar produto:
- Autenticação multi-tenant (Clerk, Auth0, ou Vercel Auth)
- Banco de dados (Vercel Postgres / Supabase)
- Importação de CSV de corretoras (parsers por broker)
- Tax Engine completo (cobertura das 9 classes — atualmente cobre RV BR, FII, RF básico, dividendos, exterior, IRPFM)
- Validação tributarista parceiro
- LGPD compliance

Estimativa: 4-6 meses com equipe de 3-4 pessoas.

## Arquivos relacionados ao projeto

Na pasta `outputs/` do projeto-mãe estão os artefatos de planejamento:
- `plano_app_rebalanceamento_tributario.md` — plano de produto completo
- `MGT_*.md` — Matriz de Granularidade Tributária por classe (6 capítulos)
- `sketches_5_telas_criticas.md` — briefing UX detalhado
- `tax_engine_arquitetura.md` — arquitetura técnica
- `tax_engine_poc.py` — PoC executável em Python
- `deck_investidor_storyline.md` — storyline do deck investidor
