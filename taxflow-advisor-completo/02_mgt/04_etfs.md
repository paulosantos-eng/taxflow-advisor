# MGT — Matriz de Granularidade Tributária | ETFs (BR e Exterior)

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência:** 01/01/2026 (com Lei 14.754/2023 e Lei 15.270/2025 em vigor)
**Escopo:** ETFs brasileiros (RV e RF na B3) e ETFs estrangeiros acessados via custódia internacional (Avenue, IBKR, Schwab, etc.)
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine

---

## 0. Glossário (extensão às MGTs anteriores)

| Variável | Significado |
|----------|-------------|
| `tipo_etf` | rv_br / rf_br / exterior |
| `politica_dividendos` | distribuicao / acumulacao |
| `domicilio_fundo` | brasil / eua / irlanda / luxemburgo / outro |
| `pmr_indice` | Prazo médio ponderado do índice de referência (em dias) |
| `aliquota_etf_rf_br` | resultado da `tabela_etf_rf_brasil` |
| `e_ucits` | true se ETF é UCITS (Undertaking for Collective Investment in Transferable Securities), tipicamente Irlanda/Luxemburgo |
| `e_qualificado_ie_lei_12431` | true para ETFs IE (Infraestrutura) com benefício da Lei 12.431 |
| `regime_aplicavel` | rv_acoes_br / rf_etf_lei_14754 / etf_ie_isento / aplicacao_exterior |
| `ganho_anual_exterior` | apuração anual em DAA pela Lei 14.754 |

---

## 0.1 Tabela ETF RF Brasil (regressiva por PMR do índice)

```yaml
tabela: tabela_etf_rf_brasil
referencia_legal: [lei_14754_2023, in_rfb_2154_2023]
descricao: |
  Alíquota é determinada pelo PMR do ÍNDICE de referência do ETF,
  NÃO pelo prazo desde a compra da cota pelo investidor.
faixas:
  - condicao: "pmr_indice <= 180"
    aliquota: 0.25
  - condicao: "180 < pmr_indice <= 720"
    aliquota: 0.20
  - condicao: "pmr_indice > 720"
    aliquota: 0.15
notas:
  - "ARESTA: o prazo é DO ÍNDICE; mesmo se cliente segura há 5 anos, se o índice tem PMR de 90 dias, paga 25%"
  - "Mudança de PMR do índice ao longo do tempo: alíquota é avaliada no momento da venda"
```

---

## I. ETFs BRASIL — RENDA VARIÁVEL (B3)

---

### I.1 Compra

```yaml
classe: etf_rv_br
nome_canonico: "ETF de Renda Variável Brasil (negociado na B3)"
exemplos: [BOVA11, IVVB11, SMAL11, DIVO11, ECOO11, GOVE11]
referencia_legal: [lei_11033_2004, in_rfb_1585_2015]

eventos:
  - id: E1_compra
    tipo: aquisicao
    tributacao: nenhuma
    impacto_custo_medio: padrao_custo_medio_ponderado
    captura: [data_compra, ticker, qtde, preco, corretagem, emolumentos, politica_dividendos]
    notas:
      - "Atributo `politica_dividendos`: maioria dos ETFs BR é ACUMULAÇÃO (BOVA11, IVVB11, SMAL11)"
      - "ETFs distribuição BR são raros: DIVO11 paga distribuição periódica"
```

---

### I.2 Venda

