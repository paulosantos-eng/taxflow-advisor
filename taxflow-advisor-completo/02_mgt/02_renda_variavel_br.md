# MGT — Matriz de Granularidade Tributária | Renda Variável BR

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência:** 01/01/2026 (com Lei 14.754/2023 e Lei 15.270/2025 em vigor)
**Escopo:** ativos de renda variável negociados em bolsa BR (B3), opções, futuros, BDRs, ADRs disponíveis a PF residente
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine
**Nota:** dividendos e JCP têm capítulo próprio (MGT_dividendos_jcp.md) por interagirem com Lei 15.270 e holding

---

## 0. Glossário (extensão ao da MGT_renda_fixa.md)

| Variável | Significado |
|----------|-------------|
| `total_vendas_swing_mes` | Soma de todas as vendas de ações em mercado à vista no mês corrente (PF) |
| `custo_medio_lote` | Custo médio ponderado das ações em carteira para um ativo |
| `categoria_operacao` | swing OR day OR termo OR futuro OR opcao OR aluguel |
| `mercado` | a_vista OR derivativos OR balcao |
| `dedo_duro_swing` | IRRF 0,005% sobre venda swing |
| `dedo_duro_day` | IRRF 1% sobre resultado positivo do dia (apenas day) |
| `prejuizo_acumulado_categoria` | Saldo de prejuízo a compensar dentro da mesma categoria |
| `evento_corporativo` | split / grupamento / bonificacao / subscricao / opa / fusao / cisao / spin_off / conversao |

---

## 0.1 Tabelas auxiliares

```yaml
tabela: tabela_aliquotas_rv
faixas:
  swing_trade_acoes_etfs:
    aliquota: 0.15
    base: ganho_liquido_no_mes
    isencao_aplicavel: total_vendas_swing_mes <= 20000  # APENAS para ações; ETF não tem
  day_trade:
    aliquota: 0.20
    base: ganho_liquido_no_mes
    isencao_aplicavel: nunca

tabela: dedo_duro
faixas:
  swing_acoes:
    aliquota: 0.00005  # 0,005% sobre o valor da venda
    base: valor_total_vendas_no_mes
    threshold_minimo: 1.00  # só retém se valor >= R$ 1
  day_trade:
    aliquota: 0.01  # 1% sobre o resultado positivo do dia
    base: resultado_positivo_diario

tabela: codigo_darf_rv
codigo: 6015
descricao: "IRPF — Ganhos líquidos em operações em bolsas de valores"
vencimento: ultimo_dia_util_do_mes_seguinte
```

---

## I. AÇÕES — MERCADO À VISTA

---

### I.1 Compra de ação à vista

```yaml
classe: acao_b3
nome_canonico: "Ação negociada na B3 (mercado à vista)"
referencia_legal: [lei_11033_2004, in_rfb_1585_2015]

eventos:
  - id: E1_compra
    tipo: aquisicao
    pre_condicoes: []
    tributacao: nenhuma
    impacto_custo_medio: |
      novo_custo_medio = (custo_medio_atual * qtde_atual + valor_compra + corretagem + emolumentos) / (qtde_atual + qtde_comprada)
    captura: [data_compra, ticker, qtde, preco_executado, corretagem, emolumentos, isin]
    notas:
      - "Custo médio é por ATIVO (ticker), não por lote — diferente de RF onde lote é unidade"
      - "Mas para fins de custo médio em SUBSCRIÇÃO precisa rastrear lote (ver E5b)"
```

---

### I.2 Venda swing trade

