# MGT — Matriz de Granularidade Tributária | Renda Fixa

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência das regras codificadas:** 01/01/2026 (já com Lei 14.754/2023 e Lei 15.270/2025 em vigor)
**Escopo:** todos os instrumentos de Renda Fixa relevantes ao consultor B2B2C atendendo PF residente no Brasil
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine

---

## 0. Glossário de variáveis (compartilhado entre todos os títulos)

| Variável | Significado |
|----------|-------------|
| `data_compra` | Data da liquidação financeira da compra |
| `data_evento` | Data do evento sob análise (resgate, vencimento, cupom) |
| `dias_desde_compra` | `data_evento - data_compra` em dias corridos |
| `dias_desde_emissao` | `data_evento - data_emissao` (relevante p/ alguns títulos) |
| `valor_compra` | PU × quantidade na compra (já líquido de taxa) |
| `custo_medio_lote` | Custo de aquisição alocado proporcionalmente ao lote |
| `valor_evento` | Valor recebido no resgate/vencimento/cupom |
| `ganho_bruto` | `valor_evento - custo_alocado_ao_evento` |
| `iof_devido` | Resultado da `tabela_iof_30d` quando aplicável |
| `aliquota_ir` | Alíquota de IR aplicada (resultado da regra) |
| `irrf` | IR retido na fonte (calculado e retido pelo custodiante) |
| `prejuizo_realizado_rf` | Perda no evento; **NÃO compensa em outras operações** |
| `passivo_latente` | Carrego tributário hipotético se vendesse hoje |

---

## 0.1 Tabelas auxiliares (referenciadas por todos os títulos)

```yaml
tabela: tabela_regressiva_ir_rf
referencia_legal: lei_11033_2004
faixas:
  - condicao: "dias_desde_compra <= 180"
    aliquota: 0.225
  - condicao: "180 < dias_desde_compra <= 360"
    aliquota: 0.20
  - condicao: "360 < dias_desde_compra <= 720"
    aliquota: 0.175
  - condicao: "dias_desde_compra > 720"
    aliquota: 0.15
```

```yaml
tabela: tabela_iof_30d
referencia_legal: decreto_6306_2007_anexo
descricao: "Aplica-se sobre o ganho (não sobre o principal)"
faixas:
  - dia: 1, percentual: 0.96
  - dia: 2, percentual: 0.93
  - dia: 3, percentual: 0.90
  # ... decrescimento de ~3pp/dia
  - dia: 29, percentual: 0.03
  - dia: 30, percentual: 0.00
  # nota: tabela completa nos 30 dias está no Anexo do Decreto 6.306/2007
```

---

## I. RENDA FIXA TRIBUTADA

---

### I.1 Tesouro Selic / LFT (pós-fixado, sem cupom)

