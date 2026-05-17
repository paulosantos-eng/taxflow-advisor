# MGT — Matriz de Granularidade Tributária | Fluxos de Pessoa + Lei 15.270

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência:** 01/01/2026 (com Lei 14.754/2023 e Lei 15.270/2025 em vigor)
**Escopo:** rendimentos recebidos por pessoa física residente no Brasil (trabalho, capital, transferências), com foco especial na Lei 15.270/2025 (IRRF dividendos, IRPFM, redutor anti-bitributação)
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine

---

## 0. Glossário

| Variável | Significado |
|----------|-------------|
| `tipo_rendimento` | trabalho / capital / aluguel / transferencia / esporádico / exterior |
| `fonte_pagadora` | pj_terceira / pj_propria / pf / governo / exterior |
| `mes_competencia` | mês a que o rendimento se refere |
| `mes_caixa` | mês em que foi efetivamente recebido |
| `tabela_progressiva_aplicavel` | tabela 2026 (com nova faixa de R$ 5k) |
| `irrf_retido` | IR retido na fonte pela fonte pagadora |
| `carne_leao_devido` | quando rendimento vem de PF ou exterior |
| `total_dividendos_mesma_fonte_mes` | acumulado de dividendos da MESMA PJ no MÊS (para gatilho R$ 50k) |
| `renda_anual_total_para_irpfm` | base ampla do IRPFM (inclui isentos e tributados na fonte) |
| `aliquota_irpfm_aplicavel` | resultado da `tabela_irpfm_lei_15270` |
| `redutor_anti_bitributacao` | desconto do IRPFM quando carga PJ+PF ultrapassa nominal |

---

## 0.1 Tabela progressiva IRPF — 2026 (pós-Lei 15.270)

```yaml
tabela: tabela_progressiva_irpf_2026
referencia_legal: [lei_15270_2025, lei_9250_1995_alterada]
vigencia_inicio: 2026-01-01
valores_mensais:
  - faixa_1:
      condicao: "renda_mensal <= 5000.00"
      aliquota: 0.00
      deducao: 0.00
      nota: "Nova faixa de isenção Lei 15.270/2025 — substitui antiga isenção de R$ 2.259,20"
  - faixa_2_transitoria:
      condicao: "5000.00 < renda_mensal <= 7530.00"
      regra: "redutor regressivo aplicado sobre alíquota da faixa subsequente"
      nota: "Detalhamento exato a ser definido em IN da RFB; tipicamente cria 'desconto progressivo'"
  - faixa_3:
      condicao: "7530.00 < renda_mensal <= 9282.00"
      aliquota: 0.075
      deducao_legal: a_calcular
  - faixa_4:
      condicao: "9282.00 < renda_mensal <= 12257.00"
      aliquota: 0.15
      deducao_legal: a_calcular
  - faixa_5:
      condicao: "12257.00 < renda_mensal <= 15187.00"
      aliquota: 0.225
      deducao_legal: a_calcular
  - faixa_6:
      condicao: "renda_mensal > 15187.00"
      aliquota: 0.275
      deducao_legal: a_calcular

notas:
  - "VALORES DAS FAIXAS 3-6 PRECISAM SER VALIDADOS contra IN da RFB de 2026; estão em consolidação"
  - "Lei 15.270 estabelece a nova isenção e a regra de transição; valores precisos das faixas intermediárias vêm de IN"
  - "Aresta: a tabela é por COMPETÊNCIA mensal, não por caixa. Pró-labore de janeiro pago em fevereiro usa tabela do mês de competência"
```

---

## 0.2 Tabela IRPFM — tributação mínima anual (Lei 15.270/2025)

```yaml
tabela: tabela_irpfm_lei_15270
referencia_legal: [lei_15270_2025]
vigencia_inicio: 2026-01-01
descricao: |
  Garante que pessoas físicas com altas rendas paguem pelo menos uma alíquota mínima total,
  independente da composição (salário, dividendo isento, JCP, etc.).
base_de_calculo: renda_anual_total_para_irpfm  # ampla (ver 0.3)

faixas:
  - condicao: "renda_anual <= 600000.00"
    aliquota: 0.00
    descricao: "Sem IRPFM aplicável"
  - condicao: "600000.00 < renda_anual < 1200000.00"
    aliquota: "progressiva linear de 0% a 10%"
    formula: "aliquota = 0.10 * (renda_anual - 600000) / 600000"
    nota: "Cresce linearmente de 0 a 10% ao longo da faixa de R$ 600k até R$ 1,2M"
  - condicao: "renda_anual >= 1200000.00"
    aliquota: 0.10
    descricao: "Alíquota mínima fixa de 10% sobre a renda total"

deducoes_do_irpfm:
  - ir_efetivamente_pago_no_ano: TODO_o_IR_pago_no_ano  # IRPF retido + DARF + ganhos
  - irrf_dividendos_lei_15270: SIM  # o 10% retido pelas PJs já entra como crédito
  - irpj_csll_da_PJ_distribuidora: NAO_diretamente  # mas entra no redutor anti-bitributação
  - aplicacao_redutor_anti_bitributacao: SIM_apos_calculo_base

notas_arquitetura:
  - "IRPFM é apurado ANUAL em DAA — não retido na fonte"
  - "Crédito de IRRF dividendos (10% > R$ 50k/mês) é compensado contra IRPFM"
  - "Redutor anti-bitributação aplica DEPOIS de calcular IRPFM bruto"
```

