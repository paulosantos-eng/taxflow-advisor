# MGT — Camada de Consolidação Transversal

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência:** 01/01/2026
**Escopo:** documento mestre que unifica todas as MGTs por classe — taxonomia única de eventos, matriz cruzada de compensação, calendário fiscal unificado, hierarquia de cálculo e eixos transversais (tempo, estado, escopo).
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine. **Este é o arquivo que o engine carrega primeiro pra entender o "esqueleto" antes de processar cada classe.**

---

## 0. Documento de referência cruzada

| Capítulo | Cobre |
|----------|-------|
| MGT_renda_fixa.md | 19 instrumentos de RF (Tesouro, CDB, debêntures, LCI/LCA/LIG, CRI/CRA, deb. incentivada, COE, poupança) |
| MGT_renda_variavel_br.md | Ações à vista, BDR, opções, futuros, termo, aluguel BTC + 8 eventos corporativos |
| MGT_fii_fiagro.md | FII com 5 requisitos de isenção, Fiagro em 3 subtipos |
| MGT_etfs.md | ETF RV BR, ETF RF BR, ETF exterior (UCITS, acumulação, distribuição), REIT |
| MGT_fluxos_pessoa_lei_15270.md | Salário, pró-labore, dividendos, JCP, aluguel, royalties, pensão, IRRF Lei 15.270, IRPFM |
| MGT_internacional_lei_14754.md | Stocks/bonds diretos, cripto exterior, offshore PIC, trust, imóveis exterior |
| MGT_fundos_abertos.md | Multimercado, RF, FIA, cambial, FoF — todos com come-cotas |
| MGT_fundos_fechados.md | FIDC, FIP qualificado/não, exclusivos, FIA fechado, FII-IE |
| MGT_veiculos.md | PJ LR/LP/Simples, Holding, Offshore opaca/transparente, Trust, ITCMD |

---

## I. TAXONOMIA ÚNICA DE EVENTOS

Cada operação registrada no engine cai em um destes 18 tipos. O dispatcher do engine usa essa taxonomia para roteamento.