```yaml
classe: tesouro_selic
nome_canonico: "Tesouro Selic / LFT"
indexador: SELIC
paga_cupom: false
referencia_legal: [lei_11033_2004, in_rfb_1585_2015]

eventos:

  - id: E1_compra
    tipo: aquisicao
    pre_condicoes: []
    tributacao: nenhuma
    output: estabelece_custo_base
    captura: [data_compra, qtde, pu_compra, taxa_aquisicao, corretora, custodia]

  - id: E2_resgate_antecipado
    tipo: realizacao
    descricao: "Liquidação antecipada via Tesouro Direto OU venda no mercado secundário"
    pre_condicoes: [posicao_em_carteira > 0]
    sub_cenarios:
      - usa_tabela: tabela_regressiva_ir_rf
    iof:
      aplica_se: "dias_desde_compra <= 30"
      tabela: tabela_iof_30d
      base: ganho_bruto
    base_calculo: "ganho_liquido = max(0, valor_evento - custo_medio_lote - iof_devido)"
    tributacao:
      formula: "ganho_liquido * aliquota_ir"
      retencao: na_fonte_pelo_custodiante
    output:
      - irrf
      - liquido_recebido
      - prejuizo_realizado_rf  # NÃO COMPENSA em outras RF tributadas nem em RV
    captura: [data_evento, pu_evento, aliquota_aplicada, irrf, iof_devido]
    notas:
      - "Saída no mesmo dia: cai em prazo_ate_180 + IOF de 96% sobre o ganho — quase confisca o lucro"
      - "Prejuízo em LFT acontece: marcação a mercado pode oscilar negativamente em períodos de stress"

  - id: E3_vencimento
    tipo: realizacao_automatica
    descricao: "Liquidação no vencimento, SEM ação do cliente — app deve antecipar e exibir"
    pre_condicoes: [data_vencimento_atingida, posicao_em_carteira > 0]
    sub_cenarios:
      - usa_tabela: tabela_regressiva_ir_rf
    iof:
      aplica_se: false  # vencimento sempre > 30d na prática
    base_calculo: "ganho_liquido = valor_face - custo_medio_lote"
    tributacao:
      formula: "ganho_liquido * aliquota_ir"
      retencao: na_fonte
    output: [irrf, liquido_recebido]
    captura: [data_vencimento, valor_face_recebido, aliquota_aplicada, irrf]
    notas:
      - "App deve gerar alerta proativo D-30 e D-7 do vencimento"
      - "Cliente pode escolher reaplicar — nesse caso, novo lote, novo data_compra"

  - id: E4_marcacao_intra_periodo
    tipo: estado
    descricao: "Atualização diária do valor de mercado da posição em carteira"
    pre_condicoes: [posicao_em_carteira > 0, sem_realizacao]
    tributacao: nenhuma
    output: passivo_latente
    captura: [data_snapshot, pu_mercado, ganho_latente_se_vendesse_hoje, aliquota_que_seria_aplicada]
    notas:
      - "Importante para o painel 'IR projetado se realizar hoje'"
      - "LFT é menos volátil que NTN-B mas marca a mercado mesmo assim"

  - id: E5_evento_institucional
    tipo: realizacao_excepcional
    descricao: "Recompra/troca de papel pelo Tesouro (raro)"
    pre_condicoes: [evento_anunciado_pelo_tesouro]
    tratamento: "trata como E2 com data e PU do evento institucional"
```

---

### I.2 Tesouro Prefixado sem cupom / LTN

```yaml
classe: tesouro_prefixado_ltn
nome_canonico: "Tesouro Prefixado / LTN"
indexador: prefixado
paga_cupom: false
caracteristica_distintiva: "PU sobe não-linearmente até R$ 1.000 no vencimento"

eventos:
  - id: E1_compra
    captura: [data_compra, qtde, pu_compra, taxa_aquisicao_anual, vencimento_alvo]

  - id: E2_resgate_antecipado
    descricao: "Sujeito a marcação a mercado — pode dar grandes ganhos OU prejuízos"
    sub_cenarios:
      - usa_tabela: tabela_regressiva_ir_rf
    iof: { aplica_se: "dias_desde_compra <= 30", tabela: tabela_iof_30d }
    base_calculo: "ganho_liquido = max(0, valor_evento - custo_medio_lote - iof_devido)"
    tributacao: { formula: "ganho_liquido * aliquota_ir", retencao: na_fonte }
    notas:
      - "Em ambiente de alta de juros, prejuízo em LTN é comum — mesma regra de não-compensação"
      - "Aresta: LTN comprada com taxa baixa pode ser vendida com prejuízo significativo"

  - id: E3_vencimento
    descricao: "Recebe valor de face R$ 1.000 por título"
    sub_cenarios:
      - usa_tabela: tabela_regressiva_ir_rf  # quase sempre cai em > 720d
    base_calculo: "ganho = valor_face - custo_medio"
    tributacao: { formula: "ganho * aliquota_ir", retencao: na_fonte }

  - id: E4_marcacao
    tributacao: nenhuma
    output: passivo_latente_volatil  # subindo juros = passivo cai (porque PU cai)

  # E5 não se aplica (não há cupom e LTN não tem evento institucional comum)
```

---

### I.3 Tesouro NTN-F (prefixado COM cupom semestral)