---

## 0.3 Base ampla do IRPFM (rendimentos que entram)

```yaml
tabela: base_irpfm_inclui
referencia_legal: [lei_15270_2025_art_X]
descricao: "Quais rendimentos compõem a base anual do IRPFM"

incluidos:
  - rendimentos_tributaveis_pf:
      - salario, pro_labore, ferias, plr
      - aluguel_recebido
      - autonomos
      - aposentadoria_e_pensao_governo (acima de isenção idosos)
      - ganho_de_capital_imobiliario
      - ganho_capital_RV  # ações, ETFs (mesmo dentro de R$ 20k)
      - ganho_capital_FII
      - rendimentos_RF_tributada
  - rendimentos_tributados_exclusivamente_na_fonte:
      - JCP
      - rendimento_de_fundo_aberto (come-cotas + resgate)
  - rendimentos_isentos_HOJE_que_passam_a_ENTRAR_na_base_do_IRPFM:
      - dividendos_de_pj_brasileira  # mesmo que isentos individualmente até R$ 50k/mês
      - rendimentos_mensais_de_FII_e_Fiagro_isentos
      - rendimentos_de_LCI_LCA_CRI_CRA_debentures_incentivadas
      - rendimentos_da_poupanca
      - resgate_de_planos_de_aposentadoria_PGBL_VGBL
      - lucros_distribuidos_apurados_ate_2025_se_pagos_apos_2026  # interpretação consolidada — VERIFICAR
  - rendimentos_do_exterior_lei_14754:
      - ganhos_e_rendimentos_apurados_anualmente
  - heranca_e_doacoes:
      - geralmente_FORA_do_IRPFM
      - ressalva: "Verificar se há regra específica"

excluidos:
  - indenizacoes_dano_moral (consolidado)
  - fgts
  - seguro_de_vida_recebido_por_beneficiario
  - pensao_alimentar_recebida_pela_alimentada (pós-ADI 5422)
  - aposentadoria_isenta_idoso_acima_65_ate_limite

notas_criticas:
  - "ARESTA CENTRAL DA LEI 15.270: a base do IRPFM inclui rendimentos hoje isentos. Cliente que tem R$ 800k/ano só em dividendos (hoje 0% IR) passa a pagar IRPFM"
  - "App tem que MAPEAR cada rendimento como 'entra na base' ou 'fica fora' — esse é o cálculo mais importante do produto"
  - "Lacuna: alguns pontos de inclusão ainda têm interpretação pendente — flag para tributarista"
```

---

## I. RENDIMENTOS DO TRABALHO

---

### I.1 Salário CLT

```yaml
classe: salario_clt
fonte_pagadora: pj_terceira
periodicidade: mensal

eventos:
  - id: E5_recebimento_mensal
    tipo: realizacao_periodica
    tributacao:
      irrf: tabela_progressiva_irpf_2026
      retencao: na_fonte_pela_empresa
      base: salario_bruto - deducoes_legais (INSS, previdencia_privada_PGBL, dependentes, pensao_paga)
    output: [irrf_retido, salario_liquido]
    captura: [mes_competencia, mes_caixa, salario_bruto, inss_descontado, irrf_retido, deducoes_legais]
    notas:
      - "Deduções legais: INSS (até teto), PGBL (até 12% renda bruta), dependentes (R$ 189,59 cada), pensão paga"
      - "Ajuste anual na DAA do ano seguinte"

  - id: E5b_13_salario
    tipo: realizacao_anual
    descricao: "13º salário pago em duas parcelas (novembro e dezembro)"
    tributacao:
      irrf: tabela_progressiva_aplicada_isoladamente
      retencao: na_fonte_em_dezembro_pela_diferenca
      base: 13_bruto - inss_13 - pensao_13
    notas:
      - "ARESTA: 13º tem TRIBUTAÇÃO EXCLUSIVA na fonte — NÃO compõe a base anual da DAA"
      - "Mas ENTRA na base do IRPFM (Lei 15.270) — ARESTA NOVA importante"

  - id: E5c_ferias_e_adicionais
    tipo: realizacao_eventual
    descricao: "Férias + 1/3 constitucional"
    tributacao: idem_salario_progressivo
    notas:
      - "Adicional de férias 1/3: tributado normalmente (jurisprudência STF 2022)"
      - "Abono pecuniário de férias (conversão de 10 dias): tributável"

  - id: E5d_plr
    tipo: realizacao_eventual
    descricao: "Participação nos Lucros e Resultados"
    tributacao:
      regime: tabela_progressiva_anual_isolada  # PLR tem tabela própria
      faixa_isencao: 7407.11  # valor para 2025; ajuste 2026 a definir
      retencao: na_fonte_pela_empresa
    notas:
      - "PLR tem tabela ESPECÍFICA, separada da progressiva mensal"
      - "ARESTA: PLR entra na base do IRPFM mesmo quando isenta na regra geral"
```

