# MGT — Matriz de Granularidade Tributária | Veículos como Estrutura

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência:** 01/01/2026
**Escopo:** Veículos jurídicos onde patrimônio pode ser detido — PJ Lucro Real, PJ Lucro Presumido, PJ Simples (limitações), Holding patrimonial, Offshore PIC (opaca vs transparente), Trust. Inclui interações Operacional → Holding → PF e planejamento sucessório.
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine

---

## 0. Glossário

| Variável | Significado |
|----------|-------------|
| `tipo_veiculo` | PF / PJ_LR / PJ_LP / PJ_Simples / Holding_patrimonial / Offshore_opaca / Offshore_transparente / Trust |
| `regime_tributario_pj` | lucro_real / lucro_presumido / simples_nacional |
| `atividade_cnae` | código CNAE principal da PJ |
| `presuncao_lucro_presumido` | 8% / 12% / 16% / 32% conforme atividade |
| `participacao_societaria_qualificada` | true se ≥ 10% das cotas (relevante p/ dividendos entre PJs) |
| `pic_optou_transparencia` | true se PF elegeu regime transparente (irrevogável) |
| `trust_tipo` | revogavel / irrevogavel / discricionario / fixed |
| `itcmd_estado` | UF do doador/falecido — define alíquota e regras |

---

## 0.1 Tabelas de carga nominal por regime PJ

```yaml
tabela: carga_nominal_pj
referencia_legal: [lei_9430_1996, lei_9249_1995, lei_7689_1988]

pj_lucro_real:
  irpj: 0.15
  adicional_irpj: 0.10  # sobre lucro > R$ 20k/mês
  csll: 0.09
  pis_cofins_nao_cumulativo: 0.0925  # sobre receita; com créditos
  carga_efetiva_sobre_lucro: 0.34  # IRPJ + Adicional + CSLL
  nota: "Adicional aplica só sobre o EXCEDENTE de R$ 240k/ano (R$ 20k/mês)"

pj_lucro_presumido:
  presuncao_irpj_csll:
    servicos_locacao_cessao_direitos: 0.32
    venda_mercadorias: 0.08
    revenda_combustiveis: 0.012
    imobiliaria_venda: 0.08
    imobiliaria_locacao: 0.32
    intermediacao_negocios: 0.32
  aliquotas_sobre_presuncao:
    irpj: 0.15
    adicional_irpj: 0.10  # sobre presunção > R$ 20k/mês
    csll_presuncao: 0.32  # mesma presunção em geral
    csll: 0.09
  pis_cofins_cumulativo: 0.0365  # sobre receita; sem créditos
  carga_efetiva_total_receita_aluguel:
    composta: |
      32% presunção × (15% IRPJ + 9% CSLL) = 7,68%
      + 3,65% PIS/COFINS
      ≈ 11,33% sobre receita bruta (ou 14,5% com adicional IRPJ)
    nota: "Compare com tabela PF progressiva ~27,5% — diferença é a vantagem da holding"

pj_simples:
  vedado_para: ["gestao_participacoes", "atividade_financeira", "fundo_de_investimento"]
  uso_em_holding: NAO  # Simples não pode ser holding
  uso_em_operacional: SIM_em_alguns_setores
```

---

## 0.2 Tabela ITCMD por estado (relevantes)

```yaml
tabela: itcmd_estados_brasil
referencia_legal: [constituicao_federal_art_155_I, lei_estadual_de_cada_uf]
nota_critica: "ITCMD é estadual — alíquota e regras MUDAM por UF. Sempre verificar a lei do estado do doador/falecido."

estados_progressivos:
  - sp:
      aliquota: 0.04  # alíquota única atualmente (proposta de progressiva em discussão)
      faixa_isencao: aplicado conforme regulamento
      nota: "Reforma estadual em andamento — pode virar progressivo até 8%"
  - rj:
      aliquotas_progressivas: [4.0, 4.5, 5.0, 6.0, 7.0, 8.0]
      faixas: por_valor_da_doacao_ou_heranca
  - mg:
      aliquotas: [3.0, 4.0, 5.0]
  - rs:
      aliquotas_progressivas: [3.0, 4.0, 5.0, 6.0]

estados_de_aliquota_unica:
  - pr: 0.04
  - sc: 0.08
  - go: 0.04
  - ba: 0.08
  - df: 0.04

instrumentos_de_planejamento:
  - doacao_com_reserva_usufruto:
      descricao: "Doador transfere a nua-propriedade mantendo usufruto (direito de usar e fruir)"
      vantagem_tributaria: "ITCMD geralmente incide sobre a NUA-PROPRIEDADE (% do valor cheio — varia por UF)"
      vantagem_civil: "Doador mantém controle e renda em vida"
  - holding_patrimonial_para_sucessao:
      descricao: "Patrimônio dividido em cotas da holding; doação de cotas em vida"
      vantagem: |
        cotas têm valor patrimonial possivelmente menor que avaliação direta dos ativos
        ITCMD reduzido em alguns estados
      considerar: ágio/deságio, deságio por iliquidez de cotas fechadas
```