```yaml
classe: tesouro_ntnf
nome_canonico: "Tesouro Prefixado com Juros Semestrais / NTN-F"
indexador: prefixado
paga_cupom: true
periodicidade_cupom: semestral
taxa_cupom_anual: 0.10  # 10% a.a. para emissões padrão

eventos:
  - id: E1_compra
    captura: [data_compra, qtde, pu_compra, taxa_aquisicao_anual, vencimento, datas_cupom]

  - id: E2_resgate_antecipado
    sub_cenarios: [{ usa_tabela: tabela_regressiva_ir_rf }]
    iof: { aplica_se: "dias_desde_compra <= 30", tabela: tabela_iof_30d }
    base_calculo: "ganho = max(0, valor_evento - custo_alocado_ao_lote - iof)"
    tributacao: { formula: "ganho * aliquota_ir", retencao: na_fonte }

  - id: E3_vencimento
    base_calculo: "ganho = valor_face + ultimo_cupom - custo_medio"

  - id: E5_recebimento_cupom
    tipo: realizacao_periodica_automatica
    descricao: "Cupom semestral pago em datas específicas — SEM ação do cliente"
    pre_condicoes: [data_cupom_atingida, posicao_em_carteira > 0]
    sub_cenarios:
      - usa_tabela: tabela_regressiva_ir_rf
        nota: "Prazo é contado desde data_compra do título, NÃO desde último cupom"
    base_calculo: "valor_cupom_bruto"  # cupom inteiro é base, sem dedução de custo
    tributacao: { formula: "valor_cupom * aliquota_ir", retencao: na_fonte }
    output: [irrf, valor_cupom_liquido]
    captura: [data_cupom, valor_bruto, aliquota, irrf]
    notas:
      - "ARESTA-CHAVE: alíquota do cupom usa o prazo desde a compra do título, não desde o cupom anterior. Cupom logo após compra = 22,5%"
      - "Se houve compra de novos lotes em datas diferentes, cada lote tem alíquota diferente para o mesmo cupom"

  - id: E4_marcacao
    output: passivo_latente
```

---

### I.4 Tesouro IPCA+ Principal / NTN-B Principal

```yaml
classe: tesouro_ntnb_principal
nome_canonico: "Tesouro IPCA+ (sem cupom) / NTN-B Principal"
indexador: ipca_mais_juros_real
paga_cupom: false

eventos:
  - id: E1_compra
    captura: [data_compra, qtde, pu_compra, taxa_real_aquisicao, vencimento]

  - id: E2_resgate_antecipado
    sub_cenarios: [{ usa_tabela: tabela_regressiva_ir_rf }]
    iof: { aplica_se: "dias_desde_compra <= 30", tabela: tabela_iof_30d }
    base_calculo: "ganho = max(0, valor_evento - custo_medio - iof)"
    tributacao: { formula: "ganho * aliquota_ir", retencao: na_fonte }
    notas:
      - "ARESTA: NTN-B tem alta volatilidade de PU — prejuízos relevantes em ciclos de alta de juros reais"
      - "O 'ganho' tributável inclui o componente IPCA realizado + juros reais — Receita não distingue (ao contrário de outros países)"

  - id: E3_vencimento
    base_calculo: "ganho = valor_face_atualizado_ipca - custo_medio"
    tributacao: { formula: "ganho * 0.15", retencao: na_fonte }
    notas:
      - "NTN-B Principal de prazo longo sempre cai em > 720d → 15%"

  - id: E4_marcacao
    output: passivo_latente_volatil
    notas: ["Em períodos de stress, marcação negativa pode dar prejuízo latente grande — não converte em IR a pagar"]
```

---

### I.5 Tesouro IPCA+ com Juros Semestrais / NTN-B

```yaml
classe: tesouro_ntnb
nome_canonico: "Tesouro IPCA+ com Juros Semestrais / NTN-B"
indexador: ipca_mais_juros_real
paga_cupom: true
periodicidade_cupom: semestral
taxa_cupom_anual_real: 0.06  # 6% a.a. real para emissões padrão

eventos:
  - id: E1_compra
  - id: E2_resgate_antecipado
    # idêntico a NTN-B Principal
  - id: E3_vencimento
  - id: E4_marcacao
  - id: E5_recebimento_cupom
    tipo: realizacao_periodica_automatica
    sub_cenarios:
      - usa_tabela: tabela_regressiva_ir_rf
        nota: "Prazo contado desde compra do título, não desde último cupom"
    base_calculo: "valor_cupom_bruto"  # cupom é tributado integralmente
    tributacao: { formula: "valor_cupom * aliquota_ir", retencao: na_fonte }
    notas:
      - "Cupom semestral em NTN-B é em REAL (corrigido pelo IPCA acumulado até a data)"
      - "Aresta: se cliente compra NTN-B logo antes de cupom, paga 22,5% no primeiro cupom mesmo que o título seja longo"
```

---

### I.6 Tesouro Renda+ / NTN-B com benefício de aposentadoria