```yaml
taxonomia_eventos:

  # === AQUISIÇÃO ===
  - E1_compra:
      descricao: aquisicao_de_ativo
      gera_fato_gerador: NAO
      impacto: registrar_lote_no_custo_medio
      classes_aplicaveis: TODAS

  - E1b_subscricao_de_oferta:
      descricao: subscricao_em_oferta_primaria
      gera_fg: NAO
      impacto: registrar_lote
      classes: acao_br, fii, etf, debenture, fip

  - E1c_chamada_de_capital:
      descricao: aporte_em_fundo_fechado_via_chamada
      gera_fg: NAO
      impacto: aumenta_custo_lote
      classes: fip

  # === REALIZAÇÃO POR AÇÃO DO INVESTIDOR ===
  - E2_venda_swing:
      descricao: venda_voluntaria
      gera_fg: SIM
      classes: TODAS_com_mercado_secundario

  - E2b_venda_day:
      descricao: compra_e_venda_mesmo_dia_mesma_corretora
      gera_fg: SIM
      classes: acoes_br, etfs, fii, opcoes, futuros

  - E2c_venda_a_termo:
      descricao: operacao_a_termo
      classes: derivativos

  # === REALIZAÇÃO AUTOMÁTICA (sem ação) ===
  - E3_vencimento_rf:
      descricao: vencimento_de_titulo_de_renda_fixa
      gera_fg: SIM (automaticamente)
      classes: tesouro, cdb, debentures, lci_lca, fidc_com_prazo

  - E3b_vencimento_opcao:
      descricao: opcao_expira_ITM_OU_OTM
      gera_fg: SIM se ITM ou se prêmio investido
      classes: opcoes

  - E3c_call_redemption:
      descricao: emissor_resgata_antecipadamente
      gera_fg: SIM
      classes: cdb_com_call, debentures_com_call

  # === ESTADO ===
  - E4_marcacao_intra_periodo:
      descricao: snapshot_de_valor_de_mercado_sem_realizacao
      gera_fg: NAO
      output: passivo_latente
      classes: TODAS_com_mercado_ativo

  # === RECEBIMENTO PERIÓDICO ===
  - E5_dividendo:
      descricao: distribuicao_de_lucro_de_pj
      gera_fg: depende (Lei 15.270 a partir 2026)
      classes: acao_br, bdr (dividendo de stock exterior é E5_internacional)

  - E5b_jcp:
      descricao: juros_sobre_capital_proprio
      gera_fg: SIM (IRRF 15% definitivo)
      classes: acao_br

  - E5c_rendimento_fii:
      descricao: distribuicao_mensal_de_fii
      gera_fg: depende_dos_5_requisitos
      classes: fii, fiagro_fii

  - E5d_cupom_rf:
      descricao: pagamento_periodico_de_juros
      gera_fg: SIM (regressiva)
      classes: ntn_f, ntn_b_com_cupom, debenture_periodica, cri, cra

  - E5e_come_cotas:
      descricao: tributacao_semestral_automatica
      gera_fg: SIM (mai/nov)
      classes: fundos_abertos_lp_cp, fundos_fechados_pos_14754, fundos_exclusivos

  - E5f_dividendo_internacional:
      descricao: dividendo_de_ativo_no_exterior
      gera_fg: SIM (Lei 14.754, 15% anual)
      classes: stock_exterior, etf_exterior_distribuicao, reit_exterior

  # === DEVOLUÇÃO DE CAPITAL ===
  - E6_amortizacao:
      descricao: devolucao_parcial_de_capital
      gera_fg: NAO
      impacto: reduz_custo_lote
      classes: fii, fundos_fechados, fip, debentures_amortizadas

  - E6b_roc_return_of_capital:
      descricao: return_of_capital (americano, em REIT)
      gera_fg: NAO
      impacto: reduz_custo_em_brl
      classes: reit_exterior, alguns_etfs_exterior

  # === EVENTOS CORPORATIVOS ===
  - EC1_split_grupamento:
      gera_fg: NAO (exceto fração paga em $)
      impacto: ajusta_qtde_e_custo_medio
      classes: acoes_br, bdr, etfs, stocks_exterior

  - EC2_bonificacao_stock_dividend:
      gera_fg: NAO
      impacto: adiciona_qtde_e_custo_proporcional_atribuido_pela_empresa
      classes: acoes_br, stocks_exterior

  - EC3_subscricao:
      direito_de_acionista_comprar_novas_acoes
      sub_opcoes: [exerce, vende_direito_E2, expira_sem_acao]
      classes: acoes_br

  - EC4_opa:
      oferta_publica_de_aquisicao
      tratamento: trata_como_E2_se_adere
      classes: acoes_br, fii

  - EC5_fusao_incorporacao:
      gera_fg: NAO (continuidade fiscal)
      impacto: substitui_lote_por_proporcao_de_troca
      classes: acoes_br, fii, etfs

  - EC6_cisao:
      gera_fg: NAO
      impacto: divide_custo_proporcionalmente
      classes: acoes_br

  - EC7_spin_off:
      ambiguidade: bonificacao_OU_cisao (depende do fato relevante)
      classes: acoes_br, stocks_exterior

  - EC8_conversao_classe_acao:
      gera_fg: nenhuma_em_geral
      impacto: substitui_classe
      classes: acoes_br

  - EC9_class_action_settlement:
      gera_fg: SIM (rendimento)
      classes: stocks_exterior

  # === EVENTOS DE FLUXO DE PESSOA ===
  - EF1_pro_labore:
      gera_fg: SIM (tabela progressiva mensal)
      classes: rendimento_pessoa

  - EF2_salario_clt:
      gera_fg: SIM (tabela progressiva mensal)
      classes: rendimento_pessoa

  - EF3_13_salario:
      gera_fg: SIM (tributacao_exclusiva_na_fonte mas entra na base IRPFM)
      classes: rendimento_pessoa

  - EF4_plr:
      gera_fg: SIM (tabela própria PLR)
      classes: rendimento_pessoa

  - EF5_aluguel_recebido:
      gera_fg: SIM (carne_leao OU IRRF se locatário PJ)
      classes: rendimento_pessoa

  - EF6_distribuicao_pj_propria:
      gera_fg: depende (Lei 15.270 + gatilho R$ 50k)
      classes: rendimento_pessoa

  - EF7_pensao_recebida:
      gera_fg: NAO (pós-ADI 5422 STF 2022)
      classes: rendimento_pessoa

  - EF8_aposentadoria_inss:
      gera_fg: SIM (tabela progressiva, com isenção idoso 65+)
      classes: rendimento_pessoa

  # === EVENTOS DE VEÍCULO ===
  - EV1_apuracao_anual_pj:
      gera_fg: SIM (lucro tributável da PJ)
      classes: pj_lr, pj_lp

  - EV2_apuracao_anual_pic_opaca:
      gera_fg: SIM (15% sobre lucro anual da PIC)
      classes: offshore_opaca

  - EV3_distribuicao_pj_para_pf:
      gera_fg: depende (Lei 15.270)
      classes: pj_lr, pj_lp, holding

  # === EVENTOS EXCEPCIONAIS ===
  - EX1_default_emissor:
      gera_fg: prejuizo (em geral NÃO compensa)
      classes: cdb, debentures, fidc

  - EX2_evento_institucional:
      descricao: recompra_pelo_tesouro_ou_evento_extraordinario_de_emissor
      tratamento: trata_como_E2_pelo_valor_anunciado
      classes: tesouro, debentures

  - EX3_heranca_recebida:
      gera_fg: ISENTA_IR_FEDERAL
      itcmd: aplica_pelo_estado
      impacto: novos_lotes_com_custo_avaliacao_inventario
      classes: TODAS

  - EX4_doacao_recebida:
      tratamento: como_heranca
      classes: TODAS

  - EX5_perda_qualificacao_lei_12431:
      descricao: debenture_incentivada_perde_qualificacao_retroativamente
      gera_fg: tributacao_retroativa
      classes: debenture_incentivada
```