```yaml
  - id: E2_venda_swing
    tipo: realizacao_em_swing
    pre_condicoes:
      - posicao_em_carteira > 0
      - "compra e venda em pregões diferentes (caso contrário cai em day trade)"
    sub_cenarios:
      - id: sub_isencao_20k
        condicao: "total_vendas_swing_mes_de_acoes <= 20000"
        aliquota: 0.00
        nota: "Isenção é POR PESSOA FÍSICA, NÃO por ativo — soma todas as vendas de ações no mês"
      - id: sub_tributado
        condicao: "total_vendas_swing_mes_de_acoes > 20000"
        aliquota: 0.15
        nota: "ARESTA: ultrapassar R$ 20.000 tributa o ganho INTEIRO do mês, não só o excedente"
    base_calculo: "ganho_liquido_mes = soma(vendas - custos_medios) - corretagens_emolumentos - prejuizos_swing_acumulados"
    tributacao:
      formula: "max(0, ganho_liquido_mes) * aliquota"
      retencao_fonte: dedo_duro_swing
      apuracao: mensal_via_DARF_6015
    output: [darf_devida, irrf_creditavel, prejuizo_swing_remanescente]
    captura: [data_venda, qtde, preco_executado, corretagem, ganho_da_operacao, custo_medio_aplicado]
    notas:
      - "ARESTA-CHAVE: a isenção R$ 20k aplica só a AÇÕES — vendas de ETF, FII, BDR, opção, termo NÃO entram no cálculo dos R$ 20k mas TAMBÉM não se beneficiam dele"
      - "O dedo-duro de 0,005% pode ser MENOR que R$ 1, e nesse caso não há retenção (mas há FG)"
      - "Compensação de prejuízos: APENAS swing com swing, sem prazo limite"
      - "Custo médio: deve excluir custos médios de aluguel pago pelo tomador (ver Aluguel/BTC)"
```

---

### I.3 Venda day trade

```yaml
  - id: E2b_venda_day
    tipo: realizacao_em_day_trade
    pre_condicoes:
      - "compra e venda do mesmo ativo no mesmo pregão pela mesma corretora"
    sub_cenarios:
      - id: dia_com_ganho
        aliquota: 0.20
        retencao: dedo_duro_day  # 1% sobre o resultado positivo do dia
      - id: dia_com_prejuizo
        aliquota: nao_aplicavel
        impacto: acumula_prejuizo_day
    base_calculo: "ganho_liquido_mes_day = soma(resultados_diarios) - prejuizos_day_acumulados"
    tributacao:
      formula: "max(0, ganho_liquido_mes_day) * 0.20"
      apuracao: mensal_via_DARF_6015
    output: [darf_day, irrf_day_creditavel, prejuizo_day_remanescente]
    notas:
      - "ARESTA: prejuízo de DAY NÃO compensa swing, e vice-versa"
      - "Day trade NUNCA é isento (sem regra dos R$ 20k)"
      - "Identificação automática: se cliente vendeu ação que comprou no mesmo dia E na mesma corretora, é day trade — não escolha"
      - "Aresta operacional: cliente que compra no Banco A e vende no Banco B no mesmo dia NÃO é day trade (corretoras diferentes)"
```

---

### I.4 Marcação intra-período (sem realização)

```yaml
  - id: E4_marcacao
    tipo: estado
    pre_condicoes: [posicao > 0, sem_realizacao_no_dia]
    tributacao: nenhuma
    output: passivo_latente
    captura: [data_snapshot, preco_mercado, valor_posicao, ganho_latente_se_vendesse_hoje]
    notas:
      - "App calcula 'IR projetado se realizar' assumindo swing — usar como insumo do painel"
      - "Para day trade hipotético, app pode rodar simulação se cliente quiser"
```

---

## II. EVENTOS CORPORATIVOS (sem ação do cliente, mas com efeito tributário)

---

### II.1 Split (desdobramento) e Grupamento (inplit)