```yaml
classe: tesouro_renda_mais
nome_canonico: "Tesouro Renda+ (NTN-B com pagamento programado em 240 parcelas)"
referencia_legal: [in_tesouro_renda_mais]
caracteristica: "Após período de acumulação, pagamento mensal em 20 anos (240 parcelas)"

eventos:
  - id: E1_compra
  - id: E2_resgate_antecipado_pre_conversao
    descricao: "Resgate antes do início da conversão em renda"
    sub_cenarios: [{ usa_tabela: tabela_regressiva_ir_rf }]
    notas:
      - "ARESTA: deságio definido pelo Tesouro pode reduzir significativamente o valor"

  - id: E5_recebimento_parcela_mensal
    tipo: realizacao_periodica_automatica
    pre_condicoes: [periodo_conversao_iniciado]
    sub_cenarios:
      - usa_tabela: tabela_regressiva_ir_rf
        nota: "Se segurou >720d antes da conversão, todas as parcelas usam 15%"
    base_calculo: "parcela_atualizada_ipca"
    tributacao: { formula: "parcela * 0.15", retencao: na_fonte }
    notas:
      - "Particularidade: na fase de pagamento, cada parcela é calculada como amortização + juros + IPCA"
      - "Ainda em interpretação consolidada — verificar IN RFB específica antes de produção"
```

---

### I.7 Tesouro Educa+ (similar a Renda+, com horizonte fixo de 5 anos de pagamento)

```yaml
classe: tesouro_educa_mais
nome_canonico: "Tesouro Educa+"
caracteristica: "Pagamento em 60 parcelas mensais (5 anos)"
eventos: # estrutura idêntica a Renda+, ajustando para 60 parcelas
  - E1_compra, E2_resgate_pre_conversao, E5_parcela_mensal (60x), E4_marcacao
```

---

### I.8 CDB

```yaml
classe: cdb
nome_canonico: "Certificado de Depósito Bancário"
emissor: instituicao_financeira
garantia_fgc: true  # até R$ 250k por CPF por instituição, R$ 1MM teto global a cada 4 anos
indexador: variado  # pré, pós-CDI, IPCA+, híbrido

eventos:
  - id: E1_compra
    captura: [data_compra, valor_aplicado, indexador, taxa_contratada, vencimento, liquidez_diaria_sn]

  - id: E2_resgate_antecipado
    pre_condicoes: [liquidez_diaria == true OR existe_mercado_secundario]
    sub_cenarios: [{ usa_tabela: tabela_regressiva_ir_rf }]
    iof: { aplica_se: "dias_desde_compra <= 30", tabela: tabela_iof_30d }
    base_calculo: "ganho = max(0, valor_resgate - valor_aplicado - iof)"
    tributacao: { formula: "ganho * aliquota_ir", retencao: na_fonte }
    notas:
      - "Sem liquidez diária e sem secundário, não há E2 — só vencimento"
      - "Alguns CDBs têm carência (ex.: 90 dias) onde nenhum resgate é permitido"

  - id: E3_vencimento
    descricao: "Resgate automático no vencimento"
    sub_cenarios: [{ usa_tabela: tabela_regressiva_ir_rf }]
    base_calculo: "ganho = valor_resgate - valor_aplicado"
    tributacao: { formula: "ganho * aliquota_ir", retencao: na_fonte }

  - id: E4_marcacao
    pre_condicoes: [marcacao_a_mercado == true]
    notas: ["Maioria dos CDBs é marcação na curva (sem volatilidade aparente); CDBs com secundário ativo marcam a mercado"]

  - id: E5_default_emissor
    tipo: evento_excepcional
    descricao: "Inadimplência do emissor — acionamento do FGC"
    sub_cenarios:
      - id: dentro_limite_fgc
        condicao: "valor_aplicado_total_no_emissor <= 250000"
        tratamento: "FGC paga; sem perda; sem fato gerador adicional"
      - id: acima_limite_fgc
        tratamento: "perda do excedente — não compensa em RF tributada nem em RV"
    notas: ["App deve alertar quando aporte ultrapassa limite FGC por instituição"]
```

---

### I.9 LC — Letra de Câmbio

```yaml
classe: letra_cambio
nome_canonico: "Letra de Câmbio (sociedades de crédito)"
emissor: financeira_nao_bancaria
garantia_fgc: true  # idem CDB
# tributação idêntica a CDB
eventos: # E1, E2, E3, E4, E5 com mesma lógica que CDB
  - mesma_estrutura_que: cdb
  - notas:
      - "FGC cobre LC mas a percepção de risco é maior"
      - "Liquidez diária é rara — quase sempre só no vencimento"
```

---

### I.10 Debêntures comuns (não incentivadas)