---

## II. MATRIZ CRUZADA COMPLETA DE COMPENSAÇÃO DE PREJUÍZOS

Tabela mestre. Cada célula responde: "ganho da categoria X pode ser compensado com prejuízo da categoria Y?"

```yaml
matriz_compensacao_completa:

  # === RENDA VARIÁVEL BR ===
  swing_acao_br:
    com_swing_acao_br: SIM
    com_swing_etf_rv_br: SIM
    com_swing_bdr: SIM  # interpretacao consolidada — todos a vista RV
    com_day_acao_br: NAO
    com_swing_fii: NAO
    com_swing_fiagro: NAO
    com_opcoes: NAO  # mercados separados
    com_termo: NAO
    com_futuros: NAO
    com_exterior: NAO
    com_rf_tributada: NAO
    com_fundos_abertos: NAO

  day_acao_br:
    com_day_acao_br: SIM
    com_day_etf: SIM
    com_swing: NAO
    com_outros: NAO

  swing_etf_rv_br: # mesmas regras que swing_acao_br

  # === FII / FIAGRO ===
  fii_swing:
    com_fii_swing: SIM
    com_fiagro_fii: NAO
    com_fiagro_fidc: NAO
    com_fiagro_fip: NAO
    com_acao: NAO
    com_etf: NAO
    com_rf: NAO

  fiagro_fii: com_apenas_fiagro_fii
  fiagro_fidc: com_apenas_fiagro_fidc
  fiagro_fip: com_apenas_fiagro_fip

  # === RF TRIBUTADA ===
  rf_tributada:
    com_rf_tributada: NAO  # prejuízo em RF NÃO compensa nada
    com_outros: NAO
    nota: "Prejuízo em RF tributada é capital perdido fiscalmente"

  rf_isenta:
    "prejuízo em RF isenta também é capital perdido (sem benefício fiscal residual)"

  # === ETF RF BR ===
  etf_rf_br:
    com_etf_rf_br: NAO  # tributado na fonte pelo intermediário, sem balde
    com_rf_tributada: NAO

  # === FUNDOS ABERTOS ===
  fundo_aberto_lp:
    com_fundo_aberto_lp_outro_fundo: SIM
    com_fundo_aberto_cp: NAO
    com_fundo_fechado_lp: NAO
    com_acao: NAO

  fundo_aberto_cp:
    com_fundo_aberto_cp: SIM
    com_lp: NAO

  fia_aberto:
    com_fia: SIM
    com_acao_a_vista: NAO  # regimes separados (fixo 15% vs swing/day)

  # === FUNDOS FECHADOS ===
  fidc:
    com_fidc_mesma_classificacao: SIM
    com_fidc_diferente_classificacao: NAO
    com_fundo_aberto: NAO

  fip_qualificado:
    com_fip_qualificado: SIM
    com_fip_nao_qualificado: NAO

  fundo_exclusivo:
    com_fundo_exclusivo: depende_classificacao

  # === EXTERIOR (Lei 14.754) ===
  exterior_lei_14754:
    com_stock_exterior: SIM
    com_etf_exterior: SIM
    com_bond_exterior: SIM
    com_reit_exterior: SIM
    com_cripto_exterior: SIM
    com_cripto_br: NAO  # categorias separadas
    com_brasil: NAO  # nunca compensa exterior com Brasil

  cripto_br:
    com_cripto_br: SIM
    com_cripto_exterior: NAO
    com_outros: NAO

  # === RV: opções/termo/futuro ===
  derivativos:
    opcao_com_opcao: SIM
    opcao_com_termo: SIM
    opcao_com_futuro: SIM
    termo_com_termo: SIM
    futuro_com_futuro: SIM
    derivativos_com_a_vista: NAO

  # === Rendimentos ===
  rendimentos_diversos:
    aluguel_com_outros_rendimentos: nao_classico_mas_entra_na_DAA_consolidada
    pensao_pos_adi_5422: ISENTA (não tem prejuízo a compensar)
```