---

### I.2 Pró-labore

```yaml
classe: pro_labore
fonte_pagadora: pj_propria_OR_terceira
periodicidade: mensal_OR_variavel

eventos:
  - id: E5_recebimento_pro_labore
    tipo: realizacao_periodica
    tributacao:
      irrf: tabela_progressiva_irpf_2026
      retencao: na_fonte_pela_PJ_pagadora
      inss_descontado: SIM  # 11% até teto
      base: pro_labore_bruto - inss
    output: [irrf_retido, inss_descontado, pro_labore_liquido]
    captura: [mes_competencia, mes_caixa, pro_labore_bruto, inss, irrf]
    notas:
      - "Pró-labore é remuneração do sócio-administrador pela função"
      - "Pode ser variável mês a mês (não há piso legal exceto o mínimo legal ~R$ 1.412)"
      - "ARESTA-CRÍTICA: pró-labore variável afeta tabela progressiva mensalmente. App tem que rastrear competência por competência"
      - "Ajuste anual na DAA, igual salário"
      - "Entra na base do IRPFM"
```

---

### I.3 Honorários autônomos

```yaml
classe: honorario_autonomo
fonte_pagadora: pj_OR_pf
caracteristicas: medico, advogado, consultor, freelancer

eventos:
  - id: E5_honorario_de_PJ
    tributacao:
      irrf: tabela_progressiva_aplicada_pela_PJ_pagadora
      retencao: na_fonte_pela_PJ
    notas: ["Inclui contribuição previdenciária 11% até teto se profissional liberal"]

  - id: E5b_honorario_de_PF
    tributacao:
      regime: carne_leao
      irrf: ZERO_na_fonte
      apuracao: mensal_pelo_proprio_contribuinte_via_DARF_0190
      base: honorario_recebido - deducoes (PGBL, dependentes, pensão paga, livro_caixa_se_autonomo)
    notas:
      - "Carnê-leão: DARF código 0190 até o último dia útil do mês seguinte"
      - "Livro-caixa: dedução de despesas necessárias à atividade profissional"
      - "Entra na base anual da DAA + IRPFM"
```

---

## II. RENDIMENTOS DE CAPITAL (FOCO DA LEI 15.270)

---

### II.1 Dividendos pagos por PJ brasileira

```yaml
classe: dividendos_pj_brasileira
fonte_pagadora: pj_brasileira
referencia_legal: [lei_9249_1995, lei_15270_2025]

eventos:
  - id: E5_recebimento_dividendos
    tipo: realizacao_eventual
    pre_condicoes: [lucro_disponivel_para_distribuicao, deliberacao_de_distribuicao]
    sub_cenarios:
      - id: regime_antigo_pre_2026
        condicao: "data_pagamento <= 2025-12-31"
        tributacao: isento_pf_completo
        nota: "Regime histórico: dividendos completamente isentos PF"

      - id: regime_transicao_lei_15270
        condicao: |
          lucros_apurados_ate: 2025
          AND distribuicao_aprovada_em_ata: ate_2025-12-31
          AND pagamento_efetivado_conforme: ato_de_aprovacao_original
        tributacao: isento_pf
        nota: "ARESTA-CRÍTICA: somente vale para lucros até 2025 aprovados em ata até 31/12/2025 e exigíveis conforme legislação civil"

      - id: regime_novo_lei_15270_abaixo_50k
        condicao: |
          ano_calendario >= 2026
          AND total_dividendos_mesma_fonte_mes <= 50000.00
        tributacao: isento_pf_no_recebimento  # mas ENTRA na base do IRPFM
        irrf: 0
        nota: "Isento na fonte mas integra base anual do IRPFM"

      - id: regime_novo_lei_15270_acima_50k
        condicao: |
          ano_calendario >= 2026
          AND total_dividendos_mesma_fonte_mes > 50000.00
        irrf: 0.10  # sobre TODO o valor distribuído no mês pela mesma fonte
        retencao: na_fonte_pela_PJ_pagadora
        nota: "ARESTA-CRÍTICA: incide sobre TOTAL do mês, não só excedente"
        compensacao_com_irpfm: SIM  # IRRF retido é creditável contra o IRPFM anual

    captura: [data_pagamento, valor_bruto, fonte_pagadora_cnpj, lucro_de_que_exercicio, lucro_apurado_ate_2025_sn, distribuicao_aprovada_ate_2025_sn, irrf_retido]

    notas_criticas:
      - "ARESTA-OPERACIONAL: 'mesma fonte' é o mesmo CNPJ. Cliente sócio de 3 PJs pode receber R$ 49k de cada (R$ 147k total) sem disparar o IRRF de 10% por fonte"
      - "Mas TODO o valor compõe a base do IRPFM no fim do ano"
      - "Múltiplos pagamentos da mesma PJ no mesmo mês: o app deve agregar e recalcular o IRRF quando ultrapassa R$ 50k"
      - "Aresta-estratégia: 'janela de aprovação' fechada em 31/12/2025 — cliente que aprovou ata até essa data pode distribuir nos anos seguintes sob regime antigo"
```