```yaml
classe: debenture_comum
nome_canonico: "Debênture comum"
emissor: empresa_nao_financeira
garantia_fgc: false
remuneracao: variada  # pré, %CDI, IPCA+

eventos:
  - id: E1_compra
    captura: [data_compra, valor_aplicado, indexador, taxa, vencimento, fluxo_pagamentos]

  - id: E2_venda_secundario
    sub_cenarios: [{ usa_tabela: tabela_regressiva_ir_rf }]
    iof: { aplica_se: "dias_desde_compra <= 30", tabela: tabela_iof_30d }
    base_calculo: "ganho = max(0, valor_venda - custo_medio_lote - iof)"
    tributacao: { formula: "ganho * aliquota_ir", retencao: na_fonte }

  - id: E3_vencimento
    base_calculo: "ganho = valor_face_atualizado - custo_medio"
    tributacao: { formula: "ganho * aliquota_ir", retencao: na_fonte }

  - id: E5_pagamento_juros
    tipo: realizacao_periodica
    descricao: "Pagamentos de juros conforme escritura (semestral/anual/mensal)"
    sub_cenarios:
      - usa_tabela: tabela_regressiva_ir_rf
        nota: "Prazo desde data_compra"
    base_calculo: "valor_juros_pagos"
    tributacao: { formula: "juros * aliquota_ir", retencao: na_fonte }

  - id: E5b_pagamento_amortizacao
    tipo: amortizacao_programada
    descricao: "Devolução parcial de principal antes do vencimento"
    tratamento: "ajusta custo_medio_lote — não há fato gerador de IR sobre amortização de principal"

  - id: E6_evento_credito
    tipo: evento_excepcional
    descricao: "Reestruturação, default, conversão em ações"
    sub_cenarios:
      - id: default
        tratamento: "perda parcial/total do capital — NÃO compensa em RF nem RV"
      - id: conversao_em_acoes
        tratamento: "fato gerador de venda da debênture pelo valor de troca + aquisição de ações pelo mesmo valor"
        notas: ["Tributa como E2 com valor_venda = valor da troca"]
```

---

### I.11 COE — Certificado de Operações Estruturadas

```yaml
classe: coe
nome_canonico: "Certificado de Operações Estruturadas"
emissor: instituicao_financeira
garantia_fgc: false  # COE NÃO é coberto pelo FGC
caracteristica: "Estrutura híbrida: parte RF + derivativos (opções)"
modalidade: [capital_protegido, capital_em_risco]

eventos:
  - id: E1_compra
    captura: [data_compra, valor_aplicado, ativo_subjacente, condicoes_pagamento, vencimento]

  - id: E2_venda_secundario
    pre_condicoes: [secundario_disponivel]
    sub_cenarios: [{ usa_tabela: tabela_regressiva_ir_rf }]
    notas: ["Liquidez secundária é frequentemente ruim; spread alto"]

  - id: E3_vencimento
    descricao: "Liquidação conforme as condições da estrutura"
    sub_cenarios: [{ usa_tabela: tabela_regressiva_ir_rf }]
    base_calculo: "ganho = valor_recebido - valor_aplicado"
    tributacao: { formula: "ganho * aliquota_ir", retencao: na_fonte }
    notas:
      - "ARESTA: se a estrutura for capital_em_risco e valor_recebido < valor_aplicado, prejuízo NÃO compensa"
      - "ARESTA: alguns COE podem pagar 'cupom' condicional — tributação no recebimento como E5 abaixo"

  - id: E5_pagamento_condicional
    descricao: "Quando o COE paga cupom intermediário condicional"
    sub_cenarios: [{ usa_tabela: tabela_regressiva_ir_rf }]
    base_calculo: "valor_pagamento"
    tributacao: { formula: "valor * aliquota_ir", retencao: na_fonte }
```

---

### I.12 Nota comercial / commercial paper

```yaml
classe: nota_comercial
nome_canonico: "Nota Comercial (lei 14.195/2021)"
emissor: empresa_nao_financeira
caracteristica: "Similar a debênture comum, sem necessidade de assembleia de debenturistas"
tributacao: identica_a_debenture_comum
eventos:
  - mesma_estrutura_que: debenture_comum
```

---

## II. RENDA FIXA ISENTA (PESSOA FÍSICA)

---

### II.1 LCI — Letra de Crédito Imobiliário