---

## III. MATRIZ DE RETENÇÃO NA FONTE (IRRF)

Quem retém o quê em qual evento — referência rápida pro engine.

```yaml
retencao_na_fonte:

  # === RENDA VARIÁVEL BR ===
  swing_acao_br:
    dedo_duro: 0.00005  # 0,005% sobre valor da venda; reduz DARF mensal
    threshold_minimo: R$ 1
    apuracao_principal: DARF_6015_mensal_pela_pf

  day_acao_br:
    dedo_duro: 0.01  # 1% sobre resultado positivo do dia
    apuracao: DARF_6015_mensal

  # === FII ===
  fii_swing:
    dedo_duro: 0.00005
    apuracao_principal: DARF_6015_mensal (categoria isolada)

  fii_rendimento_mensal:
    isento_pf_com_requisitos: 0
    sem_requisitos: tabela_regressiva_rf

  # === RF TRIBUTADA ===
  rf_tributada:
    irrf: tabela_regressiva_aplicada_na_realização_pelo_administrador
    sem_DARF_pf: cliente_so_declara_em_DAA

  # === ETF RF BR ===
  etf_rf_br:
    irrf: tabela_etf_rf_aplicada_pelo_intermediario_na_venda
    sem_DARF_pf

  # === FUNDOS ===
  fundos_abertos:
    come_cotas_amortizacao_cotas: 15% (LP) ou 20% (CP) automatica
    resgate: complemento_regressiva

  fundos_fechados_pos_14754:
    come_cotas: idem aberto
    excecoes: FIP_qualificado_FIA_fechado_FII_IE

  # === DIVIDENDOS / JCP ===
  jcp:
    irrf: 0.15  # definitivo na PF
    retido_pela_pj_pagadora

  dividendos_regime_pos_2026:
    abaixo_50k_mes: zero
    acima_50k_mes: 0.10  # sobre total do mês mesma fonte
    retido_pela_pj_pagadora

  # === RENDIMENTOS DO TRABALHO ===
  salario_pro_labore:
    irrf: tabela_progressiva_mensal_2026
    retido_pelo_empregador

  ferias_e_13: idem_salario_com_apuracao_separada

  # === ALUGUEL ===
  aluguel_de_pj:
    irrf: tabela_progressiva_mensal
    retido_pela_pj_locataria

  aluguel_de_pf:
    sem_retencao_na_fonte
    apuracao_carne_leao_DARF_0190

  # === EXTERIOR ===
  exterior_lei_14754:
    no_brasil: sem_retencao  # apuração 100% pelo investidor em DAA anual
    no_pais_origem: varia_por_pais (30% EUA dividendo, 15% UCITS, etc.)
```