---

### II.2 JCP — Juros sobre Capital Próprio

```yaml
classe: jcp
fonte_pagadora: pj_brasileira
referencia_legal: [lei_9249_1995_art_9]

eventos:
  - id: E5_recebimento_jcp
    tipo: realizacao_eventual
    pre_condicoes: [lucro_disponivel, deliberacao_de_jcp]
    tributacao:
      irrf: 0.15  # alíquota fixa
      retencao: na_fonte_pela_PJ_pagadora
      caracter: definitivo  # NÃO entra na progressiva
    output: [jcp_liquido, irrf_retido]
    captura: [data_pagamento, valor_bruto, irrf_retido]
    notas:
      - "JCP IRRF 15% é DEFINITIVO na PF — não vai pra base progressiva da DAA"
      - "MAS ENTRA na base do IRPFM (rendimento tributado exclusivamente na fonte)"
      - "Vantagem da PJ: JCP é DEDUTÍVEL na apuração de IRPJ/CSLL — reduz carga total PJ→PF"
      - "Aresta: limite TJLP/limite legal para a PJ — verifica no veículo PJ"
      - "Aresta: holding patrimonial pode usar JCP como alavanca de eficiência"
```

---

### II.3 Aluguéis recebidos

```yaml
classe: aluguel_recebido
fonte_pagadora: pj_terceira_OR_pf
periodicidade: mensal

eventos:
  - id: E5_aluguel_de_pj
    descricao: "Locatário é pessoa jurídica"
    tributacao:
      irrf: tabela_progressiva_irpf
      retencao: na_fonte_pela_PJ_locataria
    notas: ["Tributação no mês de competência; ajuste DAA"]

  - id: E5b_aluguel_de_pf
    descricao: "Locatário é pessoa física"
    tributacao:
      regime: carne_leao
      irrf: ZERO_na_fonte
      apuracao: mensal_pelo_proprio_contribuinte_via_DARF_0190
      tabela: progressiva_irpf
    notas:
      - "Cliente que aluga para PF é responsável por apurar e pagar carnê-leão"
      - "DARF 0190 até o último dia útil do mês seguinte"

  - id: deducoes_permitidas
    descricao: "Reduzem a base tributável do aluguel"
    items:
      - iptu_pago_pelo_locador  # SE não repassado
      - condominio_pago_pelo_locador  # SE não repassado
      - taxas_de_administracao_imobiliaria  # sem repasse
      - despesas_de_aluguel_para_subloc  # se sublocação
    notas:
      - "ARESTA: IPTU pago pelo LOCATÁRIO é parte do aluguel para fins fiscais (compõe a receita)"
      - "Despesas SÓ deduzem se efetivamente pagas pelo locador"

  notas:
    - "Aluguel entra na base anual da DAA"
    - "Entra na base do IRPFM"
    - "Aresta crítica: holding patrimonial muda completamente o tratamento — ver MGT_veiculos"
```

---

### II.4 Royalties

```yaml
classe: royalties
fonte_pagadora: pj_OR_exterior
caracteristica: "Direitos autorais, patentes, propriedade industrial, marca"

eventos:
  - id: E5_royalties_de_pj_br
    tributacao:
      irrf: tabela_progressiva
      retencao: na_fonte
  - id: E5b_royalties_do_exterior
    tributacao:
      regime: carne_leao_OU_lei_14754  # depende
      retencao_pais_origem: varia_por_tratado
    notas: ["Royalty literário tem tratamento específico em alguns países"]

  notas:
    - "Entram na base anual e na base do IRPFM"
```

---

### II.5 Pensão alimentícia recebida

```yaml
classe: pensao_alimenticia
fonte_pagadora: pf_alimentante
referencia_legal: [adi_5422_stf_2022, in_rfb_atualizadas]

eventos:
  - id: E5_recebimento_de_pensao
    tipo: realizacao_periodica
    tributacao: ISENTA  # pós-ADI 5422 (2022)
    sub_cenarios:
      - alimentado_principal:
          condicao: "filho menor / cônjuge"
          tributacao: isenta
      - alimentado_atraves_de_responsavel:
          condicao: "pai/mãe recebe em nome do filho menor"
          tributacao: isenta_para_o_titular_do_credito  # filho menor
    notas:
      - "ARESTA-JURISPRUDENCIAL: STF declarou inconstitucional tributação de pensão recebida (ADI 5422, julho/2022)"
      - "Receita Federal acolheu via IN — pensão é ISENTA para o alimentado"
      - "Mas para o ALIMENTANTE: continua DEDUTÍVEL na base da progressiva (sem cap por filho, dentro de decisão judicial/escritura)"
      - "Aresta: pensão alimentícia entra na base do IRPFM como rendimento isento?"
      - "Lacuna: interpretação consolidada precisa ser validada — verificar IN 2024-2026"
```