```yaml
classe: lci
nome_canonico: "Letra de Crédito Imobiliário"
emissor: instituicao_financeira_com_lastro_imobiliario
garantia_fgc: true  # mesmo limite (R$ 250k)
isenta_pf: true
referencia_legal: [lei_11033_2004_art3, lei_10931_2004]
prazo_minimo_saque:
  emissoes_ate_30_jun_2024: 90_dias
  emissoes_apos_30_jun_2024:
    valor: 9_meses
    referencia: cmn_resolucao_5118_2024
    nota: "Para alguns lastros (residencial específico) pode ser maior — verificar IN vigente"

eventos:
  - id: E1_compra
    captura: [data_compra, valor_aplicado, indexador, taxa, vencimento, liquidez, prazo_minimo_aplicavel]

  - id: E2_resgate_antecipado
    pre_condicoes:
      - "dias_desde_compra >= prazo_minimo_aplicavel"
      - liquidez_diaria == true OR existe_mercado_secundario
    tributacao: { irrf: 0, iof: 0 }
    output: [valor_recebido_integral]
    notas:
      - "Se resgatar antes do prazo mínimo: NÃO PERMITIDO no primário; no secundário pode haver, mas perde isenção (vira tributada regressiva)"
      - "ARESTA-CHAVE: app deve bloquear sugestão de venda antes do prazo mínimo ou avisar da perda da isenção"

  - id: E3_vencimento
    pre_condicoes: [data_vencimento_atingida]
    tributacao: { irrf: 0, iof: 0 }
    output: [valor_face_recebido_integral]

  - id: E4_marcacao
    notas: ["LCI marca na curva quase sempre; sem evento tributário"]

  - id: E5_default
    sub_cenarios:
      - dentro_fgc: { tratamento: "FGC paga, sem perda" }
      - acima_fgc: { tratamento: "perda do excedente, não compensa nada" }
```

---

### II.2 LCA — Letra de Crédito do Agronegócio

```yaml
classe: lca
nome_canonico: "Letra de Crédito do Agronegócio"
isenta_pf: true
emissor: instituicao_financeira
garantia_fgc: true
prazo_minimo_saque:
  emissoes_ate_2024: 90_dias
  emissoes_apos_cmn_5118: 9_meses
# tributação e eventos idênticos a LCI
eventos:
  - mesma_estrutura_que: lci
  - notas: ["Lastro: operações do agronegócio. Isenção PF idêntica."]
```

---

### II.3 LIG — Letra Imobiliária Garantida

```yaml
classe: lig
nome_canonico: "Letra Imobiliária Garantida"
referencia_legal: [lei_13097_2015]
isenta_pf: true
emissor: instituicao_financeira
garantia_fgc: false  # LIG NÃO tem FGC; tem cobertura por garantia real (carteira de créditos imobiliários)
prazo_minimo_saque: 24_meses

eventos:
  - id: E1_compra
  - id: E2_venda_secundario
    pre_condicoes: ["dias_desde_compra >= 24_meses"]
    tributacao: { irrf: 0 }
  - id: E3_vencimento: { tributacao: zero }
  - id: E4_marcacao: { passivo_latente: zero }
  - id: E5_default
    descricao: "Acionamento da garantia por carteira segregada"
    notas: ["Risco diferente de FGC; estrutura de cover pool"]
```

---

### II.4 CRI — Certificado de Recebíveis Imobiliários

```yaml
classe: cri
nome_canonico: "Certificado de Recebíveis Imobiliários"
emissor: securitizadora
isenta_pf: true
referencia_legal: [lei_11033_2004, lei_9514_1997]
garantia_fgc: false  # securitização não tem FGC
prazo_minimo_saque: nenhum_legal  # mas escritura pode estabelecer lockup específico

eventos:
  - id: E1_compra

  - id: E2_venda_secundario
    pre_condicoes: [secundario_disponivel]
    tributacao: { irrf: 0 }
    notas: ["Liquidez secundária varia muito; CRI corporativo é mais líquido que CRI pulverizado"]

  - id: E3_vencimento: { tributacao: zero, output: valor_face_atualizado }

  - id: E5_pagamento_juros_periodico
    descricao: "Maioria dos CRIs paga juros mensais ou semestrais"
    tributacao: zero
    output: juros_recebidos_integrais

  - id: E5b_amortizacao_parcial
    tipo: devolucao_principal
    tratamento: "reduz custo do título — sem fato gerador"

  - id: E6_evento_credito
    sub_cenarios:
      - default_securitizadora: { tratamento: "perda; não compensa" }
      - reestruturacao: { tratamento: "ajuste custo; consultar tributarista" }
```

