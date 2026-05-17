# MGT — Matriz de Granularidade Tributária | FII e Fiagro

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência:** 01/01/2026 (com Lei 14.754/2023 e Lei 15.270/2025 em vigor)
**Escopo:** Fundos de Investimento Imobiliário (FII) e Fundos de Investimento nas Cadeias Produtivas Agroindustriais (Fiagro), em todas as suas variações
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine

---

## 0. Glossário (extensão à MGT_renda_fixa.md e MGT_renda_variavel_br.md)

| Variável | Significado |
|----------|-------------|
| `tipo_fundo` | FII / Fiagro-FII / Fiagro-FIDC / Fiagro-FIP |
| `subtipo_fii` | tijolo / papel / hibrido / FoF / desenvolvimento |
| `fundo_listado` | true se cotado em bolsa B3 com negociação aberta |
| `numero_cotistas` | número total de cotistas do fundo |
| `participacao_do_cotista` | % do total de cotas detido pelo cotista (PF) |
| `participacao_em_rendimentos` | % do total de rendimentos pagos pelo fundo recebidos pelo cotista |
| `cotista_e_pessoa_ligada` | true se cotista é pessoa ligada ao incorporador, construtor ou sócio (perde isenção) |
| `isencao_pf_aplicavel` | resultado booleano da checagem dos 4 requisitos |
| `aliquota_ganho_cota_pf` | 0.20 (regra geral PF) |
| `prejuizo_acumulado_fii` | saldo de prejuízo a compensar SÓ dentro de FII |
| `prejuizo_acumulado_fiagro_fii` | saldo de prejuízo a compensar SÓ dentro de Fiagro-FII |
| `prejuizo_acumulado_fiagro_fidc` | idem para Fiagro-FIDC |

---

## 0.1 Tabela de requisitos para isenção PF (FII)

```yaml
tabela: requisitos_isencao_pf_fii
referencia_legal: [lei_11033_2004_art3_iii, in_rfb_1585_2015_art66, lei_8668_1993]
descricao: |
  Para a PF residente ter isenção sobre os rendimentos mensais distribuídos pelo FII,
  os 4 requisitos abaixo devem estar TODOS satisfeitos. A falha em qualquer um faz
  o rendimento virar tributável (regressiva por prazo desde a compra da cota).

requisitos:
  R1_listado:
    descricao: "Cotas admitidas à negociação em bolsa de valores ou mercado de balcão organizado"
    falha_implica: perda_imediata_isencao
  R2_50_cotistas:
    descricao: "Fundo tem no mínimo 50 cotistas"
    falha_implica: perda_imediata_isencao
    nota: "Verificação no momento do pagamento do rendimento — não na compra da cota"
  R3_cotista_menos_de_10_porcento_cotas:
    descricao: "Cotista (PF) não detém, isoladamente ou em conjunto com pessoas ligadas, ≥ 10% das cotas emitidas"
    falha_implica: perda_isencao_apenas_para_esse_cotista
    nota: "Pessoa ligada inclui cônjuge, ascendentes, descendentes e empresas controladas"
  R4_cotista_menos_de_10_porcento_rendimentos:
    descricao: "Cotista (PF) não recebe ≥ 10% do total de rendimentos distribuídos pelo fundo"
    falha_implica: perda_isencao_apenas_para_esse_cotista
    nota: "Derivada do R3 mas pode ocorrer isoladamente quando classes de cotas diferentes"
  R5_nao_ligacao_construtor:
    descricao: "Cotista não é o construtor, incorporador ou sócio do empreendimento principal do fundo"
    falha_implica: perda_isencao_apenas_para_esse_cotista
    nota: "Quinto requisito menos lembrado; pega sócio do empreendimento que recebe cotas como pagamento"
```

---

## 0.2 Tabela de requisitos para isenção PF (Fiagro)

```yaml
tabela: requisitos_isencao_pf_fiagro
referencia_legal: [lei_14130_2021, lei_14754_2023, in_rfb_2154_2023]
descricao: |
  Fiagro tem a MESMA estrutura de requisitos do FII (listagem + 50 cotistas + < 10% cotas + < 10% rendimentos),
  com adicional para Fiagro-FIDC.

requisitos:
  R1_listado: "idem FII"
  R2_50_cotistas: "idem FII"
  R3_R4_R5: "idem FII"
  R6_fiagro_fidc_perfil: "Para Fiagro-FIDC, ≥ 67% do patrimônio em direitos creditórios do agronegócio"
```