---

### II.6 Aposentadoria / pensão previdência social

```yaml
classe: aposentadoria_inss
fonte_pagadora: governo_inss

eventos:
  - id: E5_recebimento_aposentadoria
    tributacao:
      irrf: tabela_progressiva
      retencao: na_fonte_pelo_inss

  - id: deducao_especial_65_anos
    descricao: "Aposentado com 65+ tem isenção adicional"
    valor_isencao_2025: 1903.98  # mensal, em adição à isenção geral
    notas:
      - "Soma à isenção geral da tabela progressiva"
      - "Ajuste anual na DAA"
      - "VALIDAR valor 2026"

  notas:
    - "Entra na base do IRPFM"
    - "Cliente aposentado de alta renda (ex.: complementar de previdência privada PGBL alta) pode entrar no IRPFM"
```

---

## III. LEI 15.270/2025 — IRRF SOBRE DIVIDENDOS

---

### III.1 Gatilho R$ 50.000/mês mesma fonte

```yaml
processo: gatilho_irrf_dividendos_lei_15270
vigencia_inicio: 2026-01-01

definicoes:
  fonte_pagadora: "mesma_PJ (mesmo_CNPJ)"
  mesmo_beneficiario: "mesma_PF_residente_brasil"
  janela: "mes_calendario"
  base: "total_dividendos_pagos_creditados_empregados_entregues_no_mes"

regra_de_aplicacao:
  - id: pagamento_unico_mes
    condicao: "primeiro_e_unico_pagamento_do_mes > 50000"
    aliquota: 0.10
    base_calculo: pagamento_inteiro  # não só excedente
    retencao: momento_do_pagamento

  - id: multiplos_pagamentos_mes
    descricao: "Vários pagamentos da mesma fonte no mesmo mês"
    fluxo:
      1: "Primeiro pagamento: se sozinho > R$ 50k, retém 10% no ato"
      2: "Primeiro pagamento <= R$ 50k: não retém"
      3: "Segundo pagamento: agrega; se acumulado_mes > R$ 50k, recalcula retenção"
      4: "Retenção residual = 10% * acumulado_total - irrf_ja_retido_no_mes"
    nota: "PJ pagadora é responsável pelo recálculo"

  - id: pagamento_fracionado_para_evitar_50k
    descricao: "Pagamentos de R$ 30k + R$ 30k da mesma PJ no mesmo mês"
    tratamento: "acumulado R$ 60k > R$ 50k → retém 10% sobre R$ 60k = R$ 6.000"
    nota: "Tentativa de driblar o gatilho via fracionamento não funciona dentro do mesmo mês"

  - id: distribuicao_via_holding_intermediaria
    descricao: "Operacional → Holding → PF"
    fluxo:
      operacional_para_holding: "dividendo isento entre PJs (subsidiária integral) — em geral"
      holding_para_pf: "aplica regra Lei 15.270 sobre o pagamento Holding→PF"
    notas:
      - "Estratégia via holding NÃO evita o gatilho — a PF é beneficiária final"
      - "Holding pode escalonar pagamento ao longo do tempo, mas o IRRF segue PF→PF"

captura_app:
  - cumulative_dividendos_mes_por_fonte: dicionario_cnpj_para_valor
  - alerta_quando_acumulado_proximo_50k: SIM
  - calculo_automatico_da_retencao_marginal: SIM
```

---

### III.2 Regra de transição

```yaml
regra: transicao_lei_15270
referencia_legal: [lei_15270_2025_disposicoes_transitorias]

condicoes_cumulativas_para_manter_regime_antigo:
  - lucros_apurados_ate: 2025-12-31
  - distribuicao_aprovada_em_ata: ate_2025-12-31
  - exigibilidade: nos_termos_da_legislacao_civil_e_empresarial
  - pagamento_conforme: ato_de_aprovacao_original

implicacao:
  - "Cliente que aprovou ata em dezembro/2025 para pagar dividendos ao longo de 2026-2028 pode manter isenção total"
  - "Cliente que aprovou em janeiro/2026 ou depois: novo regime"
  - "Cliente com lucros apurados em 2025 mas SEM ata aprovada em 2025: novo regime"

alerta_para_app:
  - "Para janeiro a dezembro de 2025 (passado), o app deve auditar atas de aprovação e flagar ouvidores que perderam a janela"
  - "Para clientes que SEGUEM TENDO lucros sob regime antigo (ata 2025), o app deve rastrear esses 'estoques' separadamente da nova receita"

aresta_judicializacao:
  - "Há risco de questionamento judicial da regra de transição"
  - "App deve permitir consultor anotar 'cenário conservador' (assume novo regime) e 'cenário otimista' (assume antigo)"
```

---

## IV. LEI 15.270/2025 — IRPFM (TRIBUTAÇÃO MÍNIMA)

---

### IV.1 Fluxo de cálculo do IRPFM