```yaml
  - id: E2_venda_swing
    pre_condicoes: ["compra e venda em pregões diferentes"]
    sub_cenarios:
      - id: tributado
        aliquota: 0.15
        nota: "ARESTA-CRÍTICA: ETF RV BR NÃO TEM A ISENÇÃO DOS R$ 20.000. Diferente de ação, qualquer ganho tributa."
    base_calculo: "ganho_mes = soma(valor_venda - custo_medio_aplicado - corretagem) - prejuizos_acumulados"
    tributacao:
      formula: "max(0, ganho_mes) * 0.15"
      retencao_fonte: dedo_duro_swing  # 0,005% sobre venda
      apuracao: mensal_via_DARF_6015
    captura: [data_venda, qtde, preco, corretagem, ganho]

  - id: E2b_venda_day
    pre_condicoes: ["compra e venda no mesmo pregão, mesma corretora"]
    aliquota: 0.20
    apuracao: mensal_via_DARF_6015
    retencao_fonte: dedo_duro_day  # 1% sobre resultado positivo do dia
    notas:
      - "Day trade em ETF: 20% (mesma alíquota de day em ação)"
      - "Compensação: prejuízo em day-ETF compensa com day-ETF e day-ações (mesma natureza day)"
```

---

### I.3 Marcação intra-período

```yaml
  - id: E4_marcacao
    tributacao: nenhuma
    output: passivo_latente
    captura: [data_snapshot, preco_mercado, ganho_latente, aliquota_se_realizasse_hoje]
```

---

### I.4 Distribuição de dividendos (apenas ETFs de distribuição BR — raros)

```yaml
  - id: E5_distribuicao
    tipo: realizacao_periodica
    descricao: "ETF distribui rendimento aos cotistas (modelo de distribuição)"
    pre_condicoes: [politica_dividendos == "distribuicao", posicao_na_data_de_corte > 0]
    sub_cenarios:
      - id: distribuicao_de_etf_rv
        aliquota: 0.15
        retencao: na_fonte_pelo_administrador
        nota: "Distribuição é tratada como rendimento de RV — tributado a 15%"
      - id: distribuicao_de_etf_imobiliario_que_cumpre_requisitos_fii
        tratamento: "se ETF é estruturado como FII (caso atípico), aplicar regra de FII"
    captura: [data_pagamento, valor_bruto_por_cota, qtde, ir_retido]
    notas:
      - "DIVO11 é exemplo de ETF brasileiro com distribuição; tributa o cotista PF"
      - "Maioria dos ETFs BR de RV é acumulação — esse evento não ocorre"
```

---

### I.5 Eventos corporativos do ETF

```yaml
  - id: EC1_subscricao_de_novas_cotas
    descricao: "Gestor emite cotas novas (raro em ETF aberto — emissão por arbitragem na verdade ocorre constante)"
    notas: ["Cotista comum não participa ativamente; apenas compra no secundário"]

  - id: EC2_desdobramento_da_cota_etf
    tributacao: nenhuma
    impacto_custo_medio: split_padrao

  - id: EC3_grupamento_da_cota_etf
    tributacao: nenhuma
    impacto_custo_medio: grupamento_padrao
    nota: ["Fração de cota em grupamento gera FG pela parte fracionária"]

  - id: EC4_mudanca_de_indice_de_referencia
    descricao: "Gestor anuncia mudança de índice (ex.: IVVB11 muda do S&P 500 para Nasdaq 100)"
    tributacao: nenhuma  # continuidade
    notas:
      - "Mudança de índice NÃO é evento tributário"
      - "Mas pode mudar características (PMR de RF, exposição setorial) que afetam decisões futuras"

  - id: EC5_fechamento_do_fundo
    descricao: "Gestor decide liquidar o ETF"
    sub_cenarios:
      - id: liquidacao_em_dinheiro
        tratamento: "E2 venda forçada ao valor de liquidação"
        aliquota: 0.15  # ou 0.20 se day
      - id: liquidacao_em_ativos
        tratamento: "interpretação CVM/RFB pendente; típico é distribuir em dinheiro"

  - id: EC6_fusao_entre_etfs
    descricao: "Gestor consolida dois ETFs em um"
    tributacao: nenhuma  # continuidade fiscal
    impacto_custo_medio: "novo_custo_medio_em_B = custo_medio_em_A * relacao_de_troca"
```

---

## II. ETFs BRASIL — RENDA FIXA (B3)

---

### II.1 Compra