```yaml
  - id: EC1_split
    tipo: evento_corporativo_neutro
    descricao: "Cada ação vira N (split) ou cada N viram 1 (grupamento)"
    pre_condicoes: [evento_anunciado_pela_companhia, posicao > 0]
    tributacao: nenhuma  # NÃO é fato gerador
    impacto_custo_medio: |
      split:    novo_custo_medio = custo_medio_atual / fator_split
                nova_quantidade  = qtde_atual * fator_split
      grupamento: novo_custo_medio = custo_medio_atual * fator_grupamento
                  nova_quantidade  = qtde_atual / fator_grupamento
    output: [posicao_atualizada, custo_medio_atualizado]
    captura: [data_evento, fator, ticker_antes, ticker_depois, qtde_antes, qtde_depois]
    notas:
      - "Aresta: grupamento que gera fração de ação — fração é vendida pela companhia e creditada em $ ao acionista; ESSE crédito é fato gerador (E2_venda_swing) com qtde da fração"
```

---

### II.2 Bonificação (incorporação de reservas em ações)

```yaml
  - id: EC2_bonificacao
    tipo: evento_corporativo
    descricao: "Acionista recebe ações novas vindas de capitalização de reservas — sem desembolso"
    pre_condicoes: [evento_anunciado, posicao > 0]
    tributacao: nenhuma  # no recebimento
    impacto_custo_medio:
      regra: "ações bonificadas têm custo médio = (valor_patrimonial_atribuido_pela_cia / qtde_bonificada)"
      formula_consolidada: |
        novo_custo_medio_total = (custo_medio_atual*qtde_atual + valor_total_atribuido_a_bonificacao) / (qtde_atual + qtde_bonificada)
    output: [qtde_atualizada, custo_medio_atualizado]
    captura: [data_evento, qtde_bonificada, valor_atribuido_por_acao_pela_cia]
    notas:
      - "ARESTA QUE 80% DOS CONSULTORES ERRA: o custo da bonificação NÃO é zero. É o valor que a companhia atribuiu (geralmente publicado em fato relevante / aviso aos acionistas)"
      - "Tratar como zero infla o ganho na venda futura e gera IR a maior"
      - "App deve buscar fato relevante / B3 para preencher automaticamente o valor atribuído"
      - "Se a companhia NÃO atribui valor (raro), assume-se zero como fallback — registrar 'não atribuído' para auditoria"
```

---

### II.3 Subscrição

```yaml
  - id: EC3_subscricao
    tipo: evento_corporativo_compoe_ou_descarta
    descricao: "Acionista recebe DIREITO de comprar novas ações em condições preferenciais"
    pre_condicoes: [evento_anunciado, posicao_na_data_de_corte]
    sub_cenarios:
      - id: sub_a_exerce
        descricao: "Acionista paga e recebe novas ações"
        tributacao: nenhuma_no_exercicio
        impacto_custo_medio: |
          novas_acoes_compradas têm custo = preço_de_subscrição (lote separado para fins de custo médio)
          o custo médio do TICKER se recalcula consolidando o novo lote
        captura: [data_exercicio, qtde_subscrita, preco_subscricao, valor_pago]
      - id: sub_b_vende_direito
        descricao: "Acionista vende o direito de subscrição em mercado"
        tipo: realizacao_em_swing
        tributacao: ganho_swing_normal
        custo_do_direito: 0  # se foi recebido como acionista
        notas: ["Venda de direito conta para a janela R$ 20k? Prática consolidada: SIM, conta como venda de ação."]
      - id: sub_c_nao_exerce_e_nao_vende
        descricao: "Direito vence sem ser exercido nem vendido"
        tributacao: nenhuma  # mas perde-se a oportunidade
```

---

### II.4 OPA — Oferta Pública de Aquisição

```yaml
  - id: EC4_opa
    tipo: realizacao_em_swing  # se acionista adere
    descricao: "Acionista adere à OPA recebendo valor por ação"
    pre_condicoes: [opa_lancada, acionista_aderiu]
    sub_cenarios:
      - id: opa_dinheiro
        tratamento: "trata como E2_venda_swing com valor recebido pela OPA"
      - id: opa_troca_acoes
        tratamento: "trata como cisão/fusão (E_C5) — sem FG, mantém custo médio na nova posição"
      - id: opa_mista
        tratamento: "parcela em $ é FG; parcela em ações é continuidade fiscal"
    notas:
      - "OPA por fechamento de capital: tipicamente em dinheiro, fato gerador integral"
      - "OPA em troca de ações da incorporadora: continuidade do custo médio"
```