---

### II.5 CRA — Certificado de Recebíveis do Agronegócio

```yaml
classe: cra
nome_canonico: "Certificado de Recebíveis do Agronegócio"
isenta_pf: true
referencia_legal: [lei_11076_2004]
# eventos idênticos a CRI, com lastro em recebíveis do agronegócio
eventos:
  - mesma_estrutura_que: cri
```

---

### II.6 Debêntures incentivadas — Lei 12.431

```yaml
classe: debenture_incentivada
nome_canonico: "Debênture incentivada (Lei 12.431/2011)"
referencia_legal: [lei_12431_2011, decreto_8874_2016]
isenta_pf: true  # PF residente; PJ tem alíquota reduzida 15%
emissor: spe_de_infraestrutura  # vinculada a projeto declarado
caracteristica_distintiva: "Vinculada a projeto de infraestrutura aprovado pelo Ministério setorial"
restricao_anti_abuso: "Vedação de venda imediata após emissão para 'partes ligadas' do emissor"

eventos:
  - id: E1_compra
    captura: [data_compra, codigo_isin, projeto_lastro, ministerio_aprovador]

  - id: E2_venda_secundario
    tributacao: { irrf: 0 }  # PF mantém isenção
    notas:
      - "Ganho de capital na venda mantém-se isento para PF (interpretação consolidada)"
      - "ARESTA: para PJ a alíquota é 15% sobre ganho — relevante em holding"

  - id: E3_vencimento: { tributacao: zero }

  - id: E5_pagamento_juros
    tributacao: zero
    output: juros_isentos

  - id: E5b_amortizacao
    tratamento: "ajusta custo, sem FG"

  - id: E6_evento_credito
    notas:
      - "ARESTA: se o projeto perder qualificação para Lei 12.431 retroativamente, pode haver retributação — risco residual"
      - "Default do emissor: perda não compensa"
```

---

### II.7 Caderneta de Poupança

```yaml
classe: poupanca
nome_canonico: "Caderneta de poupança"
isenta_pf: true  # rendimento PF
emissor: bancos_multiplos_e_caixa
indexador:
  regra_atual: "se Selic > 8,5%: TR + 0,5% a.m.; se Selic <= 8,5%: 70% Selic + TR"

eventos:
  - id: E1_deposito
  - id: E2_saque
    tributacao: zero
  - id: E5_credito_rendimento
    descricao: "Aniversário mensal — credita rendimento na conta"
    tributacao: zero
  - id: E5b_perda_aniversario
    descricao: "Saque antes do aniversário do depósito perde rendimento do mês"
    tratamento: "não é fato gerador, mas relevante para projeção de rendimento"
```

---

## III. EVENTOS TRANSVERSAIS E REGRAS DE COMPENSAÇÃO

---

### III.1 Não-compensação de prejuízo em RF tributada

**Regra crucial e contra-intuitiva:** prejuízos realizados em ativos de RF tributada (LFT vendida com prejuízo, debênture comum, CDB com secundário) **não compensam ganhos em outras operações financeiras** (nem RF tributada nem RV nem fundos). Diferente de RV, onde prejuízo compensa ganho de mesma natureza.

```yaml
regra: nao_compensacao_prejuizo_rf
referencia_legal: [in_rfb_1585_2015]
escopo:
  - Tesouro Selic, Pré, IPCA+ (todos)
  - CDB, LC
  - Debênture comum
  - COE
  - Nota comercial
implicacao:
  - "Prejuízo em RF tributada vira capital perdido para fins fiscais"
  - "App deve marcar prejuízos em RF como 'descartados' e não acumular saldo compensável"
  - "Otimização tributária: evitar realizar prejuízo em RF (segurar até vencimento se possível)"
```

---

### III.2 IOF regressivo nos primeiros 30 dias

```yaml
tabela: tabela_iof_30d  # já definida em 0.1
escopo:
  aplica_a:
    - todas_as_RF_tributadas
    - poupanca_apenas_se_resgate_em_dias_especificos  # regra própria
    - fundos_abertos  # incidência diferente — ver MGT_fundos
  nao_aplica_a:
    - LCI, LCA, LIG, CRI, CRA, debentures_incentivadas, poupanca_no_aniversario
implicacao_para_app:
  - "Sugestão de resgate dentro de 30 dias DEVE mostrar o impacto do IOF antes do IR"
  - "Aresta: IOF não é dedutível do IRPF — é custo de transação"
```

---