---

## I. PJ LUCRO REAL

```yaml
classe: pj_lucro_real
nome_canonico: "Pessoa Jurídica no regime de Lucro Real"
referencia_legal: [decreto_9580_2018_rir, lei_9430_1996]
obrigatorio_para:
  - receita_bruta_anual > 78_milhoes
  - atividades_especificas (banco, seguradora, factoring, exportadora)
opcional_para: outras PJs

eventos_apuracao:
  - id: E_apuracao_anual
    base_de_calculo: lucro_real (resultado contábil ajustado por adições/exclusões/compensações)
    aliquotas:
      irpj_basica: 0.15
      irpj_adicional: 0.10  # sobre o que exceder R$ 240.000/ano
      csll: 0.09
    apuracao: anual_OU_trimestral
    deducoes_jcp: SIM  # JCP pago é dedutível, reduz lucro real
    compensacao_prejuizo_fiscal: ate_30_porcento_lucro_anual

  - id: E_apuracao_trimestral
    base: lucro_real_do_trimestre
    nota: "Empresa em LR pode optar por apuração trimestral ou anual (com estimativa mensal)"

  - id: E_pis_cofins_nao_cumulativo
    aliquota: 0.0925  # 1,65% PIS + 7,6% COFINS
    base: receita_bruta - exclusões
    credito: SIM_sobre_insumos
    nota: "Crédito de PIS/COFINS reduz carga efetiva — depende dos insumos da atividade"

  - id: E_distribuicao_dividendos_para_socio_pf
    pre_condicao: lucro_apurado_e_disponivel
    sub_cenarios:
      - id: regime_pre_2026
        condicao: "data <= 31/12/2025"
        tributacao_pf: isento
      - id: regime_pos_2026_abaixo_50k_mes
        tributacao_pf: integralmente_isento_na_fonte (mas entra na base IRPFM)
      - id: regime_pos_2026_acima_50k_mes_mesma_fonte
        tributacao_pf: IRRF_10_porcento_sobre_total_do_mes
        retencao: pj_pagadora
    ver: MGT_fluxos_pessoa_lei_15270.md (capítulo Lei 15.270)

  - id: E_jcp_pago_para_socio
    aliquota_irrf: 0.15  # definitivo na PF
    deducao_pj: SIM  # reduz lucro tributável da PJ
    limite_legal_pj: TJLP_acumulada * patrimonio_liquido_proporcional
    estrategia: "JCP é mais eficiente que dividendo até o limite legal — economiza IRPJ/CSLL"

uso_tipico_em_holding: |
  Holding patrimonial em Lucro Real é usado quando volume de receita é grande
  ou quando há prejuízo fiscal a aproveitar. Senão, Presumido tende a ser mais eficiente.
```

---

## II. PJ LUCRO PRESUMIDO (a estrela para holding patrimonial)