```yaml
classe: etf_rf_br
nome_canonico: "ETF de Renda Fixa Brasil (negociado na B3)"
exemplos: [B5P211, IRFM11, FIXA11, IMAB11]
referencia_legal: [lei_14754_2023, in_rfb_2154_2023]

eventos:
  - id: E1_compra
    tipo: aquisicao
    tributacao: nenhuma
    captura: [data_compra, ticker, qtde, preco, corretagem, pmr_indice_atual, e_ie_lei_12431]
```

---

### II.2 Venda

```yaml
  - id: E2_venda
    sub_cenarios:
      - id: etf_ie_isento
        condicao: "e_qualificado_ie_lei_12431 == true AND prazo_minimo_180d_cumprido"
        aliquota: 0.00
        nota: "ETF IE (Infraestrutura): isento PF se atender requisitos — Lei 12.431"
      - id: etf_rf_padrao
        usa_tabela: tabela_etf_rf_brasil
    base_calculo: "ganho = max(0, valor_venda - custo_medio - corretagem)"
    tributacao:
      formula: "ganho * aliquota"
      retencao_fonte: na_fonte_pelo_intermediario
      apuracao: na_fonte  # ETF RF é retido pelo intermediário, não DARF mensal
    notas:
      - "ARESTA-CRÍTICA: ETF RF BR é tributado NA FONTE pelo intermediário (B3/corretora) no momento da venda"
      - "Diferente de ETF RV BR que vai para DARF 6015 mensal"
      - "Alíquota é pelo PMR do índice no momento da venda, não pelo prazo desde a compra"
      - "Compensação: prejuízo em ETF RF NÃO compensa com ETF RV nem com ações; categoria isolada (renda fixa)"
      - "ETF IE pode perder isenção se vendido antes de prazo mínimo — verificar regulamento"
```

---

### II.3 Marcação intra-período

```yaml
  - id: E4_marcacao
    tributacao: nenhuma
    output: passivo_latente
    nota: ["ETF RF tem volatilidade — especialmente os de IPCA+ longos (IMAB11)"]
```

---

### II.4 Distribuição (raríssima em ETF RF BR)

```yaml
  - id: E5_distribuicao
    descricao: "Maioria absoluta dos ETFs RF BR é acumulação"
    nota: "Se houver distribuição: tributada como rendimento de RF pelo PMR do índice"
```

---

## III. ETFs DO EXTERIOR (sob Lei 14.754)

---

### III.1 Compra de ETF estrangeiro

```yaml
classe: etf_exterior
nome_canonico: "ETF estrangeiro (NYSE/Nasdaq/LSE/etc., custódia internacional)"
exemplos_eua: [VOO, QQQ, SPY, VTI, AGG, BND, TLT, EFA, EEM]
exemplos_ucits: [VWCE, EUNL, IS3N, EQAC, VUSA, CSPX]
referencia_legal: [lei_14754_2023, in_rfb_2180_2024]

eventos:
  - id: E1_compra
    tipo: aquisicao
    tributacao: nenhuma_na_aquisicao
    captura: [data_compra, ticker, qtde, preco_em_usd, taxa_cambio_compra, custo_em_brl, custodia, politica_dividendos, domicilio_fundo, e_ucits]
    notas:
      - "Custo em BRL deve ser registrado para a apuração anual"
      - "ETFs UCITS (domiciliados em Irlanda/Luxemburgo) — entram aqui mesmo se comprados em corretora americana"
      - "ETF estrangeiro de acumulação: NÃO distribui dividendos — reinveste dentro do fundo"
```

---

### III.2 Venda

