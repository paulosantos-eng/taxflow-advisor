# Como rodar o MVP TaxFlow Advisor

Guia prático e direto.

## Pré-requisitos

- Node.js 18 ou superior (verifica com `node -v`)
- npm (vem junto com Node)
- Windows PowerShell, ou terminal qualquer

## Rodar localmente (5 minutos)

```powershell
cd D:\PAULO\PROJETOS\taxflow-advisor
npm install
npm run dev -- -p 3333
```

Espera o terminal mostrar:
```
- Local:        http://localhost:3333
✓ Ready in X.Xs
```

**Abre no navegador:** http://localhost:3333

**O terminal precisa ficar aberto enquanto você usa o app.** Quando quiser parar, aperta Ctrl+C.

## O que você vai ver

### Dashboard de clientes (rota /)

- Métricas agregadas (3 clientes, AUM total, IR projetado, economia)
- Alerta no topo se algum cliente tem ação fiscal pendente
- Lista dos 3 clientes:
  - **João Mendes** (R$ ~2M) — advogado, dispara Lei 15.270 em abril
  - **Marina Costa** (R$ ~7M) — dispara Lei 15.270 todo mês, alta renda
  - **Roberto Lima** (R$ ~7,5M) — aposentado conservador, em dia

### Ficha do cliente (clica em qualquer um)

- Header com avatar preto, idade, CPF mascarado
- Badge "Pessoa Física" + placeholder "+ Adicionar veículo"
- 4 métricas: Patrimônio a mercado, Ganho latente, IR projetado, IR latente
- **Tabela de Posições Detalhadas** — clica em "Ações BR" pra expandir e ver PETR4, WEGE3 etc. com:
  - Ticker
  - Quantidade
  - Custo médio
  - Valor atual
  - Ganho latente (verde se positivo)
  - IR se vender hoje
  - % da carteira
- Decomposição do IR em 6 buckets (DARF, progressivo, JCP, Lei 15.270, exterior, IRPFM)
- Card de "Carga efetiva 5 anos" com botão verde "Ver como reduzir"
- Oportunidades identificadas (cards coloridos)
- Calendário fiscal 2026 com eventos automáticos

### Rebalanceador tax-aware (botão vermelho "Rebalancear")

- **CARD GIGANTE no topo:** "Economia projetada em 5 anos: R$ X" (em verde, fonte grande)
- 4 quadrantes: Sem rebalancear 1y vs Tax-otimizado 1y, mesma coisa em 5 anos
- Disclaimer explicando as 5 alavancas usadas no cálculo
- Alocação atual vs proposta lado a lado
- Tabela de Trades sugeridos por **ativo individual** (PETR4 200 cotas, R$ 18k, IR R$ 0)
- Alertas táticos (janela R$ 20k, UCITS, harvesting)

## Como editar regras tributárias (sem mexer em código)

Quando a Receita publicar IN nova ou tributarista corrigir uma alíquota, edita o arquivo:

```
D:\PAULO\PROJETOS\taxflow-advisor\lib\tax-engine\rules-config.json
```

Esse arquivo é a FONTE ÚNICA das regras. Tem campos como:

```json
"renda_variavel_br": {
  "swing_acao": {
    "aliquota": 0.15,
    "isencao_volume_mes": 20000.00,
    ...
  }
}
```

Muda o valor, salva, recarrega o navegador (Ctrl+R). O Next.js detecta a mudança e recompila automaticamente. **Não precisa mexer em código TypeScript.**

## Deploy na Vercel

### Opção 1 — Via GitHub (recomendada)

```powershell
cd D:\PAULO\PROJETOS\taxflow-advisor
git init
git add .
git commit -m "MVP TaxFlow Advisor"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/taxflow-advisor.git
git push -u origin main
```

Aí vai em https://vercel.com/new, importa o repo, aceita defaults (Next.js detectado), Deploy.

### Opção 2 — Via Vercel CLI

```powershell
npm i -g vercel
cd D:\PAULO\PROJETOS\taxflow-advisor
vercel
```

Segue os prompts. Em ~1 minuto recebe URL pública tipo `taxflow-advisor.vercel.app`.

## Problemas comuns

### `npm install` muito lento ou trava
- Tenta com `npm install --no-audit --no-fund --prefer-offline`
- Se persistir, deleta `node_modules` e `package-lock.json` e tenta de novo

### "Port 3333 já em uso"
- Tenta outra porta: `npm run dev -- -p 4000`

### `ERR_CONNECTION_REFUSED` no navegador
- Significa que o servidor não está rodando. Verifica se o terminal mostra "Ready in".
- Se voltou ao prompt sozinho, o servidor crashou — copia o erro e me manda.

### Build falha na Vercel
- Verifica que Node version está em 18+ nas Settings da Vercel
- Confirma que não há erros de TypeScript no build local com `npm run build`

## Estrutura do projeto

```
taxflow-advisor/
├── app/                              # Páginas Next.js (App Router)
│   ├── layout.tsx                    # Layout com Sidebar
│   ├── page.tsx                      # Dashboard
│   └── clients/[id]/
│       ├── page.tsx                  # Ficha do cliente
│       └── rebalance/page.tsx        # Rebalanceador
├── components/                       # Componentes UI
│   ├── sidebar.tsx                   # Sidebar preta Suno
│   ├── positions-table.tsx           # Tabela de posições com drill-down
│   ├── savings-projection.tsx        # Card de economia (Rebalanceador)
│   ├── client-row.tsx                # Linha da lista de clientes
│   ├── metric-card.tsx               # Card de métrica
│   ├── allocation-bars.tsx           # Barras de alocação
│   └── opportunity-card.tsx          # Card de oportunidade
├── lib/
│   ├── tax-engine/
│   │   ├── types.ts                  # Tipos TS
│   │   ├── rules-config.json         # ⭐ REGRAS TRIBUTÁRIAS (edita aqui)
│   │   ├── loader.ts                 # Carrega rules-config.json
│   │   ├── rules.ts                  # API estável (consome do loader)
│   │   └── engine.ts                 # Núcleo de cálculo (430 linhas)
│   └── data/
│       └── mock-clients.ts           # 3 clientes mock (João, Marina, Roberto)
├── package.json
├── tailwind.config.ts                # Paleta Suno
├── tsconfig.json
└── README.md
```

---

**Quando algo der errado, primeiro: olha o terminal onde o `npm run dev` está rodando. Erros aparecem lá.**