```yaml
processo: calculo_irpfm_anual
vigencia_inicio: 2026-01-01
referencia_legal: [lei_15270_2025]

passos:
  1_consolidar_base_ampla:
    - somar todos rendimentos: tabela base_irpfm_inclui
    - incluir isentos, exclusivos na fonte, dividendos
    - excluir: dano moral, FGTS, herança/doação, pensão pós-ADI

  2_calcular_aliquota_aplicavel:
    - usa: tabela_irpfm_lei_15270
    - se renda <= 600k: aliquota = 0; STOP
    - se renda >= 1.2M: aliquota = 0.10
    - entre: progressiva linear

  3_calcular_irpfm_bruto:
    formula: "irpfm_bruto = aliquota_irpfm * renda_anual"

  4_subtrair_ir_ja_pago_no_ano:
    items:
      - irrf_retido_em_salarios_e_pro_labore  # progressivo já recolhido
      - irrf_jcp_15  # já recolhido
      - irrf_dividendos_lei_15270_10  # IRRF de dividendos > 50k/mês
      - ir_pago_em_DARF_6015  # RV mensal
      - ir_pago_em_DAA  # ganhos do exterior, carnê-leão
      - ir_retido_em_aplicacoes_financeiras  # CDB, fundos
    formula: "irpfm_devido = max(0, irpfm_bruto - soma_ir_pago)"

  5_aplicar_redutor_anti_bitributacao:
    condicao: "aliquota_efetiva_total > limite_nominal_pj"
    desconto: "diferença até o limite"
    detalhes: ver IV.2

  6_resultado:
    output: irpfm_a_pagar
    captura: DAA_anual

notas:
  - "IRPFM é PURAMENTE ANUAL — calculado em maio do ano seguinte"
  - "App deve PROJETAR o IRPFM ao longo do ano (passo 3) para o consultor planejar"
  - "Otimizações: redirecionar JCP, escalonar dividendos, antecipar distribuição de lucros 2025 (regra de transição)"
```

---

### IV.2 Redutor anti-bitributação

```yaml
regra: redutor_anti_bitributacao
referencia_legal: [lei_15270_2025_art_de_redutor]

descricao: |
  Garante que a soma da carga efetiva PJ + IRPFM da PF não ultrapasse o LIMITE NOMINAL
  da combinação IRPJ + adicional + CSLL.

parametros_de_carga_nominal:
  pj_nao_financeira:
    aliquota_nominal_total: 0.34  # 15% IRPJ + 10% adicional + 9% CSLL
  pj_seguradora_e_certas_financeiras:
    aliquota_nominal_total: 0.40
  banco_lei_complementar_105:
    aliquota_nominal_total: 0.45

calculo_do_redutor:
  passos:
    1: "aliquota_efetiva_pj = ir_e_csll_pago_pela_pj_no_ano / lucro_distribuido_no_ano"
    2: "aliquota_efetiva_pf_irpfm = irpfm_calculado / dividendos_recebidos"
    3: "carga_total = aliquota_efetiva_pj + aliquota_efetiva_pf_irpfm"
    4: "se carga_total > aliquota_nominal_total: redutor = (carga_total - aliquota_nominal_total) * dividendos_recebidos"
    5: "se carga_total <= aliquota_nominal_total: sem redutor"
  formula_final:
    irpfm_apos_redutor: "irpfm_bruto - redutor (com mínimo zero)"

implicacao_estrategica:
  - "PJ que paga muito IRPJ+CSLL (próximo do nominal) tem efeito do IRPFM REDUZIDO pelo redutor"
  - "PJ no Simples ou Presumido com baixa carga efetiva → IRPFM aplica mais forte"
  - "Holding patrimonial em Lucro Presumido com 32% presunção sobre aluguel pode ter carga efetiva baixa → IRPFM completo"

notas:
  - "Cálculo do redutor depende de DADOS DA PJ (carga efetiva real) — app precisa importar essas info"
  - "Para PJ no Lucro Real com 34% pleno: redutor cobre quase todo o IRPFM"
  - "Para PJ no Presumido com aluguel: aliquota_efetiva ~ 14% → redutor pequeno"
```

---

## V. OUTROS RENDIMENTOS

---

### V.1 Indenizações

```yaml
classe: indenizacoes
sub_tipos:
  dano_moral: { tributacao: ISENTA, base_irpfm: NAO }
  lucros_cessantes: { tributacao: TRIBUTAVEL_PROGRESSIVA, base_irpfm: SIM }
  aviso_previo: { tributacao: TRIBUTAVEL_COMO_SALARIO, base_irpfm: SIM }
  fgts: { tributacao: ISENTA, base_irpfm: NAO }
  seguro_de_vida_beneficiario: { tributacao: ISENTA, base_irpfm: NAO }
  indenizacao_trabalhista_geral: { tributacao: depende_natureza }
  desapropriacao: { tributacao: depende_se_lucro_imobiliario }
```

---

### V.2 Ganhos esporádicos