```yaml
classe: pj_lucro_presumido
nome_canonico: "Pessoa Jurídica no regime de Lucro Presumido"
referencia_legal: [lei_9430_1996_art_3]
limite_receita_anual: 78_milhoes
opcao_irretratavel_no_ano: SIM

eventos_apuracao:
  - id: E_apuracao_trimestral
    apuracao: trimestral_obrigatoria
    base_irpj_csll:
      - servicos_locacao: 32% × receita_bruta
      - imobiliaria_venda: 8% × receita_bruta
      - venda_mercadorias: 8% × receita_bruta
    aliquotas_sobre_presuncao:
      - irpj: 0.15
      - adicional_irpj: 0.10  # sobre presunção_trimestral > R$ 60k (R$ 20k/mês × 3)
      - csll: 0.09 (sobre csll_presuncao)
    pis_cofins: 3.65% sobre receita_bruta_total (cumulativo)

  - id: E_distribuicao_dividendos_para_socio_pf
    nota: "Vê regime pré/pós 2026 igual ao Lucro Real (Lei 15.270)"

  - id: E_jcp_pago
    nota: "JCP em Presumido NÃO é dedutível (porque o IRPJ/CSLL já é calculado sobre presunção)"
    consequencia: "Em Presumido, JCP NÃO traz vantagem fiscal direta — só dividendo. Diferente do LR."

vantagem_para_holding_de_alugueis:
  exemplo:
    receita_aluguel_anual: 1_200_000
    presuncao_32_porcento: 384_000
    irpj_15_porcento: 57_600
    adicional_10_porcento_sobre_excedente_240k: 14_400
    csll_9_porcento_sobre_presuncao: 34_560
    pis_cofins_3.65: 43_800
    total_carga: 150_360
    carga_efetiva_sobre_receita: 12.53%
  comparacao_pf:
    pf_recebendo_direto:
      aliquota_marginal: 0.275  # tabela progressiva no topo
      total: 330_000  # antes de dedução
      diferenca_holding_vs_pf: 180_000  # economia ANUAL com holding em Presumido
  conclusao: "Holding em Presumido > PF direto para aluguéis até patamares MUITO altos"
```

---

## III. PJ SIMPLES NACIONAL

```yaml
classe: pj_simples_nacional
referencia_legal: [lei_complementar_123_2006]
limite_receita_anual: 4_800_000

regime: unica_guia_unificada_DAS
aliquotas: tabela_progressiva_por_anexo (5 anexos diferentes por atividade)

vedacoes:
  - "VEDADO para holding patrimonial (atividade de gestão de participações está excluída)"
  - "VEDADO para atividade financeira"
  - "VEDADO para fundos de investimento"

uso_em_operacional: SIM_para_pequenos_negocios
uso_em_holding: NAO

implicacao_app: "Quando cliente menciona 'minha empresa é Simples', não pode ser veículo de patrimônio"
```

---

## IV. HOLDING PATRIMONIAL

```yaml
estrutura: holding_patrimonial
nome_canonico: "Holding patrimonial — PJ que detém patrimônio (imóveis, participações)"
nao_e_regime_tributario_proprio: TRUE  # é uma forma de uso
regime_tributario_tipico: lucro_presumido (presunção 32% sobre aluguel)
regime_alternativo: lucro_real (se for vantajoso)

atividades_tipicas:
  - locacao_de_imoveis (CNAE 6810-2/02 ou similar)
  - holding_de_participacoes (CNAE 6462-0/00)

eventos_relevantes:
  - id: E_recebe_aluguel
    sub_cenarios:
      - locatario_pj_terceira:
          irrf_retido_pela_pj_locataria: 1.5% (PIS/COFINS) + IR na fonte conforme tabela ou base
          consequencia_holding: receita_bruta_tributada_pelo_presumido
      - locatario_pf:
          retencao_fonte: zero
          consequencia: holding tributa receita bruta pelo presumido normalmente

  - id: E_recebe_dividendos_da_operacional
    pre_condicao: holding_e_socia_da_operacional
    sub_cenarios:
      - participacao_qualificada (≥ 10% das cotas):
          tributacao: ISENTA_entre_PJs (regime histórico)
          regime_pos_15270: AVALIAR  # Lei 15.270 modificou alguns aspectos — verificar
      - participacao_nao_qualificada:
          tributacao: pode_tributar (verificar IN específica)

  - id: E_recebe_jcp_da_operacional
    irrf_15_definitivo: SIM
    impacto_holding: JCP_é_receita_financeira_tributada_pelo_regime_da_holding

  - id: E_distribui_dividendos_para_socio_pf
    sub_cenarios:
      - pre_2026:
          tributacao_socio: isento
      - pos_2026:
          aplica_lei_15270: SIM
          gatilho_50k_mes: SE_DISPARADO_irrf_10_sobre_total
          base_irpfm: ENTRA_na_base_ampla

  - id: E_venda_de_imovel_pela_holding
    sub_cenarios:
      - regime_presumido:
          presuncao_irpj_csll: 8% se atividade for imobiliária; senão usa presunção 32%
          aliquota_efetiva_sobre_ganho: depende muito do regime
      - regime_real:
          ganho_capital: tributação completa

  - id: E_venda_de_cota_da_holding_por_socio
    sub_cenarios:
      - venda_para_terceiros:
          tributacao_socio_pf: ganho_de_capital_15_a_22.5_porcento (alíquota progressiva)
      - venda_entre_familiares:
          atencao_anti_planejamento_abusivo

planejamento_sucessorio:
  doacao_de_cotas_da_holding_para_herdeiros:
    instrumento: doacao_com_ou_sem_reserva_usufruto
    itcmd: aplica_pelo_estado (4-8% conforme UF)
    vantagem: |
      cotas tendem a ter valor patrimonial menor que avaliação direta dos imóveis
      ITCMD reduzido vs herança direta dos imóveis
    cuidado:
      - "Receita pode questionar se valor das cotas está abaixo do mercado (deságio excessivo)"
      - "Doador deve manter controle se houver reserva de usufruto"
```