```yaml
  - id: E2_venda
    tipo: realizacao
    pre_condicoes: [posicao > 0]
    base_calculo: "ganho_em_brl = (valor_venda_em_brl) - (custo_medio_em_brl)"
    tributacao:
      regime: lei_14754_2023
      aliquota: 0.15
      apuracao: anual_em_DAA
    output: [ganho_anual_exterior, compensacao_com_outras_perdas_exterior]
    captura: [data_venda, preco_em_usd, qtde, taxa_cambio_venda, valor_em_brl, ganho_em_brl]
    notas:
      - "ARESTA-CRÍTICA Lei 14.754: variação cambial NÃO é destacada como ganho separado. Entra no ganho total em BRL."
      - "Prejuízo no exterior compensa com OUTROS GANHOS NO EXTERIOR (mesmo CPF), sem prazo"
      - "Não há retenção na fonte — apuração 100% pelo investidor em maio do ano seguinte (DAA)"
      - "ARESTA: cliente que vende ETF acumulação no exterior realiza o ganho de todos os reinvestimentos automáticos cumulativamente"
```

---

### III.3 Distribuição de dividendos (ETF estrangeiro de distribuição)

```yaml
  - id: E5_distribuicao_anual
    tipo: realizacao_periodica
    descricao: "ETF de distribuição paga dividendos (trimestral, semestral, mensal)"
    pre_condicoes: [politica_dividendos == "distribuicao", posicao_em_carteira > 0]
    tributacao:
      regime: lei_14754_2023
      aliquota: 0.15
      apuracao: anual_em_DAA  # somado a outros rendimentos do exterior do ano
      retencao_pais_origem:
        eua: 0.30  # mas com tratado pode cair para 0 em alguns casos
        irlanda_ucits: 0.00  # UCITS pagam dividendos brutos
        luxemburgo: 0.15
        outros: varia
      credito_de_ir_pago_no_exterior: SIM_via_tratado_quando_aplica
    output: [dividendo_bruto_brl, ir_retido_origem, credito_ir_exterior]
    captura: [data_recebimento, valor_usd, taxa_cambio, valor_brl, ir_retido_origem, retencao_pais]
    notas:
      - "ARESTA: dividendo de ações americanas via ETF americano (ex.: SCHD) tem retenção 30% nos EUA. Tratado Brasil-EUA não cobre dividendos para PF (cobre PJ apenas). Logo: 30% perdido, 15% adicional no Brasil = ~40% de carga."
      - "ARESTA-DECISIVA: ETF UCITS irlandês (ex.: VWCE acumulação, VUSA distribuição) tem retenção EUA REDUZIDA via tratado Irlanda-EUA (15%) ANTES de o ETF receber. Então o cotista recebe 85% e paga 15% no Brasil = ~28% de carga efetiva, vs 40% via ETF americano."
      - "ARESTA: a escolha entre VOO (americano) e VUSA (UCITS) tem impacto tributário ENORME para PF brasileira de longo prazo"
      - "Aresta: UCITS de acumulação (VWCE) elimina dividendo recebido pelo investidor — só tributa na venda (15% sobre todo o ganho acumulado)"
      - "ARESTA: ETF de distribuição em país que NÃO tem tratado com Brasil — verificar individualmente"
```

---

### III.4 Distribuição de retorno de capital (ROC)

```yaml
  - id: E6_return_of_capital
    descricao: "Alguns ETFs (especialmente REITs estrangeiros e MLPs) distribuem ROC — devolução de capital, não rendimento"
    tratamento:
      eua: "ROC reduz custo médio do investidor (similar a amortização de FII)"
      visao_lei_14754:
        nota: "Interpretação consolidada: ROC reduz custo médio também para fins brasileiros, não é rendimento"
    captura: [data, valor_roc, novo_custo_medio]
    notas:
      - "ARESTA: identificar ROC vs dividendo qualified vs ordinary é parte do 1099-DIV americano"
      - "App precisa importar formulário 1099 (ou equivalente) para classificar corretamente"
```

---

### III.5 Eventos corporativos no exterior