---

## I. FII — Fundo de Investimento Imobiliário

---

### I.1 Compra de cota

```yaml
classe: fii
nome_canonico: "Fundo de Investimento Imobiliário"
referencia_legal: [lei_8668_1993, lei_11033_2004, in_cvm_472, in_rfb_1585_2015]

eventos:
  - id: E1_compra
    tipo: aquisicao
    pre_condicoes: []
    tributacao: nenhuma
    impacto_custo_medio: |
      novo_custo_medio = (custo_medio_atual * qtde_atual + valor_compra + corretagem + emolumentos) / (qtde_atual + qtde_comprada)
    captura: [data_compra, ticker_fii, qtde, preco_executado, corretagem, emolumentos, modalidade_aquisicao]
    notas:
      - "Modalidade: secundário (bolsa), oferta primária (IPO), follow-on, dação em pagamento"
      - "Custo médio é por TICKER de FII; não confundir com FII master-feeder (fundo de fundos)"
```

---

### I.2 Venda de cota

```yaml
  - id: E2_venda_cota
    tipo: realizacao
    pre_condicoes: [posicao_em_carteira > 0]
    sub_cenarios:
      - id: venda_com_ganho
        aliquota: 0.20
        nota: "ARESTA-CRÍTICA: NÃO existe isenção R$ 20k para FII. Qualquer ganho na venda é tributado"
      - id: venda_com_prejuizo
        impacto: acumula_prejuizo_fii
        nota: "Prejuízo SÓ compensa com ganho em venda de outras cotas de FII — categoria isolada"
    base_calculo: "ganho_mes = soma(valor_venda - custo_medio_aplicado - corretagem) - prejuizos_fii_acumulados"
    tributacao:
      formula: "max(0, ganho_mes) * 0.20"
      retencao_fonte: dedo_duro_swing_fii  # 0,005% sobre venda
      apuracao: mensal_via_DARF_6015
    captura: [data_venda, ticker, qtde, preco_venda, custo_medio_aplicado, corretagem, ganho_da_operacao]
    notas:
      - "Day trade em FII: 20% (mesma alíquota; não há diferenciação como em ação)"
      - "Compensação de prejuízos: FII × FII somente (sem cruzamento com ações, ETFs ou Fiagro)"
      - "Pessoa ligada que vende para si mesma: regra de planejamento abusivo — verificar IN 1.585"
      - "ARESTA: venda de FII tributado em PF compõe a apuração mensal via DARF 6015, mesmo código de RV, mas em apuração isolada"
```

---

### I.3 Recebimento de rendimento mensal

```yaml
  - id: E5_rendimento_mensal
    tipo: realizacao_periodica_automatica
    descricao: "FII distribui no mínimo 95% do lucro caixa semestralmente; na prática maioria distribui mensalmente"
    pre_condicoes: [posicao_em_carteira > 0_na_data_de_corte]
    sub_cenarios:
      - id: cotista_pf_com_isencao
        condicao: "checagem_4_requisitos == TODOS_TRUE"
        aliquota: 0.00
        retencao: nenhuma
        output: [rendimento_liquido_integral]
        nota: "Isenção depende de TODOS os requisitos atendidos no momento do pagamento"
      - id: cotista_pf_sem_isencao
        condicao: "qualquer_requisito_falha"
        aliquota: tabela_regressiva_ir_rf  # mesma tabela de RF tributada
        retencao: na_fonte_pelo_administrador
        output: [rendimento_liquido_pos_ir, irrf]
        nota: "Prazo regressivo conta desde a aquisição da cota — NÃO desde o pagamento anterior"
      - id: cotista_pj_lucro_real_ou_presumido
        aliquota: 0.20
        retencao: na_fonte
        nota: "PJ NÃO tem isenção — sempre 20% retido na fonte; vai para receita financeira da PJ"
      - id: cotista_pj_simples
        nota: "Simples não pode investir em FII como atividade — investimento pessoal do sócio"
      - id: cotista_pf_pessoa_ligada
        condicao: "cotista_e_pessoa_ligada == true"
        aliquota: 0.20
        retencao: na_fonte
        nota: "Pessoa ligada ao incorporador/construtor/sócio do empreendimento perde isenção"
    captura: [data_pagamento, valor_bruto_por_cota, qtde_cotas, valor_total_bruto, ir_retido, requisitos_no_pagamento]
    notas:
      - "ARESTA: a checagem dos 4 requisitos deve ser DO MOMENTO DO PAGAMENTO, não da compra. Se o cotista ultrapassa 10% em julho, perde isenção a partir do próximo pagamento"
      - "Administradora do fundo é responsável pela retenção; mas o cotista PF deve verificar mesmo assim"
      - "Aresta operacional: alguns FII pagam 'rendimento' que na verdade é amortização — ver E6"
```