---

## V. OFFSHORE — PIC OPACA (REGIME PADRÃO)

```yaml
classe: offshore_pic_opaca
nome_canonico: "Personal Investment Company offshore com regime opaco"
referencia_legal: [lei_14754_2023]
domicilios_tipicos: [BVI, Cayman, Bahamas, Delaware_USA, Luxemburgo_Soparfi]

regime_padrao_lei_14754:
  - PIC apura lucro anual em moeda da PIC
  - Traduz pelo PTAX 31/12 do ano
  - PF paga 15% sobre lucro anual (em DAA do ano seguinte)
  - INDEPENDE de distribuição (anti-diferimento)

eventos:
  - id: E1_constituicao_da_pic
    obrigacao_declaratoria: DCBE_banco_central_se_patrimonio_exterior_acima_de_USD_1M
    impacto_tributario_no_aporte_inicial: nenhum (transferência de ativos do cliente)

  - id: E_apuracao_anual_opaca
    base: lucro_contabil_anual_pic_em_brl
    formula: |
      lucro_em_brl = (receitas_pic - despesas_pic - perdas) × ptax_31_12
      ir_devido = lucro_em_brl × 0.15
    apuracao: dec_anual_em_DAA
    nao_compensa: prejuizos_individuais_de_ativos (regime opaco bloqueia)

  - id: E_distribuicao_pic_para_pf
    tributacao_no_momento: nenhuma  # PF já pagou 15% sobre lucro anual
    impacto: reducao_patrimonio_da_pic

  - id: E_liquidacao_da_pic
    tratamento: tributação final sobre lucro acumulado não tributado ainda

custo_anual:
  - administracao_offshore: USD 5.000 - 15.000 / ano
  - auditoria_se_aplicavel: USD 2.000 - 5.000
  - ir_brasileiro: 15% lucro anual em BRL

vantagem_opaca: simplicidade — não precisa rastrear cada ativo individualmente
desvantagem_opaca:
  - paga ir sobre rendimento contábil mesmo sem realização
  - não aproveita isenções específicas (cripto R$ 35k, harvesting)
  - lucros e prejuízos individuais somam-se contabilmente, sem otimização
```

---

## VI. OFFSHORE — PIC TRANSPARENTE (OPÇÃO IRREVOGÁVEL)