```yaml
  - id: EC1_split_grupamento_internacional
    tributacao: nenhuma
    impacto_custo_medio: padrao
    nota: ["Split de ETF americano (raro): mesma lógica de ação"]

  - id: EC2_fusao_de_etfs_internacionais
    tributacao: nenhuma  # continuidade fiscal
    nota: ["Gestor consolida ETFs — Vanguard, BlackRock fazem ocasionalmente"]

  - id: EC3_mudanca_de_indice
    tributacao: nenhuma

  - id: EC4_delisting_e_liquidacao
    sub_cenarios:
      - dinheiro: "E2 venda forçada ao preço de liquidação"
      - migracao_para_outro_etf: "continuidade fiscal"

  - id: EC5_cisao_no_exterior
    descricao: "Spin-off de empresa investida pelo ETF — chega como dividendo em espécie raramente"
    nota: ["Tratamento depende do 1099 americano e da interpretação"]
```

---

### III.6 REITs estrangeiros (subclasse específica)

```yaml
classe: reit_exterior
nome_canonico: "REIT estrangeiro (Real Estate Investment Trust)"
exemplos: [O, AMT, PLD, EQIX, SPG]
caracteristica: "Empresa imobiliária regulada que distribui ≥ 90% do lucro"

eventos:
  - mesma_estrutura_que: etf_exterior
  - particularidade:
      retencao_pais_origem_eua: 0.30
      nota_critica: "Diferente de ações comuns, retenção de dividendo de REIT americano é 30% e não cai para 15% via tratado"
  - aresta:
      - "ROC distributions são comuns em REITs — não tributa no recebimento; reduz custo"
      - "App deve classificar cada distribuição como ordinary income / qualified / ROC"
```

---

### III.7 Aresta-chave: ETF brasileiro que replica índice estrangeiro vs ETF estrangeiro direto

```yaml
aresta_decisao_tributaria_estrutural:
  caso: "Cliente quer exposição ao S&P 500"
  opcoes:
    - ivvb11:
        domicilio: brasil
        custodia: b3
        tributacao_swing: 0.15
        isencao_20k: NAO
        retencao_dividendo_no_etf: 0.30  # já descontado pelo gestor
        compensacao_prejuizo: com_outros_etf_rv_br
        regime: rv_acoes_br
    - voo_americano:
        domicilio: eua
        custodia: corretora_us
        tributacao_venda: 0.15  # Lei 14.754, anual
        retencao_dividendo_eua_acumula: 0.30  # se distribuição
        notas:
          - "VOO de acumulação não distribui — dividendo é reinvestido"
          - "Variação cambial entra no ganho — bom em USD up vs BRL"
    - vusa_ou_cspx_ucits_irlanda:
        domicilio: irlanda
        custodia: corretora_us_ou_europa
        tributacao_venda: 0.15  # Lei 14.754
        retencao_dividendo_eua_subjacente: 0.15  # tratado Irlanda-EUA reduz para 15%
        nota: "Mais eficiente que VOO para cliente brasileiro de longo prazo"

implicacao_otimizador:
  - "Comparar IVVB11 (BR) vs VOO (EUA) vs CSPX (UCITS) por cliente é decisão recorrente"
  - "App deve mostrar 'líquido após carga total' para cada estrutura em projeções de N anos"
```

---

## IV. EVENTOS TRANSVERSAIS E MATRIZ DE COMPENSAÇÃO

---

### IV.1 Matriz de compensação por categoria

```yaml
matriz_compensacao_etfs:
  etf_rv_br_swing_com_etf_rv_br_swing: SIM
  etf_rv_br_swing_com_acao_swing: SIM  # ambos à vista RV
  etf_rv_br_swing_com_etf_rv_br_day: NAO  # swing vs day separados
  etf_rv_br_swing_com_etf_rf_br: NAO  # categorias diferentes (RV vs RF)
  etf_rv_br_swing_com_fii: NAO  # FII tem apuração própria
  etf_rv_br_swing_com_exterior: NAO  # mercados diferentes
  
  etf_rf_br_com_etf_rf_br: NAO  # ETF RF tributado na fonte, sem balde de prejuízo no cotista
  etf_rf_br_com_rf_tributada: NAO  # ETF RF tem regime próprio
  
  etf_exterior_com_etf_exterior: SIM  # dentro de aplicações no exterior Lei 14.754
  etf_exterior_com_stock_exterior: SIM
  etf_exterior_com_bond_exterior: SIM
  etf_exterior_com_etf_br: NAO

notas:
  - "ARESTA: ETF RV BR compensa com ações; isso pode reduzir DARF do mês"
  - "ARESTA: ETF RV BR de acumulação que vende — compensa prejuízo de FII? NÃO. Mesmo sendo ambos 'fundos', são categorias separadas"
  - "Compensação de exterior é dentro da DAA anual; prejuízo do exterior NÃO compensa ganho do Brasil"
```