---

### I.4 Marcação intra-período

```yaml
  - id: E4_marcacao
    tipo: estado
    pre_condicoes: [posicao > 0, sem_realizacao]
    tributacao: nenhuma
    output: [passivo_latente_se_vendesse_hoje]
    captura: [data_snapshot, preco_mercado, valor_posicao, ganho_latente, aliquota_que_aplicaria (sempre 0.20)]
    notas:
      - "FII tem volatilidade significativa de cota; carrego latente importa muito"
      - "App deve mostrar 'IR se vendesse hoje' assumindo cumprimento de requisitos no momento futuro"
```

---

### I.5 Amortização de cota (devolução de capital)

```yaml
  - id: E6_amortizacao
    tipo: devolucao_de_capital
    descricao: "Fundo devolve parte do capital investido ao cotista (não é rendimento — é redução do investimento)"
    pre_condicoes: [evento_de_amortizacao_anunciado, posicao > 0]
    tributacao: nenhuma_na_amortizacao
    impacto_custo_medio: |
      novo_custo_medio = custo_medio_atual - (valor_amortizado_por_cota)
      se novo_custo_medio < 0: tratado como ganho de capital E2 (raro)
    output: [custo_medio_atualizado, valor_recebido_isento]
    captura: [data_amortizacao, valor_por_cota, valor_total_recebido, novo_custo_medio]
    notas:
      - "ARESTA-CRÍTICA: muitas corretoras lançam amortização como 'rendimento isento' — está errado para fins fiscais"
      - "Amortização REDUZ o custo médio; rendimento NÃO afeta custo médio. Tratar errado infla o ganho na venda futura"
      - "App deve diferenciar lançamentos de amortização (via fato relevante / aviso da administradora) vs rendimento mensal"
      - "Quando custo médio fica zero, novas amortizações são tratadas como ganho de capital (E2) — situação rara mas possível em FII com muitas amortizações"
```

---

### I.6 Subscrição de novas cotas

```yaml
  - id: EC1_subscricao
    tipo: evento_corporativo
    descricao: "Cotista atual tem direito de comprar novas cotas em condições preferenciais (geralmente para captação adicional do fundo)"
    pre_condicoes: [oferta_anunciada, posicao_na_data_de_corte > 0]
    sub_cenarios:
      - id: exerce_direito
        descricao: "Paga o preço de subscrição e recebe novas cotas"
        tributacao_no_exercicio: nenhuma
        impacto_custo_medio: "novas cotas entram ao preço de subscrição; consolida no custo médio do ticker"
      - id: vende_direito_em_mercado
        tipo: realizacao
        tratamento: "trata como E2_venda com custo zero (se recebeu como cotista) ou custo de aquisição do direito"
        aliquota: 0.20
        nota: "Receita de venda do direito é tributada como ganho em FII — sem isenção R$ 20k"
      - id: deixa_expirar
        tributacao: nenhuma
        impacto: "perda da oportunidade — não há FG"
    captura: [data_exercicio, qtde_novas_cotas, preco_subscricao, qtde_direitos_vendidos, valor_venda_direito]
```

---

### I.7 Bonificação / desdobramento de cotas