```yaml
classe: ganhos_esporadicos
sub_tipos:
  loteria_premio: { tributacao: 0.30_na_fonte_definitiva, base_irpfm: SIM }
  brindes_de_pj: { tributacao: depende, base_irpfm: depende }
  premios_de_concurso: { tributacao: 0.15_na_fonte_definitiva, base_irpfm: SIM }

notas:
  - "Loteria: 30% retido pela Caixa, definitivo, sem ajuste DAA"
  - "Mas entra na base do IRPFM como rendimento exclusivo na fonte"
```

---

### V.3 Herança e doações

```yaml
classe: heranca_doacao
tributacao_federal: ISENTA  # heranças e doações não pagam IR federal
tributacao_estadual_itcmd: SIM_varia_por_estado  # 4% a 8% conforme estado
sub_cenarios:
  - heranca_recebida: { ir_federal: 0, itcmd: estado_residencia_falecido }
  - doacao_recebida: { ir_federal: 0, itcmd: estado_residencia_donatario }
  - doacao_com_reserva_usufruto: { tratamento: tributacao_diferida }

notas:
  - "Para herdeiros: custo médio recebido é VALOR DA AVALIAÇÃO no inventário, NÃO custo histórico do falecido"
  - "Aresta: planejamento sucessório com doação em vida + reserva de usufruto reduz ITCMD em alguns estados"
  - "ITCMD progressivo em alguns estados (SP, RS) — entre 2% e 8%"
  - "Herança fora do IRPFM"
```

---

## VI. EVENTOS TRANSVERSAIS

---

### VI.1 Apuração mensal (carnê-leão)

```yaml
processo: carne_leao_mensal
codigo_darf: 0190
vencimento: ultimo_dia_util_do_mes_seguinte_ao_recebimento

quando_aplicar:
  - rendimentos_de_pf: aluguel, honorário, pensão (pré-2022), pró-labore de PJ que não retém
  - rendimentos_do_exterior: salário recebido do exterior, royalties, aluguel de imóvel no exterior

base_de_calculo:
  rendimento_bruto - deducoes:
    - inss_devido_se_aplicavel
    - pgbl_ate_12_renda_bruta
    - dependentes  # R$ 189,59 cada (validar 2026)
    - pensao_paga
    - livro_caixa  # se profissional autônomo

aliquota: tabela_progressiva_irpf_2026

notas:
  - "ARESTA: cliente que aluga 3 imóveis para 3 PFs tem carnê-leão consolidado mensal — não separado"
  - "Ajuste na DAA anual"
```

---

### VI.2 Apuração anual (DAA)

```yaml
processo: ajuste_anual_DAA
vencimento: 31_maio_do_ano_seguinte

componentes:
  - rendimentos_tributaveis_consolidados (progressiva)
  - irrf_retido_no_ano (já pago)
  - irpfm_calculado (Lei 15.270, novidade 2026)
  - ganhos_de_capital_imobiliarios_DAA  # separado
  - rendimentos_de_aplicacoes_no_exterior (Lei 14.754)
  - deducoes_legais (PGBL, dependentes, saúde, educação, pensão paga, doações)

output:
  - imposto_total_devido
  - imposto_a_pagar_ou_restituir

notas:
  - "ARESTA NOVA Lei 15.270: IRPFM entra como linha separada no Resumo da Declaração"
  - "App tem que projetar TODOS os campos para o consultor planejar"
```

---

### VI.3 Diferimento via PJ — vantagem estratégica

```yaml
estrategia: diferir_renda_via_PJ
contexto: "Profissional liberal (advogado, médico, consultor) pode atuar via PJ"

mecanica:
  pf_recebe: rendimento_progressivo_27.5_porcento_marginal
  pj_recebe: lucro_presumido_32_porcento_presuncao
  pj_paga_pf_via:
    - pro_labore: tabela progressiva, sujeito a INSS
    - dividendos: regime Lei 15.270

calculo_simplificado:
  pf_direto: "carga_efetiva ~ 27% + INSS (ate teto)"
  pj_presumido + dividendos: |
    pj: 32% * receita * (15% + 9%) ≈ 7,7% sobre receita bruta
    + pis/cofins: 3,65% sobre receita
    Total PJ: ~11-12%
    Distribuição PF: isenta até R$ 50k/mês (regime novo)
    Total combinado: ~12% efetivo

aresta_lei_15270:
  - "Com IRRF 10% sobre dividendos > R$ 50k/mês e IRPFM, a vantagem do PJ ESTREITA significativamente"
  - "Para renda anual > R$ 1.2M: IRPFM de 10% sobre TUDO. Carga total PJ+IRPFM pode chegar a 22-25%"
  - "Cliente alto-renda em PJ ainda paga MENOS que PF direto (27,5%) mas a economia caiu pela metade"
```

---

## VII. ARESTAS NÃO ÓBVIAS

---

### VII.1 Aresta da agregação por mês para o gatilho R$ 50k

PJ que paga dividendos no dia 15 e mais dividendos no dia 28: o app tem que rastrear acumulado por (CNPJ, CPF, mês_calendário). Se primeiro pagamento foi R$ 35k (sem retenção) e segundo é R$ 20k, no segundo pagamento dispara: total R$ 55k > R$ 50k → retém 10% sobre R$ 55k = R$ 5.500; já foi retido R$ 0 → retenção residual R$ 5.500.