```yaml
classe: offshore_pic_transparente
referencia_legal: [lei_14754_2023, in_rfb_2180_2024]

opcao:
  prazo_para_optar:
    pic_existente_em_2023: ate_DAA_2024  # PASSADO
    pic_constituida_apos_2024: ate_30_dias_apos_constituicao
  irrevogavel: SIM
  consequencia_falha_de_opcao: regime_opaco_padrao_aplica

tratamento:
  - PIC é "transparente" — ativos tratados como se fossem da PF direto
  - Cada ativo aplica seu próprio regime
  - PF tributa ativo por ativo

eventos:
  - id: E5_apuracao_de_cada_ativo
    para_acoes_exterior: aplica_lei_14754_15_porcento_anual
    para_cripto_via_pic_transparente: regime_cripto_exterior (15% Lei 14.754)
    para_fundos_offshore: regime_proprio
    nota: "Cada ativo da PIC funciona como se a PIC não existisse fiscalmente"

  - id: E_compensacao_prejuizos
    com_outros_ativos_exterior_da_pf: SIM (mesma categoria Lei 14.754)
    nota: "Vantagem da transparência: pode compensar prejuízo de stock americano com ganho de ETF UCITS"

vantagens_transparencia:
  - aplica isenções específicas
  - compensa prejuízos por categoria
  - tributa só na realização (não diferimento perpétuo, mas evita IR sobre marca latente)
desvantagens:
  - complexidade administrativa (rastrear cada ativo)
  - obrigações declaratórias completas

decisao_pic_opaca_vs_transparente:
  pic_com_ativos_volateis_e_heterogeneos: TRANSPARENCIA_geralmente_melhor
  pic_com_ativos_passivos_pouca_movimentacao: OPACA_simplifica
  pic_predominantemente_em_cripto: TRANSPARENCIA_para_usar_R$_35k (mas só se cripto for BR — não exterior)
```

---

## VII. TRUST

```yaml
classe: trust
referencia_legal: [lei_14754_2023]
regime_obrigatorio: TRANSPARENTE  # não há opção opaca para trust

definicoes:
  instituidor: pessoa_que_aporta_recursos
  beneficiario: pessoa_que_recebe_distribuicao
  trustee: administrador
  protetor: opcional

tributacao:
  durante_vida_instituidor:
    titularidade_fiscal: instituidor
    tratamento: como_se_ativos_do_trust_fossem_do_instituidor_direto
  apos_morte_instituidor:
    titularidade_fiscal: beneficiarios (transição complexa, em interpretação)
    sucessao: pode_envolver_ITCMD_no_estado_dos_beneficiarios

sub_tipos:
  trust_revogavel:
    pode_ser_desfeito_pelo_instituidor: SIM
    tratamento_brasileiro: ativos_continuam_do_instituidor_em_vida
  trust_irrevogavel:
    transferencia_definitiva: SIM
    tratamento_brasileiro: ainda_assim_transparente_em_vida_do_instituidor
  trust_discricionario:
    trustee_decide_distribuicoes: SIM
    tratamento_brasileiro: transparente_ao_instituidor_em_vida
  trust_fixed:
    distribuicoes_pre_definidas_no_contrato: SIM
    tratamento_brasileiro: idem

eventos:
  - id: E1_constituicao_trust
    obrigacoes:
      - declarar_em_DAA_e_DCBE
      - registrar_no_fisco_via_RFB
    tributacao_aporte: nenhuma_se_ativos_ja_eram_do_instituidor (sem fato gerador)

  - id: E5_rendimentos_dos_ativos_do_trust
    tratamento: como_se_fossem_da_pf_instituidor
    aplicacao_lei_14754: SIM (15% anual)

  - id: E6_distribuicao_a_beneficiarios_em_vida
    tratamento: como_doacao_em_vida
    itcmd: aplica_pelo_estado_do_beneficiario

  - id: E_morte_instituidor
    tratamento: sucessao_complexa
    transferencia_titularidade_para_beneficiarios: 
    interpretacao: ainda_em_consolidacao_via_in_rfb
```

---

## VIII. SUCESSÃO E ITCMD

```yaml
processo_sucessao:
  evento_juridico: morte_OU_doacao
  evento_fiscal_federal:
    heranca_recebida: ISENTA_IR_federal (lei_9532_1997)
    doacao_recebida: ISENTA_IR_federal
  evento_fiscal_estadual:
    itcmd: APLICA_pelo_estado_do_evento

custo_medio_dos_herdeiros:
  regra: "Custo médio dos ativos herdados = VALOR DA AVALIAÇÃO NO INVENTÁRIO"
  importancia: |
    Cliente que recebe ações do pai não herda o custo médio histórico do pai.
    Recebe os ativos com novo custo = valor de avaliação no inventário.
    Quando vender, ganho de capital = valor_venda - valor_inventario.
  exemplo:
    pai_comprou_petr4: R$ 10 em 1990
    pai_morre: 2026 com PETR4 a R$ 30
    valor_inventario: R$ 30 (mercado na data)
    filho_recebe_custo_medio: R$ 30
    filho_vende_quando_petr4_a_35: ganho = 5/cota (não 25/cota como seria com custo do pai)
  consequencia: "Salto de custo ('step-up basis') no inventário — vantagem natural para herdeiros"

instrumentos_de_planejamento_sucessorio:
  - doacao_em_vida_com_reserva_usufruto:
      mecanica: doa nua-propriedade, mantém usufruto
      vantagem: itcmd pago em vida sobre nua-propriedade (% do valor cheio, varia UF)
      controle: doador mantém renda e administração

  - holding_patrimonial:
      mecanica: aportar imóveis/participações na holding, doar cotas em vida
      vantagem_tributaria: cotas podem ter avaliação menor (deságio)
      cuidado: receita pode questionar se deságio for excessivo

  - testamento:
      mecanica: definir destinação no inventário
      itcmd: aplica normalmente

  - trust_e_offshore:
      mecanica: estruturas no exterior para sucessão
      tributacao_brasileira: Lei 14.754 aplica (trust transparente)
      cuidado: alta complexidade, ITCMD pode aplicar dependendo da estrutura
```