---

### II.5 Fusão / Incorporação

```yaml
  - id: EC5_fusao_incorporacao
    tipo: evento_corporativo_continuidade
    descricao: "Empresa A é incorporada por B; acionistas de A recebem ações de B"
    tributacao: nenhuma  # princípio da continuidade fiscal
    impacto_custo_medio: |
      novo_custo_medio_em_B = custo_medio_em_A * relacao_de_troca
      nova_qtde_em_B = qtde_em_A * relacao_de_troca
    captura: [data_evento, ticker_A, ticker_B, relacao_troca, qtde_antes, qtde_depois]
    notas:
      - "ARESTA: se a relação de troca não for unitária (ex.: cada 3 de A vira 2 de B), pode haver fração paga em $ — esse $ é FG"
```

---

### II.6 Cisão

```yaml
  - id: EC6_cisao
    tipo: evento_corporativo_alocacao
    descricao: "Parte do patrimônio de A vira nova empresa C; acionistas recebem ações de C"
    tributacao: nenhuma  # no momento da cisão
    impacto_custo_medio:
      formula: |
        custo_medio é REPARTIDO entre A (remanescente) e C (nova) conforme proporção definida no edital de cisão
        custo_em_A_apos = custo_medio_antes * fator_alocacao_A
        custo_em_C = custo_medio_antes * fator_alocacao_C
    captura: [data_evento, fator_alocacao_A, fator_alocacao_C, fato_relevante_referencia]
    notas:
      - "Sem fato relevante explícito, app deve permitir consultor inserir manualmente (com nota de overlay)"
```

---

### II.7 Spin-off

```yaml
  - id: EC7_spin_off
    tipo: evento_corporativo
    descricao: "Empresa distribui ações de subsidiária aos acionistas"
    sub_cenarios:
      - id: spin_off_como_bonificacao
        condicao: "fato relevante trata explicitamente como bonificação"
        tratamento: "EC2_bonificacao com valor atribuído pela companhia"
      - id: spin_off_como_cisao
        condicao: "fato relevante trata como redução do capital de A"
        tratamento: "EC6_cisao com proporção definida"
    notas:
      - "ARESTA: classificação varia caso a caso; depende EXCLUSIVAMENTE do fato relevante"
      - "App deve solicitar interpretação do consultor + permitir overlay manual"
```

---

### II.8 Conversão de classe (PN ↔ ON)

```yaml
  - id: EC8_conversao
    tipo: evento_corporativo_continuidade
    descricao: "Ações de uma classe são convertidas em outra"
    tributacao: nenhuma  # geralmente
    impacto_custo_medio: "preserva o custo médio total; redistribui pela nova quantidade"
    notas:
      - "Conversão pode ter relação 1:1 (típica) ou diferente"
      - "Se há diferença em valor de mercado entre as classes, pode haver discussão tributária — verificar IN específica"
```

---

## III. BDR — Brazilian Depositary Receipts