---

### IV.2 Apuração DARF vs DAA

```yaml
processo: onde_aparece_cada_etf
etf_rv_br_swing: DARF_6015_mensal
etf_rv_br_day: DARF_6015_mensal
etf_rf_br: retido_na_fonte_sem_DARF  # apenas declara em DAA
etf_exterior_acumulacao: DAA_anual_em_maio  # com ganho na venda
etf_exterior_distribuicao: DAA_anual_em_maio  # rendimento + ganho

nota_critica:
  - "App tem que rotear cada operação para o canal certo automaticamente"
  - "Cliente com ETF RV BR e ETF Exterior tem DOIS canais distintos de apuração — não consolidar"
```

---

### IV.3 Diferença critical: acumulação vs distribuição

```yaml
politica_dividendos:
  acumulacao:
    no_fundo: "dividendos das empresas investidas são reinvestidos automaticamente — NÃO chegam ao investidor"
    impacto_tributario: "investidor NÃO tem fato gerador anual; tributa só na venda"
    vantagem: "diferimento — 1 fato gerador em vez de N"
    risco: "concentra o IR no final; sem compensação ano a ano"
    exemplos_internacionais: [VWCE, CSPX, EQAC]
  distribuicao:
    no_fundo: "dividendos das empresas investidas são distribuídos aos cotistas"
    impacto_tributario: "FG no recebimento; tributa anual (Lei 14.754) ou na fonte (BR)"
    vantagem: "fluxo de caixa para o investidor; renda recorrente"
    desvantagem: "tributação a cada distribuição"
    exemplos_internacionais: [VUSA, SCHD, VYM, VIG]
    exemplos_br: [DIVO11]
```

---

## V. ARESTAS NÃO ÓBVIAS

---

### V.1 Aresta da escolha geográfica (BR vs EUA vs UCITS)

Detalhada em III.7 — escolha de domicílio do ETF para mesma exposição econômica pode mudar carga efetiva em 12-15 pontos percentuais em longo prazo. Otimizador do app DEVE ter comparativo.

---

### V.2 Aresta do ETF RF com PMR variável

PMR do índice pode mudar ao longo do tempo (rebalanceamento do índice ou mudança de composição). Cliente que compra ETF com PMR de 800 dias (15%) e vende quando o PMR caiu para 600 dias (20%) — paga 20%. App precisa rastrear PMR do índice ao longo do tempo, não como atributo estático.

---

### V.3 Aresta da retenção EUA via "qualified intermediary"

Corretora internacional como agente qualificado (Avenue, IBKR) retém 30% sobre dividendos americanos de PF brasileira que NÃO firmou W-8BEN, ou conforme o tratado quando firmou. Aresta: status W-8BEN do cliente é dado crítico para o app rastrear.

---

### V.4 Aresta dos ETFs Brasileiros de Infraestrutura (Lei 12.431)

ETFs de RF brasileiros que investem em debêntures incentivadas (FI-Infra) podem manter isenção para PF se atendem requisitos (estrutura tipicamente ≥ 85% em debêntures incentivadas). App deve ter atributo `e_qualificado_ie_lei_12431` por ETF.

---

### V.5 Aresta do FII de ETF (raríssimo) e ETF de FIIs