### III.3 Marcação a mercado vs marcação na curva

```yaml
regra: politica_marcacao
descricao: |
  Marcação na curva: PU calculado pela taxa contratada × dias decorridos. Sem volatilidade aparente.
  Marcação a mercado: PU calculado pela taxa de negociação atual. Volátil.
implicacao:
  - "Tributação só nasce na realização (E2 ou E3); marcação não gera FG"
  - "Mas o app deve mostrar AMBOS os valores: 'valor na curva' (o que o cliente teria sem volatilidade) e 'valor de mercado' (o que ele teria se vendesse hoje, com IR já descontado)"
  - "Tesouro Direto: hoje todos os títulos têm marcação a mercado para venda antecipada; vencimento usa preço de face"
  - "CDB sem secundário: marcação na curva sempre"
```

---

### III.4 Liquidação automática (vencimento)

```yaml
regra: vencimento_evento_automatico
descricao: |
  Vencimento é fato gerador de IR sem ação do cliente.
implicacao_critica:
  - "App deve antecipar todos os vencimentos do mês/trimestre seguinte"
  - "Alerta D-30 e D-7 com cálculo de IR projetado e líquido a receber"
  - "Sugestão de reaplicação tax-aware: se reaplicar em LCI antes do vencimento da LFT, perde-se a chance de comparar líquido pós-IR"
```

---

### III.5 Eventos institucionais excepcionais

```yaml
regra: eventos_excepcionais
exemplos:
  - recompra_anunciada_pelo_tesouro
  - troca_compulsoria_de_papel
  - mudanca_de_indexador_emergencial
tratamento: "Trata como E2 com data e valor do evento institucional. App deve registrar o evento como 'forçado' para auditoria."
```

---

### III.6 Aresta sobre prazo de cupons (NTN-F, NTN-B, debêntures com pagamento periódico)

**Regra crucial e errada na intuição da maioria:** o prazo regressivo do IR no cupom é contado **desde a data de compra do título**, não desde o cupom anterior. Isso significa que se o cliente compra um NTN-F longo logo antes de um cupom, esse primeiro cupom paga 22,5% mesmo que o título seja de 10 anos. Os cupons subsequentes vão caindo na tabela conforme o prazo passa.

E quando há múltiplos lotes (cliente comprou em datas diferentes), **cada lote tem sua própria alíquota para o mesmo cupom**. O app precisa rastrear cupons por lote, não por título consolidado.

---

## IV. LACUNAS CONHECIDAS / A PREENCHER ANTES DE PRODUÇÃO

1. **Tabela completa de IOF dos 30 dias** — tenho percentuais aproximados; antes de produção, importar tabela exata do Anexo do Decreto 6.306/2007.
2. **Prazo mínimo LCI/LCA pós-CMN 5.118/2024** — verificar se houve novas resoluções em 2025 alterando os 9 meses padrão para alguns lastros específicos.
3. **Tributação exata das parcelas do Renda+/Educa+** — interpretação ainda não consolidada; aguardar Solução de Consulta da RFB.
4. **Tratamento de debêntures incentivadas em PJ holding** — alíquota reduzida (15%) tem regras específicas que afetam decisão de alocação holding vs PF.
5. **COE com pagamento condicional em ativos** — o estado da arte de tributação quando o pagamento é em quantidade variável de outro ativo (em vez de dinheiro) merece validação.
6. **Tributação de operações compromissadas (Repo) lastreadas em RF** — não cobertas aqui; merecem capítulo próprio se cliente tiver.
7. **Tratamento na holding de debêntures com vencimento longo** — interação com Lucro Presumido/Real merece detalhamento na MGT de veículos.

---

## V. CHECKLIST DE COBERTURA PARA REVISÃO DO TRIBUTARISTA

Para cada título acima:
- [ ] Eventos E1, E2, E3, E4, E5 contemplados conforme aplicabilidade
- [ ] Tabela regressiva de IR aplicada corretamente
- [ ] IOF dos 30 dias considerado
- [ ] Tratamento de prejuízo (não-compensação) explicitado
- [ ] Eventos automáticos (vencimento, cupom) marcados como tal
- [ ] Particularidades do título destacadas em "notas"
- [ ] Referência legal citada
- [ ] Lacunas conhecidas registradas no item IV

---

*Próximas MGTs a montar: Renda Variável BR, FII/Fiagro, ETFs (BR e exterior), Fundos abertos, Fundos fechados, Internacional Lei 14.754, Fluxos de pessoa.*