```yaml
classe: bdr
nome_canonico: "BDR — Brazilian Depositary Receipt"
referencia_legal: [in_rfb_1585_2015, lei_14754_2023]

eventos:
  - id: E1_compra
    captura: [data_compra, ticker_bdr, ticker_subjacente_exterior, qtde, preco, paridade]
    notas: ["Paridade: 1 BDR = N ações da empresa estrangeira (varia por programa)"]

  - id: E2_venda_swing
    sub_cenarios:
      - id: tributado
        aliquota: 0.15
    base_calculo: "ganho = (valor_venda - corretagem) - (valor_compra + corretagem)"
    tributacao:
      formula: "ganho * 0.15"
      apuracao: mensal_via_DARF_6015
      retencao: dedo_duro_swing
    notas:
      - "ARESTA-CRÍTICA: BDR NÃO TEM ISENÇÃO DOS R$ 20k. Sempre tributa."
      - "Compensação de prejuízos: BDR compensa com BDR e com outras operações em mercado à vista de RV BR (ações, ETF)? Interpretação consolidada: sim, BDR é tratado como RV em mercado à vista da B3 — compensação cruzada com ações é permitida"

  - id: E2b_venda_day
    aliquota: 0.20
    notas: ["Day trade em BDR: 20%, mesma regra de ações"]

  - id: E5_recebimento_dividendo
    descricao: "BDR repassa dividendos da empresa estrangeira ao titular"
    tributacao:
      regime_aplicavel: lei_14754_2023
      aliquota: 0.15
      apuracao: anual_em_DAA  # NÃO é mensal como RV
    captura: [data_recebimento, valor_bruto_em_BRL, valor_em_USD, taxa_cambio, ir_retido_pais_origem]
    notas:
      - "ARESTA-CRÍTICA: dividendo de BDR NÃO é tributado pelo regime brasileiro de RV — é aplicação financeira no exterior pela Lei 14.754"
      - "Cliente pode compensar IR retido no país de origem (ex.: 30% nos EUA via tratado) — efeito de bracket-creep"

  - id: EC_eventos_corporativos
    notas: ["Eventos corporativos no exterior são repassados via depositária — split, dividendos, splits, etc.; cada um precisa de tratamento similar a ações BR mas com paridade do BDR e câmbio"]
```

---

## IV. OPÇÕES (CALL e PUT)

```yaml
classe: opcao_acao
nome_canonico: "Opção de compra (call) ou venda (put) sobre ação"
mercado: derivativos_b3

eventos:
  - id: E1_compra_da_opcao
    captura: [data, ativo_subjacente, tipo (call/put), strike, vencimento, qtde, premio_pago, corretagem]

  - id: E2_venda_da_opcao
    sub_cenarios:
      - id: swing_opcao
        condicao: "compra e venda em pregões diferentes"
        aliquota: 0.15
      - id: day_opcao
        aliquota: 0.20
    base_calculo: "ganho = (premio_recebido - corretagem) - (premio_pago + corretagem)"
    tributacao: { formula: "ganho * aliquota", apuracao: mensal_via_DARF_6015 }
    notas:
      - "ARESTA: opção NÃO entra na isenção R$ 20k de ações"
      - "Compensação: prejuízo em opção compensa com ganho em opção, e com outras operações em mercado de derivativos. NÃO compensa com ações em à vista (categorias separadas)"

  - id: E3_exercicio_da_opcao_call
    descricao: "Cliente exerce o direito de comprar (call) ou vender (put) o ativo"
    sub_cenarios:
      - id: call_exercida_compra
        tratamento: "compra do ativo a preço strike. Custo da nova posição = strike + premio_pago_pela_call"
        tributacao_no_exercicio: nenhuma  # só quando vender o ativo subjacente
      - id: put_exercida_venda
        tratamento: "venda do ativo subjacente. Considera-se venda swing/day conforme regime"
    notas:
      - "Exercício antecipado em opção americana: mesmo tratamento"
      - "Exercício automático no vencimento (ITM): app deve antecipar"

  - id: E4_vencimento_sem_exercicio
    descricao: "Opção out-of-the-money expira sem valor"
    tratamento: "perda total do prêmio pago — vira prejuízo de OPÇÃO (compensa com derivativos)"
    captura: [data_vencimento, premio_perdido]

  - id: E5_lancamento_coberto_descoberto
    descricao: "Cliente VENDE opção (lança)"
    tratamento: "Recebe prêmio. FG no recebimento? NÃO — FG só na recompra ou exercício"
    sub_eventos:
      - recompra: "FG = recompra como E2"
      - exercicio_da_lancada: "para call coberta: tratado como venda do subjacente; para put: tratado como compra do subjacente"
      - vencimento_sem_exercicio: "ganho = prêmio recebido inteiro; FG no vencimento"
    notas:
      - "Lançamento coberto: cliente que tem o subjacente. Lançamento descoberto: cliente sem o subjacente — risco e tratamento similar"
```