Existem produtos híbridos como "ETF de FIIs" — fundo cuja cesta é cotas de FIIs. Tributação: como ETF RV BR (15% no ganho), perdendo o regime privilegiado de rendimento mensal isento que cada FII subjacente teria isoladamente. App deve mostrar essa armadilha quando cliente avalia esse tipo de produto.

---

### V.6 Aresta da venda fracionada de ETF de acumulação no exterior

Cliente compra VOO ao longo de 10 anos com aportes mensais. Quer vender 50% da posição. Cada lote tem custo diferente, mas a Lei 14.754 trabalha com **custo médio em BRL**, não com lotes específicos. App deve calcular custo médio ponderado em BRL considerando o câmbio de CADA aporte.

---

### V.7 Aresta dos dividendos qualified vs ordinary nos EUA

Dividendos de ações americanas dentro de um ETF americano são classificados em "qualified" (taxa reduzida nos EUA) ou "ordinary" (taxa normal). Para o investidor brasileiro, retenção é 30% em ambos. Mas a classificação afeta a tributação americana do ETF e indiretamente o líquido distribuído. Aresta: app não precisa rastrear essa classificação em detalhe, mas pode mostrar como "dado bruto" para auditoria.

---

### V.8 Aresta da contribuição na carteira-modelo do consultor

Consultor que recomenda "30% em renda variável internacional" tem 3 jeitos de implementar: IVVB11 (BR), VOO (EUA acumulação), VUSA (UCITS distribuição). Cada um gera carga efetiva diferente para o mesmo retorno bruto. App deve mostrar comparativo no rebalanceamento.

---

## VI. LACUNAS CONHECIDAS

1. **ETFs ativos (não passivos)** — fundos ETF gestionados ativamente como ARKK; tributação igual mas perfil diferente.
2. **ETFs alavancados (3x, 2x, inverse)** — tributação como ETF normal; perfis de risco únicos não tributários.
3. **ETFs de criptoativos** — IBIT (BlackRock Bitcoin ETF) e similares: tratamento como ETF estrangeiro pela Lei 14.754? Ou regime específico de cripto? Tema em aberto.
4. **ETFs do Canadá, UK, Japão** — não cobertos em detalhe; cada mercado tem retenção de dividendo própria.
5. **Tratamento de "options on ETFs"** — comprar puts/calls em SPY (NYSE): trata como opção da B3 ou aplicação no exterior? Interpretação pendente.
6. **Reinvestimento automático de dividendos (DRIP)** — em ETFs americanos de distribuição com plano de reinvestimento; FG no recebimento + aquisição de novas cotas pelo valor reinvestido.
7. **ETFs Brasileiros que mudaram regime tributário com Lei 14.754** — alguns ETFs RF antes eram 15% fixo; após 14.754 viraram tabela regressiva por PMR. Cliente com ETF comprado antes pode ter dúvida sobre regime aplicável.

---

## VII. CHECKLIST PARA REVISÃO DO TRIBUTARISTA

- [ ] ETF RV BR coberto (swing 15% sem isenção R$ 20k, day 20%)
- [ ] ETF RF BR coberto (tabela regressiva por PMR do índice)
- [ ] ETF IE Lei 12.431 com isenção para PF
- [ ] ETF Exterior pela Lei 14.754 (15% anual em DAA)
- [ ] Distinção acumulação vs distribuição
- [ ] Retenção EUA 30% vs UCITS via tratado 15%
- [ ] ROC (Return of Capital) tratado como redução de custo
- [ ] REITs estrangeiros como subclasse
- [ ] Eventos corporativos no exterior
- [ ] Matriz de compensação cruzada
- [ ] Aresta IVVB11 vs VOO vs CSPX explicitada
- [ ] PMR do índice como atributo dinâmico

---

*Próximas MGTs a montar: Fluxos de pessoa + Lei 15.270, Internacional Lei 14.754 (stocks/REITs/bonds diretos), Fundos abertos com come-cotas, Fundos fechados pós-14.754, Veículos (PJ Lucro Presumido / Holding patrimonial / Offshore PIC / Trust).*