```yaml
  - id: EC2_bonificacao
    tipo: evento_corporativo
    descricao: "Fundo emite novas cotas para cotistas existentes sem custo (raro em FII mas possível)"
    tributacao: nenhuma_no_recebimento
    impacto_custo_medio:
      regra: "se há valor atribuído pela administradora, novo_custo_medio = (custo*qtde_atual + valor_atribuido_total) / qtde_total_apos"
      fallback_sem_atribuicao: "custo médio recalculado pela qtde total nova (efeito split)"
    captura: [data_evento, qtde_bonificada, valor_atribuido_por_cota, fato_relevante_ref]

  - id: EC3_desdobramento
    tipo: evento_corporativo
    descricao: "Cada cota vira N (split de cota) ou cada N viram 1 (grupamento)"
    tributacao: nenhuma
    impacto_custo_medio: |
      split: custo_medio_novo = custo_medio_atual / fator
      grupamento: custo_medio_novo = custo_medio_atual * fator
    notas:
      - "Fração gerada em grupamento → vendida pela administradora → fato gerador da fração como E2"
```

---

### I.8 Liquidação do fundo

```yaml
  - id: EC4_liquidacao
    tipo: evento_corporativo_terminal
    descricao: "Fundo é liquidado por decisão de assembleia, fim do prazo determinado, ou evento extraordinário"
    pre_condicoes: [evento_de_liquidacao]
    sub_cenarios:
      - id: liquidacao_em_dinheiro
        tratamento: "trata como E2_venda da posição inteira ao valor recebido na liquidação"
        aliquota: 0.20
      - id: liquidacao_em_ativos
        descricao: "Fundo entrega bens ou cotas de outro fundo aos cotistas (raro)"
        tratamento: "interpretativo — pode ser tratado como venda + nova aquisição pelo valor atribuído"
        nota: "Tema controverso; consultar tributarista antes de produção"
    captura: [data_liquidacao, valor_recebido_por_cota, custo_medio_aplicado, ganho_total]
```

---

### I.9 Eventos corporativos diversos

```yaml
  - id: EC5_incorporacao_entre_fii
    tipo: evento_corporativo_continuidade
    descricao: "FII A é incorporado por FII B; cotistas recebem cotas de B"
    tributacao: nenhuma  # continuidade fiscal (analogia com fusão de ações)
    impacto_custo_medio: "novo_custo_medio_em_B = custo_medio_em_A * relacao_de_troca"

  - id: EC6_opa_de_fii
    tipo: realizacao  # se cotista adere
    descricao: "Oferta pública de aquisição de cotas (raro; ocorre em fechamento de FII listado)"
    tratamento: "se adere, trata como E2_venda ao preço da OPA"
    sub_cenarios:
      - id: opa_dinheiro: { aliquota: 0.20 }
      - id: opa_em_outros_ativos: "interpretativo — verificar IN específica"

  - id: EC7_cisao_de_fundo
    tipo: evento_corporativo_alocacao
    descricao: "Fundo é cindido, criando novo fundo"
    impacto_custo_medio: "rateio proporcional conforme proporção de cisão"
    notas: ["Raro mas existe; verificar fato relevante"]

  - id: EC8_emissao_secundaria
    tipo: evento_corporativo
    descricao: "Fundo emite novas cotas para o mercado em geral (não preferencial para cotistas atuais)"
    impacto_para_cotista_existente: "diluição — mas sem FG"
    nota: "Cotista atual pode subscrever na oferta como qualquer outro investidor"
```

---

## II. FIAGRO — três subtipos com regras diferentes

---

### II.1 Fiagro-FII (Imobiliário do Agronegócio)

```yaml
classe: fiagro_fii
nome_canonico: "Fiagro — modalidade FII (imobiliário do agronegócio)"
referencia_legal: [lei_14130_2021, in_rfb_2154_2023]
caracteristica: "Investe em imóveis rurais, direitos reais sobre imóveis rurais, terrenos para produção agro"

eventos:
  - E1_compra: { mesma_estrutura_que: fii.E1 }
  - E2_venda_cota:
      aliquota: 0.20
      nota: "Compensação SÓ com Fiagro-FII (categoria separada de FII e de outros subtipos de Fiagro)"
  - E5_rendimento_mensal:
      sub_cenarios:
        - pf_com_isencao: { aliquota: 0.00, condicao: "4_requisitos_satisfeitos" }
        - pf_sem_isencao: { aliquota: tabela_regressiva_ir_rf }
        - pj: { aliquota: 0.20, retencao: na_fonte }
  - E6_amortizacao: { mesma_estrutura_que: fii.E6 }
  - EC_eventos: { mesma_estrutura_que: fii.eventos_corporativos }
```