---

## V. MERCADO A TERMO

```yaml
classe: termo_acao
nome_canonico: "Mercado a Termo de Ações"
mercado: derivativos_b3

eventos:
  - id: E1_compra_termo
    captura: [data, ativo, qtde, preco_termo, vencimento, garantia]

  - id: E3_liquidacao_termo
    sub_cenarios:
      - id: liquidacao_financeira
        descricao: "Cliente recebe/paga apenas a diferença"
        tributacao: { aliquota: 0.20, apuracao: mensal_via_DARF_6015 }  # geralmente day-trade-like
      - id: liquidacao_fisica
        descricao: "Compra efetiva do ativo no preço a termo"
        tributacao: nenhuma_na_liquidacao  # só quando vender
        impacto: "ativo entra em carteira ao preço a termo"
    notas:
      - "Compensação: derivativos com derivativos"
      - "ARESTA: termo de venda (short) tem dinâmica diferente — verificar IN específica"
```

---

## VI. FUTUROS (mini-índice, mini-dólar, DI futuro, commodities)

```yaml
classe: futuro_b3
nome_canonico: "Contrato Futuro B3"

eventos:
  - id: E1_abertura_posicao
  - id: E5_ajustes_diarios
    descricao: "Posições futuras são marcadas a mercado diariamente; cliente recebe/paga ajuste"
    tratamento: "ajustes diários NÃO são FG isolados — entram no resultado do mês"
    notas: ["Ajuste é fluxo de caixa, IR é apurado no fechamento da posição"]
  - id: E2_fechamento_posicao
    sub_cenarios:
      - id: swing_futuro
        aliquota: 0.15
      - id: day_futuro
        aliquota: 0.20
        nota: "Futuros são quase sempre day-traded por traders ativos; identificação por mesmo dia / mesma corretora"
    base_calculo: "ganho = soma(ajustes_diarios) ao longo do tempo da posição"
    tributacao: { apuracao: mensal_via_DARF_6015 }
    notas:
      - "Compensação dentro de derivativos"
      - "Mini-contratos seguem mesma regra dos contratos cheios"
```

---

## VII. ALUGUEL DE AÇÕES (BTC — Banco de Títulos)

```yaml
classe: aluguel_bsc
nome_canonico: "Aluguel de Ações via BTC/B3"

eventos:
  doador:
    - id: E5_recebimento_taxa_aluguel
      descricao: "Doador recebe taxa diária pelo aluguel"
      tributacao:
        regime: tabela_regressiva_ir_rf  # tratado como RF para o doador
        retencao: na_fonte_pelo_BTC
      output: [aluguel_recebido_liquido, ir_retido]
      notas:
        - "ARESTA: aluguel de ações é RENDA FIXA para o doador (não RV)"
        - "Mesmo tratamento de tabela regressiva por prazo desde início do empréstimo"

    - id: E_movimento_de_acoes
      descricao: "Posse das ações vai temporariamente ao tomador"
      tributacao_para_doador: nenhuma  # não é alienação
      notas: ["Doador continua sendo dono fiscal — eventos corporativos nas ações vão para ele"]

  tomador:
    - id: E2_venda_a_descoberto
      descricao: "Tomador vende as ações alugadas (short)"
      tratamento: "FG no momento de RECOMPRA (cobertura), não na venda inicial"
      apuracao_swing_ou_day: "depende de prazo"
      notas:
        - "Resultado do tomador: (preço_venda - preço_recompra) - taxa_aluguel_paga"
        - "Taxa de aluguel paga é DEDUTÍVEL do resultado da operação"
```