---

## IV. MATRIZ DA BASE DO IRPFM (Lei 15.270)

Quais rendimentos entram na base anual ampla do IRPFM, e quais ficam fora.

```yaml
base_irpfm_lei_15270:

  ENTRAM (todos):
    # tributáveis pela progressiva
    - salario, pro_labore, 13_salario, ferias, plr
    - aluguel_recebido
    - honorarios_autonomo
    - aposentadoria (acima isenção idoso)

    # tributados exclusivamente na fonte
    - jcp_recebido
    - rendimentos_de_fundo_aberto (come-cotas + resgate)
    - rendimentos_de_fundo_fechado_pos_14754

    # ISENTOS HOJE que passam a entrar na base
    - dividendos_de_pj_brasileira (até 50k/mês isentos na fonte, mas integram base IRPFM)
    - rendimentos_mensais_fii_e_fiagro_isentos
    - rendimentos_de_lci_lca_cri_cra_debentures_incentivadas
    - rendimentos_da_poupanca

    # rendimentos de capital realizados
    - ganho_capital_RV (mesmo dentro da janela R$ 20k)
    - ganho_capital_FII
    - rendimentos_RF_tributada
    - resgate_pgbl_vgbl

    # exterior
    - rendimentos_e_ganhos_exterior_lei_14754

  FICAM FORA (não entram):
    - indenizacoes_dano_moral (consolidado)
    - fgts_recebido
    - seguro_de_vida_para_beneficiario
    - pensao_alimentar_recebida_pos_adi_5422 (consolidado, mas verificar IN)
    - aposentadoria_idoso_acima_65_dentro_isencao
    - heranca_recebida
    - doacao_recebida

  EM_INTERPRETACAO (a fechar com tributarista):
    - pensao_recebida_via_acordo_judicial
    - bolsa_de_estudos
    - indenizacao_trabalhista_natureza_indenizatoria
    - aposentadoria_privada (PGBL/VGBL antes do resgate)

calculo_irpfm:
  1: somar_renda_total_ampla
  2: se total <= R$ 600k: irpfm = 0; STOP
  3: se total >= R$ 1.2M: aliquota = 0.10
  4: senão: aliquota = 0.10 × (total - 600k) / 600k  # progressiva linear
  5: irpfm_bruto = total × aliquota
  6: subtrair ir_já_pago_no_ano (DARF + IRRF + DAA exterior + JCP + Lei 15.270)
  7: aplicar redutor anti-bitributação (carga PJ + PF não passa limite nominal 34/40/45)
  8: irpfm_devido = max(0, irpfm_bruto - ir_pago - redutor)
```

---

## V. CALENDÁRIO FISCAL UNIFICADO

Todos os eventos automáticos que o engine deve antecipar/projetar.