---

### II.2 Fiagro-FIDC (Direitos Creditórios do Agronegócio)

```yaml
classe: fiagro_fidc
nome_canonico: "Fiagro — modalidade FIDC (direitos creditórios do agronegócio)"
referencia_legal: [lei_14130_2021, lei_14754_2023]
caracteristica: "Investe em direitos creditórios originados em operações do agronegócio"

eventos:
  - E1_compra: { mesma_estrutura_que: fii.E1 }
  - E2_venda_cota:
      aliquota: 0.20
      nota: "Categoria isolada — compensa apenas com Fiagro-FIDC"
  - E5_rendimento:
      sub_cenarios:
        - pf_com_isencao_fiagro:
            condicao: "4_requisitos_isencao_pf + R6_fiagro_fidc_perfil"
            aliquota: 0.00
        - pf_sem_isencao:
            aliquota: tabela_regressiva_ir_rf
        - pj:
            aliquota: 0.20
            retencao: na_fonte
      nota: "Distribuição pode ser regular (mensal) ou eventual; depende do regulamento"
  - E6_amortizacao: { mesma_estrutura_que: fii.E6 }
  - notas:
      - "Aresta: Fiagro-FIDC tem regulamento muito variado; checar regulamento individual"
      - "Risco de crédito do recebível subjacente — default não é compensável"
```

---

### II.3 Fiagro-FIP (Participações em Empresas do Agronegócio)

```yaml
classe: fiagro_fip
nome_canonico: "Fiagro — modalidade FIP (participações em empresas do agronegócio)"
referencia_legal: [lei_14130_2021, lei_14754_2023, in_cvm_578]

eventos:
  - E1_compra: { mesma_estrutura_que: fii.E1 }
  - E2_venda_cota:
      aliquota: 0.20
      nota: "Categoria isolada — compensa apenas com Fiagro-FIP"
  - E5_amortizacao_ou_distribuicao:
      tipo: realizacao_periodica
      descricao: "FIP qualificado distribui em momentos discretos (não mensal como FII)"
      sub_cenarios:
        - pf_isencao_se_qualificado:
            condicao: "fundo_qualificado_pela_in_cvm_578 + 4_requisitos_isencao"
            aliquota: 0.00
            nota: "Fiagro-FIP qualificado mantém isenção para PF cumprindo requisitos"
        - pf_nao_qualificado:
            aliquota: 0.15
            nota: "Tributação especial de FIP qualificado: 15% só em distribuição/amortização (não come-cotas)"
        - pj: { aliquota: 0.15_a_20_depende_de_in }
      notas:
        - "Fiagro-FIP segue regime tributário mais próximo de FIP do que de FII"
        - "Não há come-cotas em FIP qualificado (diferente de outros fechados pós-Lei 14.754)"
  - notas_gerais:
      - "Fiagro-FIP é raríssimo no mercado; checar regulamento individual"
      - "Ressalva: este capítulo é o que mais precisa de validação tributarista antes de produção"
```

---

## III. EVENTOS TRANSVERSAIS E REGRAS DE COMPENSAÇÃO

---

### III.1 Matriz de compensação de prejuízos

```yaml
matriz_compensacao_fii_fiagro:
  fii_com_fii: SIM
  fii_com_fiagro_fii: NAO  # categorias separadas (interpretação consolidada)
  fii_com_fiagro_fidc: NAO
  fii_com_fiagro_fip: NAO
  fii_com_acoes: NAO  # FII apura separado de RV à vista
  fii_com_etf: NAO
  fiagro_fii_com_fiagro_fii: SIM
  fiagro_fii_com_fiagro_fidc: NAO
  fiagro_fii_com_fiagro_fip: NAO
  fiagro_fidc_com_fiagro_fidc: SIM
  fiagro_fip_com_fiagro_fip: SIM

notas:
  - "ARESTA-CRÍTICA: cada subtipo de Fiagro é categoria SEPARADA. Não é uma categoria 'Fiagro' única."
  - "Prejuízos não têm prazo de vencimento — acumulam indefinidamente"
  - "Cliente que rebalanceia FII por Fiagro-FII PERDE o saldo de prejuízo de FII se nunca mais comprar FII"
```