---

## VIII. DARF 6015 — APURAÇÃO MENSAL CONSOLIDADA

```yaml
processo: apuracao_mensal_rv
codigo_darf: 6015
vencimento: ultimo_dia_util_do_mes_seguinte
juros_e_multa: selic_acumulada + multa_2_porcento  # se atrasar
fluxo_de_calculo:
  1. consolidar todas as operações do mês por categoria (swing_acoes, swing_etf_fii_bdr, day, opcao, termo, futuro)
  2. calcular ganho_bruto por categoria
  3. aplicar isenção R$ 20k em swing_acoes (apenas)
  4. compensar prejuízos acumulados da MESMA categoria
  5. aplicar alíquota (15% swing, 20% day)
  6. abater dedo-duro retido (swing 0,005% e day 1%)
  7. emitir DARF 6015 com saldo

regras_de_compensacao:
  matriz:
    swing_acoes_com_swing_acoes: SIM
    swing_acoes_com_swing_etf_fii: SIM (ambos são à vista RV)
    swing_acoes_com_day_acoes: NAO  # categorias separadas
    swing_com_opcao: NAO  # mercados separados
    opcao_com_termo: SIM  # ambos derivativos
    opcao_com_futuro: SIM
    termo_com_futuro: SIM
    derivativos_com_a_vista: NAO
    fii_com_acao: SIM no à vista (em uma interpretação) / SEPARADO (em outra interpretação mais conservadora)
  notas:
    - "ARESTA-INTERPRETATIVA: compensação FII com ação é tema controverso. Interpretação Receita 2023+: FII tem regime próprio (ganho 20%, sem isenção R$ 20k), apura SEPARADO. App deve seguir essa interpretação como default e permitir overlay para a interpretação anterior."
```

---

## IX. EVENTOS TRANSVERSAIS E ARESTAS NÃO ÓBVIAS

---

### IX.1 Aresta da janela R$ 20k

A regra dos R$ 20.000 mensais aparenta simplicidade mas tem 4 sub-arestas:

1. **É por PESSOA, não por corretora** — soma todas as vendas de ações em todas as corretoras no mês.
2. **Não inclui ETF, FII, BDR, opção, termo, futuro** — janela vale só para AÇÕES brasileiras à vista.
3. **Ultrapassar R$ 20.001 tributa o ganho INTEIRO do mês**, não só o excedente.
4. **Vender com prejuízo dentro do mês não "consome" janela** — o limite R$ 20k é sobre VOLUME de venda, não sobre ganho.

Implicação para o app: o otimizador tem que distribuir vendas em meses; sugerir splits R$ 19.999 / R$ 19.999 em meses consecutivos para manter isenção.

---

### IX.2 Aresta da bonificação com custo zero

Já mencionada em EC2 mas merece destaque transversal: a maioria dos sistemas (e consultores) trata bonificação como custo zero, o que infla o ganho na venda futura. A regra correta usa o valor patrimonial atribuído pela companhia. App deve buscar fato relevante automaticamente ou pedir input manual com aviso explícito.

---

### IX.3 Aresta da fração em grupamentos

Grupamentos quase sempre geram fração de ação (ex.: 100 ações com fator 1:3 → 33 + 1/3). A fração é vendida pela companhia e creditada em $ ao acionista. **Esse crédito é FG** (E2_venda_swing) com qtde = a fração e preço = o valor médio recebido pela B3. Maioria das corretoras lança no extrato como "venda fracionária" ou similar.

---

### IX.4 Aresta de operação iniciada em pregão e fechada em outro

Day trade EXIGE compra e venda na **mesma corretora no mesmo pregão**. Se cliente compra na Corretora A e vende na Corretora B no mesmo dia, **não é day trade** — é swing trade com o mesmo D+0. Mas existe interpretação de que se a B3 conseguir identificar pelo CPF que houve compra+venda no mesmo dia, pode tratar como day. App deve seguir interpretação default da Receita (mesma corretora) e marcar caso ambíguo para revisão.