---

### VII.2 Aresta da janela 2025 expirada

Cliente que NÃO aprovou ata de distribuição até 31/12/2025 perdeu a janela transição. Para auditoria 2026+: app deve marcar todos os clientes que tinham lucros 2025 não distribuídos antes do prazo — esses lucros agora caem no regime novo se distribuídos.

---

### VII.3 Aresta do IRPFM como cap

Cliente com R$ 800k/ano em renda mista (R$ 400k pró-labore + R$ 400k dividendos) tem IRPFM cresce linearmente: alíquota ~3,3% × R$ 800k = R$ 26.6k. Mas ele já paga IRRF progressivo sobre R$ 400k pró-labore (~R$ 80k retidos) — irpfm_devido = max(0, 26.6k - 80k) = 0. Não paga IRPFM. Aresta: app deve mostrar isso como "IRPFM zerado pelo IR já pago", evitando o cliente entrar em pânico.

---

### VII.4 Aresta do redutor para PJ Lucro Presumido

PJ Presumido com 32% presunção sobre aluguel: carga efetiva ~14%. Aliquota nominal de referência: 34%. Redutor anti-bitributação: 34% - 14% = 20% margem para o IRPFM operar antes de redutor. Se IRPFM efetivo sobre dividendos = 10% (dentro dos 20%), redutor é ZERO. Cliente paga IRPFM cheio.

---

### VII.5 Aresta da pensão pós-ADI 5422

Pensão alimentícia recebida não tributa IR. Mas entra na base do IRPFM? Interpretação prudente: SIM (lei 15.270 inclui rendimentos isentos na base ampla). Verificar IN específica.

---

### VII.6 Aresta do 13º como exclusivo na fonte

13º salário é tributado exclusivamente na fonte — não compõe a base progressiva da DAA. Mas COMPÕE a base do IRPFM. Cliente alto-salário (R$ 30k/mês) recebe R$ 30k de 13º com IRRF ~R$ 5,5k. Para IRPFM, esse R$ 30k entra na base anual.

---

### VII.7 Aresta da pessoa ligada na holding

Sócio recebe pró-labore da operacional (variável) + dividendo da operacional (regime 15.270) + dividendo de holding intermediária. Holding pode receber dividendo da operacional ISENTO (entre PJs com participação societária qualificada). Holding distribui ao sócio: aplica Lei 15.270 normalmente. Estratégia via holding NÃO evita Lei 15.270 — apenas permite ESCALONAR no tempo.

---

### VII.8 Aresta da imputação no JCP

JCP IRRF 15% é definitivo na PF — não vai pra base progressiva. Mas o app deve verificar se o cliente OPTOU por compensar IRRF de JCP no DAA (não-padrão; cliente pode contestar em alguns casos). Default: 15% definitivo, sem ajuste.

---

## VIII. LACUNAS CONHECIDAS

1. **Valores exatos das faixas progressivas 2026** — aguardar IN da RFB definitiva.
2. **Tratamento de pensão alimentícia na base do IRPFM** — interpretação pendente.
3. **Definição precisa de "mesma fonte" para o gatilho R$ 50k** — fundos pagadores, filiais de mesma PJ, partes ligadas. Aguardar IN.
4. **Aplicação do IRPFM em casamento conjunto vs separado** — pode haver economia significativa em uma das formas.
5. **Resgate de PGBL pós-2026** — interação com IRPFM ainda em consolidação.
6. **Tratamento de stock options** — recebimento + venda — regime depende de IN.
7. **Indenizações trabalhistas mistas** — composto por verbas com naturezas diferentes; classificação por verba.
8. **Renda recebida do exterior por PF** — interação Lei 14.754 com IRPFM ainda precisa de IN específica.

---

## IX. CHECKLIST PARA REVISÃO DO TRIBUTARISTA

- [ ] Tabela progressiva 2026 com nova faixa R$ 5k
- [ ] Tabela IRPFM com faixas progressivas 600k-1,2M e 10% acima
- [ ] Base ampla do IRPFM (rendimentos incluídos vs excluídos)
- [ ] IRRF 10% sobre dividendos: gatilho, recálculo, retroatividade no mês
- [ ] Regra de transição da Lei 15.270 (4 condições cumulativas)
- [ ] Redutor anti-bitributação com 3 limites nominais (34/40/45)
- [ ] Pró-labore variável afetando tabela mensal
- [ ] Aluguéis com carnê-leão / retenção PJ
- [ ] Pensão alimentícia isenta pós-ADI 5422
- [ ] JCP 15% definitivo PF
- [ ] Casos especiais: PGBL, PLR, 13º
- [ ] Arestas VII.1 a VII.8 documentadas

---

*Próximas MGTs a montar: Internacional Lei 14.754 (stocks/REITs/bonds/cripto/UCITS diretos, offshore PIC, trust), Fundos abertos com come-cotas, Fundos fechados pós-14.754 (FIDC, FIP, exclusivos), Veículos (PJ Lucro Presumido / Holding patrimonial / Offshore).*