```yaml
calendario_fiscal_anual_2026:

  todos_os_meses:
    ultimo_dia_util:
      - DARF_6015 (RV + FII + Day) — pessoa física
      - DARF_0190 (carnê-leão) — aluguel de PF, honorário PF
      - vencimentos_RF do mês (Tesouro, CDB, debêntures)
      - distribuicoes_FII_mensais
      - distribuicoes_dividendos_pj_brasileira
      - JCP retido pela PJ pagadora
      - pro_labore_e_salario_e_INSS

  janeiro:
    - apuracao_4o_trimestre_pj (presumido)
    - inicio_apuracao_anual_2025 (LR)

  maio:
    ultimo_dia_util:
      - COME_COTAS_SEMESTRAL_1 (fundos abertos LP/CP, fundos fechados pós-14.754, exclusivos)
    31:
      - vencimento_DAA_PF (declaração 2025 ano-base)

  novembro:
    ultimo_dia_util:
      - COME_COTAS_SEMESTRAL_2

  trimestrais:
    - 31_mar, 30_jun, 30_set, 31_dez: vencimento_DARF_PJ_LP_apuracao
    - distribuicoes_trimestrais_etfs_americanos_distribuicao
    - cupons_semestrais_NTN_F_NTN_B (variados meses por título)

  fim_de_ano:
    dezembro:
      - janela_para_distribuicao_de_dividendos_pre_31_12 (alguns têm regra de transição)
      - venda_para_realizacao_dentro_janela_R_20k_acoes
      - aplicacao_em_lci_lca_para_31_12 (ajuste cronograma)
    31_12:
      - patrimonio_final_para_DAA
      - lucro_anual_pic_opaca_em_brl_para_DAA

eventos_unicos_por_ativo:
  - vencimento_de_cada_titulo_RF_especifico
  - data_de_corte_para_subscricao
  - data_de_OPA_se_anunciada
  - data_de_pagamento_de_evento_corporativo

automacoes_do_app:
  - alerta_D_30_e_D_7_dos_eventos_automaticos
  - calculo_pre_emptivo_do_IR_projetado
  - sugestao_de_estrategia_de_realizacao_para_aproveitar_janelas
```

---

## VI. HIERARQUIA DE CÁLCULO (ordem de apuração)

Quando o engine roda apuração, segue esta ordem.

```yaml
ordem_de_processamento:

  passo_1: ingestao_de_operacoes
    - parseia CSV / lançamento manual
    - valida formato
    - dispara handler por tipo (taxonomia)

  passo_2: atualizacao_de_posicoes
    - calcula custo médio
    - rastreia lotes
    - registra eventos corporativos

  passo_3: apuracao_mensal_RV_e_FII
    - consolida por classe (swing-acao, swing-etf, swing-fii, day, etc.)
    - aplica isenção R$ 20k em swing-ação
    - calcula DARF 6015
    - registra IRRF retido (dedo-duro) creditável

  passo_4: apuracao_de_outros_rendimentos_mensais
    - pro_labore + salario → progressiva
    - aluguel_pf → carnê-leão
    - jcp → IRRF 15% retido
    - dividendos → checagem Lei 15.270 gatilho R$ 50k

  passo_5: apuracao_periodica_automatica
    - come-cotas em maio e novembro (fundos)
    - vencimento RF automático
    - cupons RF semestrais
    - amortizações programadas FIDC/FIP

  passo_6: apuracao_anual_consolidada
    - somar todas as bases
    - calcular IR pago no ano
    - aplicar exterior Lei 14.754 (ganhos do ano em BRL)
    - calcular IRPFM bruto sobre base ampla
    - aplicar redutor anti-bitributação
    - resultado: IR devido em DAA

  passo_7: projecao_de_passivo_latente
    - calcula carrego se vendesse tudo hoje
    - decompõe por classe
    - serve de input pra rebalanceador tax-aware

  passo_8: deteccao_de_oportunidades
    - janela R$ 20k usada/restante
    - tax-loss harvesting disponível
    - timing pré-31/12 da Lei 15.270
    - migração UCITS vs ETF americano
    - distribuição PJ→Holding→PF otimizada
```

---

## VII. EIXOS TRANSVERSAIS

### VII.1 Eixo Temporal

