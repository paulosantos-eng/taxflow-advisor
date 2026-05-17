# Sketches das 5 Telas Críticas — Briefing para Designer

**Produto:** TaxFlow Advisor (codinome)
**Público:** Consultor de investimentos (B2B2C) atendendo clientes PF com múltiplos veículos
**Plataforma:** Web responsivo
**Estado:** rascunho de produto, base para protótipo Figma clicável de demo investidor

---

## 0. DESIGN SYSTEM BÁSICO

### 0.1 Princípios de design

**1. O número certo na primeira tela.** Cada visualização responde a uma pergunta tributária concreta. Sem dashboard genérico.

**2. Side-by-side é nativo.** Toda recomendação acompanha cenário "se não fizer nada". Sempre que houver decisão, mostrar duas colunas.

**3. Densidade tabelar com respiração visual.** Consultor trabalha com tabelas; o produto não pode esconder dados. Mas precisa de hierarquia clara para o olho.

**4. Calendário como motor.** Datas de DARF, come-cotas, vencimento, gatilhos de R$ 50k são triggers de UI nativos. Tempo é dimensão de primeira classe.

**5. Auditabilidade total.** Toda apuração e toda recomendação são rastreáveis até a operação que as originou. Hover/click sempre revela "por quê este número".

**6. Conservadorismo tributário.** Quando regra é dúbia, mostrar duas interpretações lado a lado com nota de risco.

**7. Multi-veículo é cidadão de primeira classe.** Cliente não é uma conta única; é PF + holding + offshore + trust. UI assume isso desde a estrutura.

### 0.2 Paleta sugerida