---

## IX. INTERAÇÕES OPERACIONAL → HOLDING → PF (CASO COMPLEXO)

```yaml
fluxo_tipico_socio_de_operacional_com_holding:
  estrutura: |
    Operacional (PJ Lucro Real ou Presumido)
      → Holding patrimonial (PJ Presumido, sócia da Operacional)
        → PF (sócio único da Holding)
  
  fluxos_de_caixa_e_tributacao:
    1_operacional_paga_pro_labore_pf:
       tabela_progressiva_irpf_mensal: SIM
       INSS: 11% até teto
       dedutibilidade_na_pj: SIM

    2_operacional_distribui_dividendo_holding:
       regime_pre_2026: isento
       regime_pos_2026: 
         se_participacao_qualificada: avaliar (em geral mantém isenção entre PJs)
         se_nao_qualificada: tributa

    3_operacional_paga_jcp_holding:
       irrf_15_definitivo_na_holding: SIM
       dedutibilidade_pj_operacional: SIM (vantagem fiscal)
       holding_recebe_como_receita_financeira

    4_holding_aplica_recursos_em_imoveis_carteira:
       receita_aluguel: tributada_pelo_presumido (carga ~11-14%)
       lucros_da_carteira: tributada_conforme_regime

    5_holding_distribui_para_pf:
       regime_pos_2026:
         abaixo_50k_mes: integralmente_isento_na_fonte
         acima_50k_mes_mesma_fonte: IRRF_10_porcento_sobre_total
       base_irpfm: ENTRA na base ampla independente da fonte
       cuidado: lei_15270_aplica_no_pj_pf_final_independente_de_holding_intermediaria

planejamento_otimo:
  - usar_jcp_da_operacional_para_holding até limite legal (economiza IRPJ/CSLL operacional)
  - distribuir_da_holding_em_parcelas_abaixo_R_50k_mes para evitar IRRF 10%
  - sem_distribuicao_total: holding acumula; PF não paga IRPFM sobre rendimentos não distribuídos (mas paga sobre o que recebeu)

aresta_critica:
  - "ARESTA: Lei 15.270 aplica no fluxo PJ→PF FINAL, independente da camada intermediária"
  - "Holding NÃO escapa do gatilho R$ 50k — só permite escalonar no tempo"
  - "Erro comum: 'tenho holding, estou imune' — FALSO"
```

---

## X. ARESTAS NÃO ÓBVIAS

### X.1 Aresta do redutor anti-bitributação por veículo

Lei 15.270 introduziu redutor para evitar bitributação Operacional → PF. Mas o redutor compara carga efetiva da PJ pagadora com limites nominais (34% PJ não-financeira, 40% seguradora/financeira, 45% banco). **Holding em Presumido tem carga efetiva ~12-14%, MUITO ABAIXO do limite nominal de 34%**. Resultado: redutor anti-bitributação NÃO ajuda holding patrimonial em Presumido. Ela paga IRPFM cheio na PF.

Isso é contra-intuitivo — cliente acha "tenho holding, está blindado". Está blindado da TABELA PROGRESSIVA da PF (carga ~27,5%), mas NÃO do IRPFM (10%). O redutor só ajuda quem está em LR no nível PJ com carga próxima de 34%.

### X.2 Aresta da venda de cota de holding entre cônjuges