---

### III.2 Perda da isenção: efeitos no app

```yaml
regra: perda_isencao_pf
gatilhos:
  - cotista_atinge_10_porcento_cotas
  - cotista_atinge_10_porcento_rendimentos
  - cotista_torna_se_pessoa_ligada
  - fundo_deixa_de_ser_listado
  - fundo_cai_abaixo_de_50_cotistas

efeito_no_calculo:
  proximos_rendimentos: "tributados pela tabela regressiva, retenção na fonte pelo administrador"
  rendimentos_passados: "NÃO retroage; já recebidos como isentos permanecem isentos"

implicacao_para_app:
  - "Monitorar participação do cliente em cada FII; alertar quando aproximar 10%"
  - "Após perda de isenção, app deve aplicar tabela regressiva automaticamente"
  - "Recuperação: se cotista reduz participação abaixo de 10%, isenção é restabelecida nos próximos pagamentos"
  - "Aresta: cliente que tem múltiplos FII e em UM deles ultrapassa 10% — perde isenção SÓ desse FII, não dos outros"
```

---

### III.3 Diferença entre rendimento e amortização

```yaml
regra: rendimento_vs_amortizacao
contexto: "Maioria das corretoras lança ambos como 'provento', causando erro fiscal"
distincao:
  rendimento:
    natureza: distribuicao_de_lucro_caixa_do_fundo
    impacto_custo: NAO_afeta
    tributacao_pf_com_isencao: 0
    fonte_de_verdade: fato_relevante_ou_aviso_administradora
  amortizacao:
    natureza: devolucao_de_capital_aos_cotistas
    impacto_custo: REDUZ_custo_medio_pelo_valor_amortizado
    tributacao: nenhuma_na_amortizacao
    fonte_de_verdade: fato_relevante_ou_aviso_administradora

implicacao_para_app:
  - "App deve buscar fato relevante / aviso da administradora para classificar cada distribuição"
  - "Lançamento errado: tratar amortização como rendimento → custo médio não reduz → ganho na venda fica inflado → IR a maior"
  - "Lançamento errado inverso: tratar rendimento como amortização → custo médio é reduzido errado → ganho futuro fica deflado → IR a menor (passivo oculto)"
```

---

### III.4 Apuração mensal consolidada (DARF 6015)

```yaml
processo: apuracao_mensal_fii_e_fiagro
codigo_darf: 6015  # mesmo da RV mas em apuração ISOLADA por categoria
vencimento: ultimo_dia_util_do_mes_seguinte
fluxo_de_calculo:
  1. consolidar vendas de cotas por categoria (FII, Fiagro-FII, Fiagro-FIDC, Fiagro-FIP)
  2. calcular ganho/prejuízo por categoria
  3. compensar prejuízos acumulados dentro da MESMA categoria
  4. aplicar 20% sobre o resultado positivo (se houver)
  5. abater dedo-duro retido pelo intermediário
  6. emitir DARF 6015 com saldo somando todas as categorias positivas

nota: "Mesmo código DARF (6015) mas categorias internas isoladas. App tem que manter 4 baldes de prejuízo acumulado: fii, fiagro_fii, fiagro_fidc, fiagro_fip"
```

---

## IV. ARESTAS NÃO ÓBVIAS

---

### IV.1 Aresta da venda parcial com custo médio

Cliente comprou 100 cotas de KNRI11 a R$ 100 (custo médio 100). Recebeu 5 cotas em bonificação atribuídas a R$ 80. Custo médio recalcula para `(100*100 + 5*80) / 105 = 99,05`. Vende 50 cotas a R$ 110: ganho = 50 × (110 - 99,05) = R$ 547,50. App tem que recalcular custo médio em cada evento corporativo antes da venda.

---

### IV.2 Aresta da janela de pagamento de rendimento

Investidor que compra cota um dia antes da data de corte (data ex) recebe rendimento integral do mês. Aresta operacional: o app calcula a posição na data-ex, não na data-pagamento. Se cliente vende a cota no dia seguinte da data-ex mas antes da data-pagamento, ainda recebe o rendimento.

---

### IV.3 Aresta do FoF (Fundo de Fundos Imobiliários)