---

### IX.5 Aresta da retenção menor que R$ 1

Dedo-duro de 0,005% (swing) só é retido se valor da retenção ≥ R$ 1. Em vendas pequenas, **não há retenção, mas há FG**. App não pode usar "houve dedo-duro?" como proxy para "houve venda" — precisa apurar a partir das notas, não do IRRF.

---

### IX.6 Aresta do ETF na compensação

Embora ETF de RV BR seja apurado a 15% (swing) ou 20% (day), o **ganho de ETF compensa com ganho de ação no mesmo mês** (interpretação consolidada: ambos são à vista de RV). MAS prejuízo de ETF NÃO usa a isenção R$ 20k das ações. Implementação correta: apuração consolidada à vista RV, mas janela R$ 20k aplicada SÓ ao subset "ações".

---

### IX.7 Aresta da renda variável com sinais positivos e negativos

Se o cliente tem swing acoes com ganho de R$ 30k e ETF com prejuízo de R$ 10k no mês: ganho liquido R$ 20k → tributa 15% × 20.000 = R$ 3.000. MAS a isenção R$ 20k de ações precisa ser aplicada antes ou depois? Interpretação consolidada: a isenção é sobre o **VOLUME** de vendas, não sobre o ganho. Se vendas de ações > R$ 20k, perde-se a isenção das ações. Apuração:
- Volume de vendas de ações: R$ 22.000 → ultrapassou → ganho de ações de R$ 30.000 é integralmente tributável
- ETF: prejuízo de R$ 10.000 compensa o ganho de ações
- Base tributável: 30.000 - 10.000 = 20.000
- IR: 20.000 × 15% = 3.000

App tem que rodar essas duas dimensões em paralelo: volume de vendas de cada subcategoria + ganho/prejuízo de cada subcategoria.

---

## X. LACUNAS CONHECIDAS

1. **Tributação exata de mercados de balcão (OTC)** — fora do escopo da B3, regras próprias.
2. **Box de 3 pontas e estruturas com derivativos** — operação que combina compra/venda em D+0; tratamento como day trade ou continuidade — verificar IN.
3. **Tributação de criptoativos** — tratada em capítulo próprio (não é RV stricto sensu).
4. **Tratamento exato de eventos corporativos quando companhia muda de listagem** (ex.: migra para Latibex, ou para EUA) — verificar IN específica.
5. **Operação Long-Short** — combinação de aluguel + compra; verificar tratamento consolidado.
6. **Aresta CDI flutuante em renda variável** — instrumentos híbridos (ex.: ações com cláusula de proteção); raros mas existem.
7. **Tratamento de opções flexíveis (negociadas em balcão B3 OTC)** — escopo específico.

---

## XI. CHECKLIST PARA REVISÃO DO TRIBUTARISTA

- [ ] Eventos E1, E2, E2b, E4 cobertos para ações
- [ ] Eventos corporativos EC1–EC8 cobertos
- [ ] BDR com tributação de ganho separada de tributação de dividendo (Lei 14.754)
- [ ] Opções com 3 destinos (venda, exercício, vencimento)
- [ ] Termo, Futuro, Aluguel cobertos
- [ ] Matriz de compensação de prejuízos correta
- [ ] Aresta R$ 20k explícita (volume vs ganho, ações vs ETF, etc.)
- [ ] Bonificação com custo do valor atribuído pela companhia
- [ ] Fração de grupamento como FG
- [ ] Day trade exige mesma corretora

---

*Próximas MGTs: FII/Fiagro, ETFs (BR e exterior), Fluxos de pessoa (Lei 15.270), Internacional (Lei 14.754), Fundos abertos, Fundos fechados, Veículos (PJ/Holding).*