```yaml
eixos_temporais:

  ano_base_vs_ano_projecao:
    ano_base: ano_calendario_fechado (referência confiável; DAA entregue, contabilidade reconciliada)
    ano_corrente: ano_em_curso (alvo móvel, projeção)
    nota_crucial: "Não comparar ano_corrente com ano_corrente — sempre usar ano_base fechado como referência confiável"

  regime_competencia_vs_caixa:
    pf: caixa (recebeu, tributa; salário de janeiro pago em fevereiro = competência janeiro mas caixa fevereiro)
    pj: competência (regime padrão em Lucro Real)

  vigencia_temporal_das_regras:
    cada_regra_yaml_tem: { vigencia_inicio, vigencia_fim }
    engine_seleciona: regra_cuja_vigencia_cobre_data_do_evento
    exemplos:
      - regra_lei_15270: vigencia_inicio = 2026-01-01
      - regra_lei_14754: vigencia_inicio = 2024-01-01
      - regra_isencao_acao_20k: vigencia_inicio = 1995-01-01 (lei 11033)
```

### VII.2 Eixo Estado vs Evento

```yaml
estado_vs_evento:

  estado:
    descricao: snapshot_da_carteira_em_data_X
    exemplos:
      - posicao_em_carteira
      - valor_de_mercado
      - custo_medio_lote
      - passivo_latente
      - saldo_de_prejuizos_acumulados_por_categoria
    tributacao_no_estado: nenhuma

  evento:
    descricao: ocorrencia_que_modifica_estado
    pode_ou_nao_gerar_fato_gerador
    exemplos:
      - venda (gera FG)
      - compra (não gera FG, mas modifica posição)
      - dividendo recebido (gera FG ou não, conforme Lei 15.270)
      - come-cotas (gera FG automático)
      - vencimento RF (gera FG automático)

  separacao_critica:
    - "IR devido" só nasce em eventos
    - "Passivo latente" mora no estado, é projetado, mas não é exigível
    - App tem que mostrar OS DOIS com distinção clara
```

### VII.3 Eixo Escopo

```yaml
escopo_de_apuracao:

  por_cliente: agrupa_todos_os_veiculos
  por_veiculo: cada_veiculo_separadamente (PF, Holding, Offshore — cada uma com sua apuração)
  por_classe: dentro_de_um_veiculo, separa por classe (acao, fii, rf)
  por_categoria: dentro_de_uma_classe, separa por categoria de compensação (swing vs day)
  por_lote: dentro_de_uma_categoria, lote individual com data_de_aquisicao

hierarquia: cliente → veiculo → classe → categoria → lote

regra_de_consolidacao:
  - apuracoes_por_veiculo_sao_INDEPENDENTES (cada PJ paga seu próprio IR)
  - prejuizos_NAO_se_compensam_entre_veiculos
  - mas_renda_total_PF_consolida_no_IRPFM (mesmo CPF, soma tudo do ano)
```

---

## VIII. GLOSSÁRIO MASTER DE VARIÁVEIS

```yaml
variaveis_globais:
  # === IDENTIFICAÇÃO ===
  cliente_id: identificador_unico_do_cliente
  veiculo_id: identificador_do_veiculo (PF, Holding, Offshore)
  ativo_id: identificador_do_ativo
  lote_id: lote_individual_de_aquisicao_de_um_ativo

  # === TEMPO ===
  data_evento: data_do_fato_gerador_ou_movimento
  data_referencia: data_de_corte_para_calculo (ex.: 31/12)
  ano_calendario: ano_referente_ao_evento
  mes_calendario: mes
  dias_desde_compra: data_evento - data_compra_do_lote
  dias_desde_emissao: data_evento - data_emissao_do_ativo (para alguns RF)

  # === VALORES ===
  valor_compra: valor_total_pago_na_aquisicao
  custo_total_brl: custo_acumulado_em_brl_do_lote
  custo_medio: custo_total / qtde
  valor_evento: valor_da_realizacao
  ganho_bruto: valor_evento - custo_proporcional
  ganho_liquido: ganho_bruto - custos_de_transacao
  irrf: ir_retido_na_fonte
  ir_devido: ir_devido_no_evento
  passivo_latente: ir_que_seria_devido_se_realizado_hoje

  # === MOEDA ===
  moeda: BRL / USD / EUR / etc.
  taxa_cambio_ptax: cotacao_BCB_oficial_para_conversao_brl
  valor_em_brl: valor_em_moeda * ptax

  # === REGIMES ===
  regime_pf: tabela_progressiva (com nova faixa R$ 5k em 2026)
  regime_lei_14754: 15_porcento_anual_exterior
  regime_lei_15270_dividendos: 10_porcento_irrf_acima_50k_mes
  regime_irpfm: 0_a_10_progressivo (renda 600k-1.2M)

  # === COMPENSAÇÃO ===
  saldo_prejuizo_categoria: dicionario {categoria: saldo_acumulado}
  prejuizo_consumido_no_evento: parcela do saldo usada para reduzir ganho

  # === FLAGS ===
  e_aplicacao_automatica: flag para varredura de saldo
  e_evento_corporativo: flag para split/grupamento/etc.
  e_lei_15270_aplicavel: flag se data >= 2026-01-01
  cumpre_requisitos_isencao_fii: flag dos 5 requisitos
```