FoF é um FII que investe em outros FII. Distribui rendimentos que vieram majoritariamente de outros FII. Isenção PF aplica desde que o FoF cumpra os 4 requisitos próprios (não importa se os FII subjacentes cumprem). Aresta operacional: app deve tratar FoF como FII normal para fins fiscais do cotista direto.

---

### IV.4 Aresta de FII de desenvolvimento (que não distribui rendimento)

FII de desenvolvimento (constrói imóveis para vender) raramente distribui rendimento durante a fase de obras. Geralmente faz amortização e distribuição de lucro só ao final. Cliente que vê esses FII como "FII que não paga rendimento" não está errado — mas precisa entender que o ganho vai vir como ganho de capital na venda da cota (20%), não como rendimento isento.

---

### IV.5 Aresta de FII fechado com cotistas qualificados

Alguns FII (especialmente de papel ou de desenvolvimento) são fechados a investidores qualificados ou profissionais. Por serem distribuídos em mercado de balcão organizado, podem cumprir o requisito de listagem — mas a checagem dos 50 cotistas é o mais frequentemente quebrado. App deve buscar essa informação no informe mensal do fundo.

---

### IV.6 Aresta da retirada por mortis causa

Sucessão de cotas de FII para herdeiros: não é fato gerador para os herdeiros (sucessão é causa mortis, sem alienação onerosa). Mas o ITCMD do estado é aplicável. Custo médio dos herdeiros = valor atribuído na declaração de espólio (não o custo histórico).

---

### IV.7 Aresta do dedo-duro em venda parcial de FII

Diferente das ações em que dedo-duro só retém se ≥ R$ 1, em FII a retenção do dedo-duro segue a mesma regra (0,005% sobre valor da venda, threshold R$ 1). Para venda pequena de FII, pode não haver retenção mas há FG.

---

### IV.8 Aresta da OPA forçada

Algumas OPAs de fechamento de capital em FII têm prazo legal para o cotista discordar. Cotista que não adere e o fundo é forçado a fechar — recebe pagamento compulsório, FG normal como E2.

---

## V. LACUNAS CONHECIDAS

1. **Tratamento exato de distribuição em ativos (não-dinheiro)** — quando fundo distribui imóveis ou outros ativos em vez de dinheiro. Interpretação CVM/RFB não totalmente consolidada.
2. **Fiagro-FIP qualificado** — IN específica ainda em consolidação; alíquota de 15% e isenção sob requisitos precisam de validação caso a caso.
3. **Tributação de FII em conta-investimento offshore** — interpretação Lei 14.754 quando cliente brasileiro tem FII via custódia internacional (raro).
4. **Cisão envolvendo categorias diferentes** — FII que se cinde gerando Fiagro (ou vice-versa) — tratamento da continuidade fiscal entre categorias diferentes.
5. **Liquidação parcial vs total** — algumas administradoras fazem liquidação "parcial" do fundo; tratamento exato precisa de IN.
6. **FII com cotas de classes diferentes (Classe A vs Classe B)** — surgindo no mercado em 2024-2025; tratamento fiscal das classes individuais.
7. **Pagamento de rendimentos extraordinários no encerramento de exercício** — alguns FII pagam "extras" no final do ano; tratamento idêntico ao mensal mas merece destaque.

---

## VI. CHECKLIST PARA REVISÃO DO TRIBUTARISTA

- [ ] FII coberto: E1, E2, E4, E5 (com 5 sub-cenários de isenção), E6, EC1 a EC8
- [ ] Fiagro-FII coberto
- [ ] Fiagro-FIDC coberto (com R6 perfil-mínimo)
- [ ] Fiagro-FIP coberto (com regime FIP qualificado)
- [ ] Matriz de compensação isolada por categoria
- [ ] Regra de perda da isenção (incluindo pessoa ligada R5)
- [ ] Distinção rendimento × amortização explícita
- [ ] DARF 6015 com baldes internos por categoria
- [ ] Arestas IV.1 a IV.8 documentadas
- [ ] Lacunas em V flagged para tributarista

---

*Próximas MGTs a montar: ETFs (BR e exterior), Fluxos de pessoa + Lei 15.270, Internacional Lei 14.754, Fundos abertos com come-cotas, Fundos fechados pós-14.754, Veículos (PJ Lucro Presumido / Holding patrimonial / Offshore PIC / Trust).*