- **Primária:** azul corporativo profundo (#0B3D91) — credibilidade, estabilidade
- **Secundária:** verde escuro (#1B5E20) — sinais positivos (economia, isenção, ganho)
- **Crítico/alerta:** âmbar (#E65100) e vermelho (#C62828) — gatilhos fiscais, divergências, riscos
- **Neutros:** cinza-azulado (escala de #F5F7FA a #1A202C)
- **Background:** branco quase puro com leves separadores cinza

Por padrão, NÃO usar verde claro/vivo (vibe de fintech retail) — público é profissional, prefere sobriedade.

### 0.3 Tipografia

- **Sans-serif moderna:** Inter, Söhne, IBM Plex Sans — escolher uma
- **Mono para números:** JetBrains Mono ou IBM Plex Mono — números financeiros sempre em fonte tabular para alinhamento

Hierarquia:
- Display (32-40px): título de tela
- H1 (24px): seção principal
- H2 (18px): subseção
- Body (14px): texto base
- Small (12px): metadata, captions, tooltips
- Mono (14px tabular): valores monetários, percentuais, tickers

### 0.4 Componentes reutilizáveis (atomic)

**Card de métrica** — número grande + label + delta (vs período anterior) + ícone de tendência. Variantes: positivo (verde), negativo (vermelho), neutro (cinza), alerta (âmbar).

**Badge de status** — pill arredondado com cor de fundo + texto curto. Variantes: isento (verde), tributado (azul), alerta (âmbar), crítico (vermelho), latente (cinza).

**Linha de tabela densa** — altura 36-40px, hover destacado, click expande detalhes inline.

**Painel side-by-side** — dois cards lado a lado, "atual" vs "proposto", com delta destacado entre eles.

**Timeline horizontal** — barra com marcos de datas (vencimento DARF, come-cotas, distribuição, etc.). Cada marco é clicável e mostra detalhe em popover.

**Modal de drill-down** — full overlay com a apuração rastreada até a operação. Sempre acessível via click no número.

**Card de oportunidade** — destaque com ícone + valor estimado de economia + CTA "ver detalhe". Tipos: tax-loss harvesting, janela R$ 20k, distribuição pré-31/12, etc.

**Toggle de cenário** — switch ou tabs para alternar entre "real" / "simulado" / "alternativo".

---

## 1. TELA: DASHBOARD DE CLIENTES

### 1.1 Objetivo
Landing do consultor ao logar. Em uma tela, ele enxerga: clientes que precisam de atenção HOJE, eventos fiscais próximos no agregado, oportunidades cross-cliente.

### 1.2 Usuário e contexto
- Renato logou às 8h da manhã
- Ele tem 67 clientes
- Quer saber: o que precisa fazer hoje, esta semana, este mês

### 1.3 Wireframe textual

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Logo] TaxFlow                  [busca]              [+ Novo cliente] [👤] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ Dashboard                                                  Hoje, 11/mai/26 │
│                                                                            │
│ ┌─ ALERTAS HOJE ──────────────────────────────────────────────────────┐    │
│ │  3 DARFs vencem em < 5 dias    [VER]                               │    │
│ │  5 clientes com divergência de CSV importado    [VER]              │    │
│ │  2 clientes próximos do gatilho R$ 50k (Lei 15.270) [VER]          │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ MÉTRICAS DA BASE ────────────────────────────────────────────────┐     │
│ │  67 clientes    R$ 482M sob gestão    R$ 8,2M IR projetado 2026    │     │
│ │                  R$ 1,3M economizados (yoy)                        │     │
│ └────────────────────────────────────────────────────────────────────┘     │
│                                                                            │
│ ┌─ CLIENTES (filtros: status, AUM, alerta) ──────────────────────────┐    │
│ │  [Todos] [Atenção] [Em dia] [Inativos]      [Ordenar: alerta ▼]    │    │
│ │ ┌────────────────────────────────────────────────────────────────┐ │    │
│ │ │ ● João Mendes      R$ 4,1M    🟠 DARF vence em 3 dias          │ │    │
│ │ │ ● Marina Costa     R$ 12M     🔴 IRPFM projetado +R$ 47k       │ │    │
│ │ │ ● Roberto Lima     R$ 6,8M    🟢 Em dia                        │ │    │
│ │ │ ● Helena Almeida   R$ 2,3M    🟠 Divergência CSV outubro       │ │    │
│ │ │ ● Carlos Vieira    R$ 18M     🟢 Em dia                        │ │    │
│ │ │ ● Ana Pereira      R$ 950k    🟠 Janela R$20k não usada Q2     │ │    │
│ │ │ ...                                                            │ │    │
│ │ └────────────────────────────────────────────────────────────────┘ │    │
│ │                                              [Mostrar mais 60]     │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ CALENDÁRIO FISCAL DA SEMANA ──────────────────────────────────────┐    │
│ │  [timeline horizontal com marcos clicáveis]                        │    │
│ │  Hoje ── ter ── qua ── qui ── sex ── sab ── dom                    │    │
│ │   📅      💰     📅          📑                                     │    │
│ │   3 DARF  Come-  2 distr.    1 venc.                               │    │
│ │   venc.   cotas  div PJ      Tesouro                               │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Seções detalhadas

**Cabeçalho da página** — apenas título "Dashboard" + data. Sem subtítulo.

**Alertas de hoje** — card colorido (cinza claro com borda âmbar) listando 2-4 buckets de alerta agregados. Cada linha é clicável; ao clicar, abre lista filtrada de clientes afetados na seção de clientes abaixo. **Não** listar clientes individualmente nos alertas — agregação evita ruído.

**Métricas da base** — 4 KPIs em fila: total de clientes, AUM consolidado, IR projetado total do ano, e "economia gerada vs ano anterior". O quarto é a métrica-norte do produto e tem que estar visível sempre.

**Lista de clientes** — tabela com filtros e ordenação. Colunas: nome, AUM, status visual (ícone colorido + frase curta), última atualização. Click no nome → vai para Ficha do Cliente (tela 2). Hover na linha → preview-card com 3 métricas do cliente.

**Calendário da semana** — timeline horizontal compacta com 7 dias. Marcos visuais para tipos de evento (DARF, come-cotas, distribuição, vencimento, gatilho R$ 50k iminente). Click no marco → modal com lista de clientes/eventos.

### 1.5 Estados
- **Empty (novo escritório, 0 clientes):** card grande com "Adicione seu primeiro cliente" + CTA + texto explicativo do produto
- **Loading:** skeletons das três seções principais
- **Erro de sincronização:** banner amarelo no topo "Última atualização falhou — [tentar de novo]"

### 1.6 Anotações para o designer
- Lista de clientes precisa ser SCROLLABLE infinita — consultores grandes têm 100+ clientes
- Status visual com cor + frase. NÃO usar só cor (acessibilidade)
- O cliente "novo da base" (último 30d) deve ter badge "Novo" sutil
- Considerar atalho de teclado para busca (Ctrl/Cmd + K abre overlay de busca de cliente)

---

## 2. TELA: FICHA DO CLIENTE

### 2.1 Objetivo
Visão 360° de um cliente: todos os veículos, todas as posições, IR projetado, próximos eventos. Ponto de pouso de onde se navega para Rebalanceador, Simulador, operações.

### 2.2 Usuário e contexto
- Renato clicou em "João Mendes" no Dashboard
- Quer entender o estado total antes de tomar qualquer ação

### 2.3 Wireframe textual

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◀ Dashboard    João Mendes / Visão geral                  [⚙ Configurar] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ João Mendes • 38 anos • CPF ***.***.***-XX • SP                            │
│ Patrimônio total: R$ 4,1M  •  IR projetado 2026: R$ 87.300  •  🟠 1 alerta │
│                                                                            │
│ [Visão geral] [Operações] [Apuração] [Documentos] [Cenários]               │
│                                                                            │
│ ┌─ VEÍCULOS ─────────────────────────────────────────────────────────┐    │
│ │ ┌─ PF ─────────────────┐  ┌─ PJ (Lucro Pres.) ─┐                    │   │
│ │ │ R$ 4,1M               │  │ R$ 320k receita/ano  │                  │   │
│ │ │ 13 ativos             │  │ Distribuição R$ 150k │                  │   │
│ │ │ IR proj. R$ 32k       │  │ IR PJ R$ 36k         │                  │   │
│ │ │  [Ver detalhe →]      │  │  [Ver detalhe →]     │                  │   │
│ │ └──────────────────────┘  └────────────────────┘                    │   │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ ALOCAÇÃO ATUAL ─────────────────────────────────────────────────┐      │
│ │  [gráfico donut interativo com hover]                            │      │
│ │  RV BR  30% ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  R$ 1,2M    │      │
│ │  FII    15% ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  R$ 600k    │      │
│ │  RF trib 20% ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  R$ 800k    │      │
│ │  RF isen 15% ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  R$ 600k    │      │
│ │  ETF     5%  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  R$ 200k    │      │
│ │  Ext.   15%  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  R$ 600k    │      │
│ └──────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│ ┌─ PAINEL TRIBUTÁRIO ───────────────────────────────────────────────┐    │
│ │ IR projetado 2026                R$ 87.300                         │    │
│ │   ├─ DARF mensais (RV/FII)       R$ 28.400                         │    │
│ │   ├─ DARF carnê-leão (aluguéis)  R$ 11.200                         │    │
│ │   ├─ IRRF dividendos Lei 15.270  R$ 13.500                         │    │
│ │   ├─ IRPFM (estimado)            R$ 0   🟢 abaixo do gatilho       │    │
│ │   └─ Exterior (Lei 14.754)       R$ 34.200                         │    │
│ │                                                                    │    │
│ │ 📊 [Ver evolução mês a mês]   💡 [Ver oportunidades de otimização] │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ OPORTUNIDADES (3) ────────────────────────────────────────────────┐    │
│ │ 💡 Distribuir R$ 280k de dividendos da PJ antes de 31/dez          │    │
│ │    economiza R$ 28k em IRRF Lei 15.270        [Detalhar →]         │    │
│ │ 💡 Vender VOO e comprar CSPX/UCITS reduz carga 12pp em 5 anos      │    │
│ │    [Detalhar →]                                                    │    │
│ │ 💡 Janela R$ 20k em swing-ações: usar R$ 8k restantes em maio      │    │
│ │    economiza R$ 1.200      [Detalhar →]                            │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ PRÓXIMOS EVENTOS FISCAIS ─────────────────────────────────────────┐    │
│ │ [timeline 30 dias]                                                 │    │
│ │ 14/mai  DARF 6015 abril  R$ 4.230                                  │    │
│ │ 31/mai  Come-cotas multimercado  R$ 2.100 retidos                  │    │
│ │ 12/jun  Vencimento Tesouro Selic 2026  ganho R$ 8.700, IR R$ 1.305 │    │
│ │ ...                                                                │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ [Rebalancear] [Simular cenário] [Calendário completo] [Relatório executivo]│
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Seções detalhadas

**Cabeçalho de identificação** — nome, idade, CPF mascarado, UF. Linha de KPI: patrimônio total, IR projetado anual, ícone de alertas. Click em alerta → drill.

**Tabs de modo** — visão geral (default), operações (timeline), apuração (mês a mês detalhado), documentos (CSVs e notas), cenários (lista de what-ifs).

**Veículos como cards** — cada veículo é um card com 4-5 métricas resumidas. Click → vista detalhada do veículo (sub-página). Cliente pode ter PF + PJ + Holding + Offshore.

**Alocação atual** — donut interativo + barras horizontais com %. Hover em segmento mostra ativos. Click em segmento filtra a tela.

**Painel tributário** — decomposição do IR projetado em 5 buckets: DARF mensais (RV/FII), carnê-leão, IRRF dividendos, IRPFM, exterior. Cada linha mostra o valor; ícones laterais sinalizam status (verde = abaixo de gatilho; amarelo = aproximando; vermelho = vai pagar). Click em linha → drill para detalhamento.

**Oportunidades** — bloco com 1-5 cartões de oportunidade. Cada um: ícone, descrição em uma frase, valor de economia estimado em R$, CTA. Vincular ao Simulador para validação.

**Próximos eventos fiscais** — timeline 30-90 dias com eventos automáticos (DARF, come-cotas, vencimento de RF, distribuição programada, gatilho R$ 50k iminente). Click → detalhe.

**Footer de ações** — 4 botões principais: Rebalancear, Simular cenário, Calendário completo, Relatório executivo (PDF).

### 2.5 Estados
- **Cliente novo (sem dados):** wizard de onboarding em vez do dashboard
- **Sem oportunidades:** card "Carteira otimizada — sem oportunidades agora"
- **Cliente inativo (>90 dias sem atualização):** banner âmbar pedindo atualização
- **Divergência detectada:** banner vermelho "Reconcilie operações de [mês] antes de prosseguir"

### 2.6 Anotações para o designer
- Cards de veículo precisam ser visualmente proporcionais ao AUM (não só métrica numérica)
- Painel tributário é o "centro de gravidade" da tela — destaque visual forte
- Oportunidades têm que ser irresistíveis: cor de destaque, valor em $ grande
- Timeline de eventos: priorizar 7 dias visíveis, com toggle para 30/90

---

## 3. TELA: REBALANCEADOR TAX-AWARE

### 3.1 Objetivo
O **coração do produto**. Mostrar alocação atual vs proposta + IMPACTO FISCAL de cada trade sugerido + alternativas tax-otimizadas + cenário "se não fizer nada".

### 3.2 Usuário e contexto
- Cliente pediu "quero reduzir RV e aumentar exterior"
- Renato abre o rebalanceador para o João
- Quer ver: trades sugeridos, custo fiscal, líquido recebido, alternativas

### 3.3 Wireframe textual

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◀ João Mendes / Rebalancear                       [Salvar cenário] [↻]   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ Rebalanceamento tax-aware                              Veículo: [PF ▼]     │
│                                                                            │
│ ┌─ ALOCAÇÃO ATUAL ──────────┬─ ALOCAÇÃO PROPOSTA ──────────────────────┐  │
│ │ RV BR    42%  R$ 1,72M    │ RV BR    30%  R$ 1,23M   ▼ -R$ 489k       │  │
│ │ RF trib  18%  R$ 738k     │ RF trib  25%  R$ 1,025M  ▲ +R$ 287k       │  │
│ │ RF isen  10%  R$ 410k     │ RF isen  10%  R$ 410k    = R$ 0           │  │
│ │ FII      15%  R$ 615k     │ FII      15%  R$ 615k    = R$ 0           │  │
│ │ Exterior 15%  R$ 615k     │ Exterior 20%  R$ 820k    ▲ +R$ 205k       │  │
│ └───────────────────────────┴──────────────────────────────────────────┘  │
│                                                                            │
│ ┌─ TRADES SUGERIDOS ────────────────────────────────────────────────┐    │
│ │                                            Custo fiscal  Líquido  │    │
│ │ ┌────────────────────────────────────────┬─────────────┬────────┐ │    │
│ │ │ ▼ Vender PETR4 (lote A, 200 cotas)    │  R$ 0 ✓     │ R$ 18k │ │    │
│ │ │   R$ 18.000 — usa janela R$20k de mai │  isenção    │        │ │    │
│ │ │   ganho realizado: R$ 6.200            │             │        │ │    │
│ │ │   [Detalhar lotes]                     │             │        │ │    │
│ │ ├────────────────────────────────────────┼─────────────┼────────┤ │    │
│ │ │ ▼ Vender BOVA11 (parcial 80 cotas)    │  R$ 1.860   │ R$ 38k │ │    │
│ │ │   R$ 40.000                            │  15% sobre  │        │ │    │
│ │ │   ETF não tem isenção R$ 20k 🟡        │  ganho R$ 12k        │ │    │
│ │ ├────────────────────────────────────────┼─────────────┼────────┤ │    │
│ │ │ ▼ Comprar VWCE (UCITS acumulação)     │  —          │ -R$    │ │    │
│ │ │   R$ 200.000                           │             │  200k  │ │    │
│ │ │   carga futura: 15% Lei 14.754 só na   │             │        │ │    │
│ │ │   venda (acumulação = diferimento) 💡  │             │        │ │    │
│ │ ├────────────────────────────────────────┼─────────────┼────────┤ │    │
│ │ │ ... 5 outros trades                    │             │        │ │    │
│ │ └────────────────────────────────────────┴─────────────┴────────┘ │    │
│ │                                                                    │    │
│ │  TOTAIS:     Vendas R$ 489k      IR total R$ 4.700                 │    │
│ │              Compras R$ 489k      Carrego líquido +R$ 484.300       │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ ALERTAS TÁTICOS ──────────────────────────────────────────────────┐    │
│ │ 💡 Dividir vendas em 4 meses usando janela R$20k economiza R$3.840 │    │
│ │    [Aplicar split inteligente]                                     │    │
│ │ 🟡 Vender BOVA11 com ganho de R$12k: considerar harvesting de KNRI11│    │
│ │    (prejuízo latente R$ 5k) para compensar      [Aplicar harvest] │    │
│ │ 💡 Comprar CSPX em vez de VWCE: ambos UCITS acumulação, CSPX tem   │    │
│ │    spread bid-ask menor e mais liquidez                            │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ COMPARATIVO DE CENÁRIOS ──────────────────────────────────────────┐    │
│ │              Não rebalancear  | Rebalancear padrão | Tax-otimizado │    │
│ │ IR 2026       R$ 87.300        | R$ 91.000          | R$ 87.700    │    │
│ │ Retorno proj  +6,2%            | +6,8%              | +6,8%        │    │
│ │ Carga 5 anos  R$ 480k          | R$ 510k            | R$ 460k      │    │
│ │ Risco         alto             | médio              | médio        │    │
│ │                                  [Selecionado]      | [Selecionar] │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ [Voltar à carteira] [Salvar como cenário] [Aplicar e gerar ordens]         │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Seções detalhadas

**Header de seleção** — veículo dropdown (PF / Holding / Offshore) — rebalanceamento é por veículo, não global.

**Alocação atual vs proposta** — duas colunas side-by-side. Cada linha mostra classe, %, R$, e delta. Cor no delta (verde positivo, vermelho negativo). Os alvos da coluna direita são editáveis — consultor pode arrastar slider ou editar % manualmente.

**Trades sugeridos** — tabela expandível. Cada linha: ação (vender/comprar) + ativo + valor + custo fiscal + líquido. Sub-linha com explicação (lote, ganho, alíquota aplicada, contexto). Click "Detalhar lotes" → modal com escolha de lote específico (FIFO, LIFO, ganho menor, custo médio).

**Alertas táticos** — bloco com 3-5 alertas verticais. Cada um propõe ação que o algoritmo não fez por padrão mas pode aplicar (split em meses, harvesting, troca por UCITS, etc.). CTA inline.

**Comparativo de cenários** — tabela 3 colunas: status quo, rebalanceamento padrão, tax-otimizado. Linhas: IR projetado, retorno projetado, carga 5 anos, risco. Linha de seleção com radio button. Aplica-se ao Apply.

**Footer de ações** — 3 botões: voltar (descarta), salvar cenário (não executa, guarda para revisitar), aplicar e gerar ordens (executa — exporta lista de ordens para corretora ou guarda como to-do).

### 3.5 Estados
- **Sem proposta de alvo:** estado vazio com CTA "Defina alocação alvo"
- **Sem trades necessários:** badge verde "Carteira já está alinhada"
- **Conflito (cliente concorda?):** modal antes do apply com lista de trades para confirmar
- **Erro de cálculo:** banner com referência a operação problemática

### 3.6 Anotações para o designer
- A **alternância entre "padrão" e "tax-otimizado"** é uma das interações mais valiosas — destacar visualmente o ganho
- Drill-down em lotes específicos é crítico — design de modal precisa ser denso mas legível
- Cada alerta tático tem que ter valor em $ visível imediatamente
- Coluna "carga 5 anos" no comparativo é o argumento mais forte — destaque visual

---

## 4. TELA: SIMULADOR WHAT-IF

### 4.1 Objetivo
Sandbox de cálculo. Consultor cria hipóteses ("e se vendesse X?", "e se distribuísse dividendo Y antes de 31/12?", "e se migrasse PF para holding?") sem afetar dados reais.

### 4.2 Usuário e contexto
- Cliente pergunta "vale a pena vender minha posição em FII para comprar um terreno?"
- Renato abre o simulador, monta o cenário, mostra para o cliente em uma reunião

### 4.3 Wireframe textual

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◀ João Mendes / Simulador        Cenário: "Vender FII p/ terreno" [💾]    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ Simulador What-If                                                          │
│ [+ Adicionar evento]  [↺ Resetar cenário]   [Cenários salvos ▼]           │
│                                                                            │
│ ┌─ EVENTOS NO CENÁRIO (4) ──────────────────────────────────────────┐    │
│ │ ┌──────────────────────────────────────────────────────────────┐ │     │
│ │ │ 1. 15/jul/26 — Vender KNRI11 (300 cotas)  R$ 48.000          │ │     │
│ │ │    Custo médio: R$ 145 → Ganho: R$ 4.500                     │ │     │
│ │ │    IR: R$ 900 (20% FII) [editar] [remover]                   │ │     │
│ │ └──────────────────────────────────────────────────────────────┘ │     │
│ │ ┌──────────────────────────────────────────────────────────────┐ │     │
│ │ │ 2. 15/jul/26 — Vender BTLG11 (200 cotas)  R$ 22.000          │ │     │
│ │ │    Custo médio: R$ 100 → Ganho: R$ 2.000                     │ │     │
│ │ │    IR: R$ 400 (20% FII)                                      │ │     │
│ │ └──────────────────────────────────────────────────────────────┘ │     │
│ │ ┌──────────────────────────────────────────────────────────────┐ │     │
│ │ │ 3. 20/jul/26 — Saída tesouro Selic 2027 (R$ 200k antecipado) │ │     │
│ │ │    Ganho: R$ 12.500 → IR: R$ 1.875 (15% > 720d)              │ │     │
│ │ └──────────────────────────────────────────────────────────────┘ │     │
│ │ ┌──────────────────────────────────────────────────────────────┐ │     │
│ │ │ 4. 30/jul/26 — Aporte em SCHD via Avenue (R$ 250.000)        │ │     │
│ │ │    Sem evento fiscal na compra                               │ │     │
│ │ └──────────────────────────────────────────────────────────────┘ │     │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ IMPACTO CONSOLIDADO (cenário vs base) ───────────────────────────┐    │
│ │                          Base      Cenário     Δ                    │   │
│ │  IR adicional jul/26     R$ 0     R$ 3.175    +R$ 3.175  🟡         │   │
│ │  IR total 2026           R$ 87k   R$ 90,2k    +R$ 3.175             │   │
│ │  Patrimônio em dez/26    R$ 4,1M  R$ 4,18M    +R$ 87k                │   │
│ │  IR sobre dividendos                                                 │   │
│ │   exterior 2026          R$ 34k   R$ 41k      +R$ 7.000  🔴         │   │
│ │  IRPFM estimado          R$ 0     R$ 0        =                     │   │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ PROJEÇÃO 5 ANOS ──────────────────────────────────────────────────┐   │
│ │ [gráfico de linha: patrimônio base vs cenário]                     │   │
│ │ Em 5 anos: base R$ 5,4M | cenário R$ 5,75M | delta +R$ 350k        │   │
│ │ Carga tributária acumulada 5 anos: +R$ 18k no cenário              │   │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ ALERTAS NO CENÁRIO ──────────────────────────────────────────────┐    │
│ │ 🟡 SCHD distribui dividendo trimestral; carga total ≈ 40%          │    │
│ │     considerar VUSA/CSPX (UCITS) para reduzir carga                │    │
│ │ 🟢 Vendas FII somam R$ 70k — não ultrapassa nada                   │    │
│ │ 🟢 IRPFM segue em zero (renda total < R$ 600k)                     │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ [Comparar com outros cenários] [Exportar PDF para cliente] [Aplicar]       │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Seções detalhadas

**Header com nome de cenário** — input editável. Botões para salvar, resetar, abrir cenários salvos.

**Eventos no cenário** — lista vertical de eventos hipotéticos. Cada um é um card com: data + ativo + ação + valor + impacto fiscal calculado. Botões para editar e remover. CTA "+ Adicionar evento" abre modal de seleção de tipo (venda/compra/distribuição/migração de veículo/etc.).

**Impacto consolidado** — tabela base vs cenário, com diff e cor de sinal. Linhas: IR mensal, IR anual, patrimônio em fim de ano, IR dividendos exterior, IRPFM. Cada linha clicável → drill no detalhe.

**Projeção 5 anos** — gráfico de linha comparando patrimônio (base vs cenário). Embaixo, métricas finais.

**Alertas no cenário** — feedback inteligente sobre escolhas no cenário. Pode ser positivo (cenário OK) ou negativo (achou ineficiência ou alerta).

**Footer** — comparar cenários (modal com matriz), exportar PDF, aplicar (move cenário hipotético para real).

### 4.5 Estados
- **Cenário vazio:** card de boas-vindas com 3 templates ("vender ativo X", "criar holding", "distribuir dividendo PJ")
- **Cenário inviável:** banner vermelho com motivo (ex.: posição insuficiente)
- **Cenário salvo:** indicador "Salvo às HH:MM"

### 4.6 Anotações para o designer
- Eventos têm que ser fáceis de adicionar — fluxo deve ser leve
- Comparar cenários é uma das features mais demanded — preparar UI para matriz de comparação 2-5 cenários
- Exportar PDF é importante para apresentar ao cliente em reunião — design do PDF deve ser pensado também

---

## 5. TELA: CALENDÁRIO FISCAL

### 5.1 Objetivo
Mostrar TODOS os eventos fiscais futuros (DARFs, come-cotas, vencimentos, distribuições programadas, gatilhos Lei 15.270) por cliente ou agregado, com priorização.

### 5.2 Usuário e contexto
- Início de mês, Renato quer ver o que precisa fazer
- Ou fim de ano, quer ver oportunidades de timing

### 5.3 Wireframe textual

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◀ Dashboard / Calendário fiscal                  Filtros: [todos os clientes] [todos os eventos] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ Calendário Fiscal              [📅 Mês] [📆 Trimestre] [📋 Lista]           │
│                                                              MAIO 2026     │
│                                                                            │
│ ┌──────────────────────────────────────────────────────────────────┐     │
│ │       seg     ter     qua     qui     sex     sab     dom        │     │
│ │       1       2       3       4       5       6       7          │     │
│ │       •📅2    •💰1    •      •📑1    •      •      •            │     │
│ │       8       9       10      11      12      13      14         │     │
│ │       •      •      •      •      •      •      •📅3            │     │
│ │       15      16      17      18      19      20      21         │     │
│ │       •      •📅4    •      •      •      •      •              │     │
│ │       22      23      24      25      26      27      28         │     │
│ │       •      •      •      •      •      •      •              │     │
│ │       29      30      31      ◀──── último dia útil mês          │     │
│ │       •      •      •💰💰💰  ◀ come-cotas semestral              │     │
│ └──────────────────────────────────────────────────────────────────┘     │
│                                                                            │
│ ┌─ HOJE — 11 de Maio ────────────────────────────────────────────────┐    │
│ │ ❗ 3 DARFs 6015 vencem amanhã (12/mai)                              │    │
│ │   • João Mendes:  R$ 4.230  [Gerar DARF]                           │    │
│ │   • Helena A.:    R$ 1.870  [Gerar DARF]                           │    │
│ │   • Carlos V.:    R$ 6.700  [Gerar DARF]                           │    │
│ │                                                                    │    │
│ │ 💡 2 clientes próximos do gatilho R$ 50k Lei 15.270                │    │
│ │   • Marina Costa: R$ 38k pago em mai; provável R$ 60k até fim mês   │    │
│ │     [Ver alternativas]                                             │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ ESTA SEMANA ──────────────────────────────────────────────────────┐    │
│ │ 14/mai (qua) — DARF 6015 abril (3 clientes)                       │    │
│ │ 14/mai (qua) — Distribuição programada PJ Mendes Adv.: R$ 60k     │    │
│ │ 17/mai (sex) — Venc. Tesouro Selic 2026 (2 clientes)              │    │
│ │ 17/mai (sex) — Distribuição mensal FII KNRI11 (12 clientes)        │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ PRÓXIMOS 30 DIAS ─────────────────────────────────────────────────┐    │
│ │ [tabela com colunas: data, evento, cliente, valor, ação]           │    │
│ │ ...                                                                │    │
│ └────────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│ ┌─ PRÉ-FIM DE ANO (oportunidades de timing) ────────────────────────┐    │
│ │ 💡 Janela R$ 20k swing-ações: 12 clientes ainda não usaram        │    │
│ │ 💡 Lucros 2025 sob transição: 3 clientes têm distribuição pendente│    │
│ │ 💡 Tax-loss harvesting: 8 clientes com prejuízo latente >R$ 10k   │    │
│ └────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Seções detalhadas

**Toggle de visualização** — mês (calendário grid), trimestre (timeline horizontal), lista (tabela densa). Default = mês.

**Calendário grid** — dias do mês com ícones de evento. Cores por urgência (vermelho = vence hoje/amanhã; âmbar = esta semana; cinza = depois). Click no dia → expande detalhes na seção abaixo.

**Hoje destacado** — eventos urgentes em card próprio. Mais saliente quando há "vence amanhã".

**Esta semana** — lista vertical com 7 dias, eventos por dia.

**Próximos 30 dias** — tabela densa, sortável, filtrável.

**Pré-fim de ano** — bloco especial visível em Q4 (out-dez) ou sob demanda. Lista de oportunidades temporais (janelas R$ 20k, transição Lei 15.270, harvesting).

### 5.5 Estados
- **Sem eventos:** card "Calendário tranquilo no período" + ícone calmo
- **Sobrecarga (>20 eventos numa semana):** alerta + filtros sugeridos
- **Past due (DARF atrasada):** vermelho intenso + cálculo de multa atualizado

### 5.6 Anotações para o designer
- Calendário precisa ser legível em mobile (responsivo) — eventos são essenciais para alerta no celular
- Ícones por tipo de evento: DARF (📅), distribuição (💰), vencimento (📑), come-cotas (🔄), gatilho (⚠️)
- Acessar timeline a partir do dashboard é o caminho mais frequente — manter consistência visual entre os dois

---

## 6. TELAS AUXILIARES (pontuadas, não detalhadas)

**Login + auth** — email/senha, opção SSO (Google/Microsoft) para escritórios. Multi-tenant.

**Wizard de onboarding de cliente novo** — 5 passos: dados básicos → veículos → contas de custódia → import CSV → confirmação.

**Importação CSV** — drag&drop + preview + mapeamento de colunas (com templates por broker) + validação + log de erros.

**Listagem de operações** — tabela densa com filtros por veículo, classe, tipo de operação, data. Edição inline.

**Configurações** — perfil, residência fiscal, regime, dependentes, anexos (W-8BEN, etc.).

**Relatório executivo (PDF)** — geração de relatório anual para cliente — capa, posição consolidada, IR pago + projetado, recomendações.

---

## 7. PRINCÍPIOS PARA O FIGMA

1. **Comece pelas 5 telas críticas.** Auxiliares vêm depois.

2. **Use Auto Layout em TUDO.** Densidade tabular sem auto layout vira pesadelo.

3. **Componentize as células de tabela.** Linha de cliente, linha de trade, linha de evento — cada uma é instância de um componente master.

4. **Variants para os badges e cards.** Card de oportunidade tem 5 variantes (harvest, janela R$20k, distribuição, UCITS, holding). Faça os 5 do início.

5. **Tokens de cor com semântica.** `surface/primary`, `surface/elevated`, `text/critical`, `text/success` — não cor solta.

6. **Mobile não é prioridade do MVP** mas teste o dashboard e calendário em 1280px e 1024px no mínimo.

7. **Salve telas como Screens dentro de um Page por seção do produto** (Auth, Onboarding, Dashboard, Cliente, Rebalancear, Simular, Calendário, Config).

8. **Estados sempre nomeados.** Default, Loading, Empty, Error, Success — cada tela com pelo menos 3.

---

*Próximo passo natural após Figma: protótipo clicável com 5-10 caminhos de fluxo navegáveis, para gravar vídeo de demo de 2-3 minutos.*