---

## IX. CONTRATO DE API (engine ↔ regras)

Como o engine TS consome o YAML, em alto nível.

```typescript
// pseudo-código da estrutura do loader
interface Regra {
  classe: string;
  versao_inicio: Date;
  versao_fim: Date | null;
  constantes: Record<string, number>;
  eventos: RegraEvento[];
}

interface RegraEvento {
  id: string;
  tipo: TipoEvento;  // da taxonomia única
  pre_condicoes: string[];  // expressões avaliáveis
  sub_cenarios: SubCenario[];
  base_calculo: BaseCalculo;
  tributacao: Tributacao;
  impacto: ImpactoNoEstado;
}

// engine
function processarEvento(op: Operacao): Resultado {
  const regra = loader.selecionarRegra(op.classe, op.data);
  const evento = regra.eventos.find(e => e.tipo === op.tipo);
  const subCenario = evaluator.escolherSubCenario(evento.sub_cenarios, contexto);
  const resultado = evaluator.aplicar(subCenario, contexto);
  return resultado;
}
```

---

## X. PRINCÍPIOS PARA O DEV QUE IMPLEMENTAR

1. **Cada regra é função pura.** Dados de entrada → resultado determinístico. Sem efeitos colaterais. Sem time.now() dentro.

2. **Compensações são objetos de classe primeira.** Não calculadas ad-hoc no fim — saldo de prejuízo é estado persistido e atualizado a cada evento.

3. **Sub-cenários são avaliados em ordem.** O primeiro que casa é o aplicado. Ordem matters.

4. **Tudo audita.** Cada resultado referencia os IDs dos eventos que o originaram (lista). Drill-down é nativo.

5. **Versões temporais como dados.** Engine NUNCA sabe a "data atual" — sempre recebe a data do evento e seleciona a regra cuja vigência cobre.

6. **Variáveis monetárias em Decimal, nunca float.** TypeScript: use bignumber.js ou implementação custom de Decimal.

7. **Câmbio sempre PTAX oficial.** Nunca inventar cotação. Se faltar, marca apuração como "pendente cotação".

8. **Estado vs evento bem separado.** Engine roda evento e atualiza estado; não mistura.

9. **Overlay de cliente como camada explícita.** Quando consultor ajusta manualmente um número, isso fica registrado com data, justificativa, assinatura.

10. **Testes golden first.** Cada regra tem fixture (input/output esperado) que valida em CI a cada PR.

---

## XI. NEXT STEPS

1. Converter cada MGT_*.md em arquivos `regras/*.yaml` executáveis (~1 semana de dev sênior)
2. Implementar `loader.ts` no engine TS para carregar YAMLs dinamicamente
3. Implementar `evaluator.ts` para avaliar condições de sub-cenários com sandbox seguro
4. Migrar `rules.ts` hardcoded → consumir do loader
5. Adicionar testes golden contra casos reais (caso João, Marina, Roberto)
6. Validação tributarista parceiro (4-8 semanas de revisão)

---

*Este documento serve como referência mestre para o engine. Quando aparecer dúvida sobre uma regra, primeiro consultar este arquivo (taxonomia, matriz de compensação, hierarquia), depois consultar a MGT específica da classe (detalhes de cada evento).*