Doação ou venda de cotas de holding entre cônjuges em comunhão de bens: pode gerar ITCMD em alguns estados, gerar ganho de capital em outros. Tema muito interpretativo. Verificar UF.

### X.3 Aresta da PIC opaca com prejuízo no ano

PIC opaca com prejuízo anual: paga zero IR. Mas o prejuízo NÃO compensa ganhos da PF direto (regime opaco bloqueia). Cliente perde o prejuízo pra fins fiscais. Em PIC transparente, prejuízo seria compensável com outros ganhos do exterior.

### X.4 Aresta do trust com beneficiário menor

Trust irrevogável com beneficiário menor de idade: titularidade fiscal durante vida do instituidor = instituidor. Após morte, transição para o menor (que tem responsável legal). Complexidade adicional: ITCMD sobre transferência aos beneficiários após morte.

### X.5 Aresta da holding com imóvel residencial do sócio

Cliente coloca casa própria na holding. Sócio mora lá. **Tem que pagar aluguel pra holding** — senão, há "distribuição disfarçada de lucros" e a Receita autua. Aluguel sai do bolso do sócio e entra como receita tributável da holding. Anula em parte a vantagem.

### X.6 Aresta da venda direta de imóvel pela PF vs pela holding

Venda de imóvel pela PF: alíquota 15-22,5% (ganho de capital, regressiva conforme prazo).
Venda de imóvel pela holding em Presumido com atividade imobiliária: presunção 8%, alíquota efetiva ~6% sobre ganho.
Venda pela holding em Presumido SEM atividade imobiliária declarada: presunção 32%, alíquota ~12% sobre ganho.
Decisão crítica: declarar atividade imobiliária se planeja vender imóveis frequentemente.

### X.7 Aresta da PIC offshore que detém imóvel no exterior

PIC opaca tem imóvel no exterior alugado. Aluguel da PIC tributa pelo regime opaco anual (15% sobre lucro anual da PIC em BRL). Mas se o imóvel fosse direto da PF: aplicaria regime Lei 14.754 sobre aluguel. Não é mesma coisa. Verificar IN.

### X.8 Aresta do trust em estado com tratado para sucessão

Brasil tem poucos tratados específicos sobre tributação de sucessão. Trust em jurisdição com tratado pode ter tratamento favorável. Verificar caso a caso — em geral, Lei 14.754 prevalece.

---

## XI. LACUNAS CONHECIDAS

1. **Lei 15.270 sobre distribuição entre PJs com participação qualificada** — ainda em interpretação consolidada
2. **Holding com múltiplos sócios e classes de cotas** — interação com sucessão
3. **Sucessão internacional** — falecido residente fora do Brasil, herdeiros brasileiros
4. **Trust em estrutura compounda (trust dentro de trust)** — complexidade adicional
5. **Reorganização societária (incorporação, fusão, cisão de holdings)** — tratamento tributário caso a caso
6. **Holding que recebe JCP e distribui — interação Lei 15.270** — verificar IN
7. **Pessoa jurídica residente em Cayman / Delaware (não PIC clássica)** — tratamento próprio
8. **Imóvel rural na holding** — tributação especial em alguns casos (ITR continua aplicando)

---

## XII. CHECKLIST PARA REVISÃO DO TRIBUTARISTA

- [ ] PJ Lucro Real com IRPJ + Adicional + CSLL = 34% efetivo
- [ ] PJ Lucro Presumido com presunção 32% sobre aluguel = ~11-14% efetivo
- [ ] Simples Nacional vedado para holding
- [ ] Holding patrimonial em Presumido como caso típico
- [ ] PIC opaca (regime padrão) vs transparente (opção irrevogável passada)
- [ ] Trust sempre transparente
- [ ] Sucessão: heranças isentas IR federal, ITCMD por estado
- [ ] Step-up basis no inventário (custo médio dos herdeiros = avaliação)
- [ ] Doação com reserva de usufruto como instrumento
- [ ] Fluxo Operacional → Holding → PF com Lei 15.270 aplicando no nível PF final
- [ ] Redutor anti-bitributação NÃO cobre holding em Presumido
- [ ] Arestas X.1 a X.8 documentadas

---

*Próximo capítulo final: Camada de Consolidação Transversal — matriz cruzada completa de compensação, calendário fiscal unificado, taxonomia única de eventos.*
