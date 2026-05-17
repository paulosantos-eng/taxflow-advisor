# MGT — Matriz de Granularidade Tributária | Internacional (Lei 14.754/2023)

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência:** 01/01/2024 (Lei 14.754) — pleno em 2026 com IN consolidadas
**Escopo:** ativos no exterior detidos por PF residente no Brasil — exclui ETFs (já cobertos em MGT_etfs.md). Inclui stocks individuais, REITs diretos, bonds, mutual funds, UCITS não-ETF, criptoativos, offshore PIC, trust, imóveis no exterior.
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine

---

## 0. Glossário

| Variável | Significado |
|----------|-------------|
| `domicilio_ativo` | país onde o ativo está registrado/depositado |
| `custodia` | onde o ativo está sob guarda (Avenue, IBKR, Schwab, banco no exterior, self-custody) |
| `regime_aplicavel_14754` | aplicacao_financeira / offshore_opaca / offshore_transparente / trust / imovel |
| `valor_em_brl` | conversão para BRL pelo câmbio PTAX do dia da operação |
| `prejuizo_exterior_acumulado` | saldo de prejuízos no exterior a compensar com ganhos do exterior |
| `ir_retido_no_exterior` | IR cobrado pelo país de origem do ativo |
| `aplica_tratado_brasil_pais` | true se há tratado bilateral para evitar bitributação |
| `forma_juridica` | direto / via_pic / via_trust |
| `tipo_pic` | personal_investment_company (típica em BVI, Caymans, Bahamas, Delaware, Estados Unidos LLC) |

---

## 0.1 Tabela regime único Lei 14.754

```yaml
tabela: regime_lei_14754_aplicacoes_financeiras
referencia_legal: [lei_14754_2023, in_rfb_2180_2024]
descricao: |
  Aplicações financeiras no exterior detidas por PF residente no Brasil são tributadas
  ANUALMENTE em DAA à alíquota única de 15%. Variação cambial NÃO é destacada como ganho
  separado — entra no resultado total em BRL.

aliquota_unica: 0.15
apuracao: anual_em_DAA
mes_apuracao: maio_do_ano_seguinte
compensacao_prejuizo: SIM_dentro_da_categoria_exterior_sem_prazo
nao_aplica_a:
  - imoveis_no_exterior  # regime próprio
  - ganho_de_capital_de_bem_movel_no_exterior  # regime próprio

abrangencia_aplicacoes_financeiras:
  - stocks_acoes_individuais
  - REITs
  - ETFs  # já cobertos em MGT_etfs.md
  - bonds_soberanos
  - bonds_corporativos
  - mutual_funds_e_UCITS_nao_ETF
  - fundos_offshore_estrangeiros
  - cripto_em_custodia_no_exterior
  - depositos_remunerados (CD bancário, savings)
  - estruturados (notes, ELN, MTN)
```

---

## 0.2 Regimes para Offshore PIC

```yaml
tabela: regimes_offshore_pic_lei_14754
referencia_legal: [lei_14754_2023_art_X]

regime_opaco_padrao:
  descricao: "PIC apura lucro anual em moeda estrangeira; PF tributa 15% sobre lucro anual em BRL"
  apuracao: anual_em_DAA
  base: lucro_anual_da_PIC_em_BRL_PTAX_31_12
  aliquota: 0.15
  caracteristica: "PF paga IR mesmo SEM distribuição da PIC (anti-diferimento)"
  vantagem: simples, sem necessidade de mapear cada ativo da PIC
  desvantagem: |
    paga IR sobre ganho não realizado (lucro contábil da PIC)
    sem compensar com prejuízos individuais dos ativos
    sem aplicar isenção R$ 35k de cripto, por exemplo

regime_transparencia_opcao:
  descricao: "PIC é desconsiderada; ativos são tratados como se fossem da PF direto"
  apuracao: idem_ativo_subjacente
  base: cada_ativo_individual
  vantagem: |
    aplica regimes específicos de cada ativo
    compensação de prejuízos por categoria
    isenções aplicáveis
  desvantagem: complexo; precisa rastrear cada ativo da PIC individualmente
  opcao_irrevogavel: SIM_apos_eleita
  prazo_de_opcao: ate_DAA_2024_para_estoque_pre_2024  # Verificar IN

regime_transparencia_para_trust:
  obrigatorio: SIM
  nao_ha_opcao_de_opacidade: "Lei 14.754 define trust como sempre transparente"

implicacao_estrategica:
  - "PIC com ativos voláteis: opaco favorece (suaviza ganho/perda anual)"
  - "PIC com cripto: transparência permite isenção R$ 35k (cripto em custodia BR)"
  - "PIC com pouca movimentação: opaco simples"
  - "PIC com muitos ativos heterogêneos: opaco simplifica"
```

---

## 0.3 Tratados bilaterais e crédito de IR exterior

```yaml
tabela: tratados_e_creditos
referencia_legal: [tratados_brasil_X_pais_a_pais]

paises_com_tratado_amplo:
  - argentina, austria, belgica, canada, chile, china, coreia_sul
  - dinamarca, equador, espanha, filipinas, finlandia, franca
  - holanda, hungria, india, israel, italia, japao, luxemburgo
  - mexico, noruega, peru, portugal, republica_tcheca, russia
  - eslovaquia, suecia, trinidad_e_tobago, turquia, ucrania, venezuela

estados_unidos:
  tratado_amplo_para_pf: NAO  # tratado existe mas é limitado
  cobertura_dividendos_pf: NAO  # PF brasileira NÃO se beneficia de redução de retenção
  cobertura_dividendos_pj: SIM  # PJ pode reduzir retenção
  retencao_dividendos_pf: 0.30  # alíquota cheia EUA
  retencao_juros_de_bonds_pf: 0.30
  isencao_juros_treasury_para_estrangeiro: SIM_em_certos_titulos  # Portfolio Interest Exemption
  creditavel_no_brasil: SIM_via_reciprocidade  # ainda que sem tratado, reciprocidade aplica

reino_unido:
  tratado_amplo: NAO_para_pf
  retencao_dividendos: varia_5_a_15

irlanda:
  tratado_com_eua_qualidade: ALTA  # base para UCITS
  retencao_eua_via_irlanda: 0.15_em_dividendos  # via fundo UCITS

implicacao_app:
  - "App deve manter tabela atualizada de tratados por país"
  - "Crédito de IR retido no exterior é creditavel contra os 15% brasileiros"
  - "Para EUA: 30% retido + 15% no Brasil pode resultar em compensação total dependendo do caso"
```

---

## I. STOCKS INDIVIDUAIS NO EXTERIOR

---

### I.1 Compra de ação no exterior

```yaml
classe: stock_exterior_direto
nome_canonico: "Ação individual no exterior (NYSE, Nasdaq, LSE, TSE, etc.)"
exemplos_eua: [AAPL, GOOG, MSFT, AMZN, TSLA, NVDA, BRK.B]
exemplos_europa: [SAP_DE, ASML_NL, NOVO_DK]
exemplos_japao: [TSM, SONY]

eventos:
  - id: E1_compra
    tipo: aquisicao
    tributacao: nenhuma_na_aquisicao
    captura: [data_compra, ticker, qtde, preco_em_USD_OR_outra_moeda, taxa_cambio_compra_PTAX, valor_em_BRL, corretagem, custodia, isin]
    notas:
      - "Custo em BRL deve ser calculado pelo PTAX da data da liquidação financeira"
      - "Múltiplas aquisições do mesmo ticker geram custo médio em BRL"
```

---

### I.2 Venda de ação no exterior

```yaml
  - id: E2_venda
    tipo: realizacao
    pre_condicoes: [posicao > 0]
    base_calculo: |
      ganho_em_brl = (valor_venda_em_brl - corretagem_venda) - (custo_medio_em_brl)
      onde valor_venda_em_brl = valor_em_moeda * PTAX_dia_venda
    tributacao:
      regime: lei_14754_2023
      aliquota: 0.15
      apuracao: anual_em_DAA  # NÃO mensal
    output: [ganho_anual_exterior_brl, compensavel_com_outros_prejuizos_exterior]
    notas:
      - "ARESTA CRÍTICA: variação cambial NÃO é destacada — entra no ganho total em BRL"
      - "Cliente que comprou AAPL a USD 100 quando o USD valia R$ 5,00 (custo R$ 500) e vendeu por USD 120 quando USD valia R$ 6,00 (recebimento R$ 720) → ganho em BRL R$ 220. Tributa 15% × R$ 220 = R$ 33"
      - "Sem retenção na fonte — apuração 100% pelo investidor em DAA"
      - "Compensação: prejuízo em stock exterior compensa com ganhos em qualquer outra aplicação financeira no exterior (mesmo CPF), sem prazo"
```

---

### I.3 Dividendos de stock estrangeiro

```yaml
  - id: E5_dividendo_recebido
    tipo: realizacao_periodica
    pre_condicoes: [acao_com_distribuicao, posicao_na_data_de_corte]
    sub_cenarios:
      - id: dividendo_dos_eua_pf
        retencao_pais_origem: 0.30  # alíquota cheia, sem tratado para PF
        tributacao_brasil:
          regime: lei_14754_2023
          aliquota: 0.15
          base: valor_bruto_recebido_em_brl_PTAX_dia
          credito_ir_eua: SIM  # creditavel contra 15% brasileiro
        carga_total_efetiva:
          retencao_eua: 30
          adicional_brasil: 0  # 15% creditado pela retenção
          total: 30
      - id: dividendo_de_pais_com_tratado_pf
        retencao_pais_origem: 0.15  # típico via tratado
        tributacao_brasil:
          regime: lei_14754_2023
          aliquota: 0.15
          credito_ir_origem: SIM
        carga_total: ~15-30  # depende
      - id: dividendo_de_pais_sem_tratado
        retencao_pais_origem: varia
        tributacao_brasil: 0.15
        compensacao: NAO_creditavel
        carga_total: retencao_origem + 0.15
    captura: [data, valor_usd, taxa_PTAX, valor_brl, ir_retido_origem, formulario_1099_DIV]
    notas:
      - "ARESTA: dividendos qualified vs ordinary (classificação americana) NÃO afeta tributação brasileira; afeta carga americana"
      - "Cliente sem W-8BEN tem retenção EUA de 30% mesmo em jurisdições com tratado"
      - "Cliente com W-8BEN beneficia-se do tratado nos países que cobrem PF"
```

---

### I.4 Eventos corporativos no exterior

```yaml
eventos_corporativos:
  - id: EC1_split_grupamento
    tributacao: nenhuma
    impacto_custo_medio: padrao_split_grupamento

  - id: EC2_bonificacao_stock_dividend
    descricao: "Stock dividend (dividendo em ações em vez de dinheiro) — comum nos EUA"
    tributacao_brasil_via_14754:
      interpretacao_consolidada: "trata como bonificação BR — sem FG se valor não atribuído; com FG se distribuição em $"
      nota: "Aresta interpretativa — verificar caso a caso"

  - id: EC3_fusao_acquisicao
    sub_cenarios:
      - troca_de_acoes: tributacao_nenhuma_continuidade
      - dinheiro: trata_como_E2_venda
      - mista: dividir_proporcao

  - id: EC4_spin_off
    descricao: "Empresa A separa parte para empresa B; acionistas de A recebem ações de B"
    tributacao_brasil:
      no_recebimento: nenhuma  # se valor não atribuído
      novo_custo_medio: "rateado conforme o cost basis allocation da empresa (publicado em 8937 dos EUA)"
    notas:
      - "ARESTA-CRÍTICA: empresa americana publica 'Form 8937' com a alocação de custo para spin-offs"
      - "App deve buscar 8937 ou pedir input manual"

  - id: EC5_redomestication_change_of_listing
    descricao: "Empresa muda de mercado (ex.: NYSE para LSE, ou Cayman para Delaware)"
    tributacao: tipicamente_nenhuma
    nota: "Mas pode haver implicações cambiais"

  - id: EC6_class_action_settlement
    descricao: "Receita de acordo de ação coletiva como acionista"
    tributacao_brasil_via_14754: 0.15
    captura: data, valor, ticker_origem
    nota: "Tratamento: ajuste do custo médio ou rendimento (depende da natureza do settlement)"
```

---

## II. REITs DIRETOS (REAL ESTATE INVESTMENT TRUSTS)

```yaml
classe: reit_exterior_direto
nome_canonico: "REIT (Real Estate Investment Trust) — empresa imobiliária regulada"
exemplos_eua: [O, AMT, PLD, EQIX, SPG, AVB, EXR, CCI]
caracteristica: "Empresa que distribui ≥ 90% do lucro tributável; isenta de imposto no nível corporate nos EUA"

eventos:
  - mesma_estrutura_base_que: stock_exterior_direto

  - id: E5_distribuicao_reit_classificada
    descricao: "REIT americano emite 1099-DIV com classificação das distribuições"
    classificacoes_1099_div:
      ordinary_dividend:
        retencao_eua_pf_brasileira: 0.30
        tributacao_brasil_14754: 0.15
        compensavel: SIM
      qualified_dividend:
        nota: "REITs raramente emitem qualified; maioria é ordinary"
      capital_gain_distribution:
        retencao_eua_pf: 0.30  # mesmo tratamento
      return_of_capital_ROC:
        descricao: "Devolução de capital; NÃO é rendimento"
        retencao_eua: 0
        tributacao_brasil_14754: nenhuma_no_recebimento
        impacto: REDUZ_o_custo_medio_em_brl
        quando_custo_medio_zerado: vira_ganho_de_capital_brl
    captura_critica: [classificacao_1099, valor_por_classificacao, ir_retido]
    notas:
      - "ARESTA-CRÍTICA: classificar errado ROC como dividendo infla o custo de aquisição; cliente paga IR a mais"
      - "App precisa importar 1099-DIV anual e classificar cada distribuição"
      - "ROC em REITs americanos é COMUM — pode ser 30-40% das distribuições"
```

---

## III. BONDS (TÍTULOS DE DÍVIDA NO EXTERIOR)

---

### III.1 US Treasuries (títulos do tesouro americano)

```yaml
classe: us_treasuries
nome_canonico: "Títulos do Tesouro dos EUA"
sub_tipos: [Bills (até 1 ano), Notes (2-10 anos), Bonds (>10 anos), TIPS (indexados à inflação)]

eventos:
  - id: E1_compra
    captura: [data_compra, ticker, qtde, preco_usd, ptax, custo_em_brl, vencimento, cupom_taxa, frequencia_cupom]

  - id: E2_venda_secundario
    sub_cenarios:
      - id: ganho
        tributacao: 0.15  # Lei 14.754 anual em DAA
    base_calculo: |
      ganho_brl = (valor_venda_brl) - (custo_medio_brl)

  - id: E3_vencimento
    descricao: "Treasury matura; cliente recebe valor de face"
    tributacao:
      ganho_brl: 0.15
      retencao_eua: 0  # treasuries são isentos para estrangeiros (Portfolio Interest Exemption)
    nota: "ARESTA: treasuries têm isenção americana via Portfolio Interest Exemption se cliente não-residente — sem retenção na origem"

  - id: E5_cupom_semestral
    descricao: "Notes e Bonds pagam cupom semestral"
    tributacao_brasil_14754: 0.15
    retencao_eua: 0  # idem isenção
    nota: "Cliente brasileiro pagando 15% no Brasil sobre o cupom bruto — sem retenção americana"

  - id: E_tips_correcao_inflacao
    descricao: "TIPS são corrigidos pelo CPI americano; correção é ganho em BRL na DAA"
    nota: "Correção é tratada como rendimento, tributada 15% Lei 14.754"
```

---

### III.2 Corporate bonds e bonds soberanos não-US

```yaml
classe: corporate_bond_exterior
nome_canonico: "Bond corporativo no exterior"

eventos:
  - id: E1_compra
  - id: E2_venda_secundario
  - id: E3_vencimento
  - id: E5_cupom
    sub_cenarios:
      - retencao_pais_origem:
          eua_corporate: 0.30  # geral; alguns bonds isentos para estrangeiros
          europa: 0_a_30  # depende; varia
          mercado_emergente: varia_muito
      - tributacao_brasil: 0.15
      - credito_ir_origem: SIM_via_tratado_OU_reciprocidade

  - id: E_default
    descricao: "Emissor entra em default"
    tributacao: prejuizo_realizado
    compensavel: com_outros_ganhos_exterior

notas:
  - "ARESTA: bonds em mercado emergente (Brasil eurobonds, México eurobonds) podem ter tributação especial no país de origem"
  - "Aresta: bonds com 'OID' (Original Issue Discount) têm tributação anual mesmo sem pagamento — verificar caso a caso"
```

---

## IV. MUTUAL FUNDS NÃO-ETF

```yaml
classe: mutual_fund_exterior_nao_etf
descricao: "Fundos mútuos abertos no exterior (Vanguard, Fidelity), não negociados em bolsa"

eventos:
  - id: E1_compra
  - id: E2_resgate
    tributacao_brasil: 0.15
    base: ganho_em_brl
  - id: E5_distribuicao
    descricao: "Mutual fund americano pode distribuir dividendos e ganhos de capital realizados internamente"
    tributacao_brasil: 0.15
    retencao_eua: depende_natureza_distribuicao
    nota: "Tratamento similar ao ETF mas com 'capital gain distributions' que ocorrem mesmo sem o investidor vender"

notas:
  - "Aresta única do mutual fund vs ETF: mutual fund pode gerar capital gain distributions sem o investidor agir"
  - "Cliente recebe distribuição (FG no Brasil) E o custo médio sobe — ou seja, fica mais caro tributar"
```

---

## V. UCITS FUNDS (NÃO-ETF)

```yaml
classe: ucits_fund_nao_etf
descricao: "Fundos UCITS (Undertaking for Collective Investment in Transferable Securities) — regulamentação europeia, domicílio típico Irlanda/Luxemburgo"

caracteristicas:
  - regulamentacao_europeia
  - domicilio_tipico: [irlanda, luxemburgo]
  - politica_dividendos: acumulacao_OR_distribuicao
  - acesso_para_brasileiros: via_corretora_internacional

tributacao_brasil:
  regime: lei_14754_2023
  aliquota: 0.15
  apuracao: anual_em_DAA

eventos:
  - id: E1_compra
  - id: E2_resgate
    tributacao_brasil: 0.15
  - id: E5_distribuicao_se_distribuicao_class
    tributacao_brasil: 0.15
    retencao_irlanda: 0  # UCITS irlandeses distribuem brutos
    retencao_luxemburgo: varia

vantagem_estrutural_para_brasileiro:
  - "UCITS acumulação NÃO distribui — só FG na venda"
  - "UCITS irlandês recebe dividendos de empresas americanas com retenção 15% (via tratado IRE-EUA) — antes de chegar ao investidor"
  - "vs ETF americano: dividendos chegam ao fundo com retenção 30% (sem tratado para fundo americano)"

notas:
  - "Disponibilidade limitada via Avenue (EUA); Avenue oferece principalmente ETFs UCITS"
  - "Para mutual funds UCITS, cliente precisa de corretora europeia (Saxo, IBKR, Degiro, etc.)"
```

---

## VI. CRIPTOATIVOS

```yaml
classe: criptoativo
nome_canonico: "Criptomoeda, token, NFT"
referencia_legal: [lei_8981_1995_art_21, lei_14478_2022, in_rfb_1888_2019, lei_14754_2023]

eventos:
  - id: E1_compra
    captura: [data, ativo, qtde, preco_em_moeda_aquisicao, taxa_cambio, valor_em_brl, custodia]
    sub_classificacao_pela_custodia:
      - custodia_corretora_br: regime_BR_lei_8981
      - custodia_corretora_exterior: regime_lei_14754
      - self_custody (wallet pessoal): depende_de_interpretacao  # área cinzenta

  - id: E2_venda
    sub_cenarios:
      - cripto_em_corretora_BR:
          regime: lei_8981_1995
          isencao_volume_mes: 35000  # se vendas no mês <= R$ 35k, isento
          aliquota_acima_isencao: 0.15  # ganho líquido
          apuracao: mensal_DARF_4600  # código próprio
          nota: "ARESTA: isenção R$ 35k é DE VENDAS, não de ganho. Igual ao R$ 20k de ações mas com piso maior"
      - cripto_em_corretora_exterior:
          regime: lei_14754_2023
          aliquota: 0.15
          apuracao: anual_em_DAA
          isencao_35k_nao_aplica: TRUE
          nota: "Cliente que migra cripto da Binance global (exterior) para Mercado Bitcoin (BR) pode usar isenção R$ 35k"

  - id: E5_staking_recompensa
    descricao: "Recebimento de recompensa de staking"
    sub_cenarios:
      - staking_em_corretora_BR:
          tratamento: rendimento_progressivo  # interpretação Receita 2024
          nota: "Não consolidado; pode ser tratado como ganho de capital também"
      - staking_em_corretora_exterior:
          tratamento: rendimento_lei_14754
          aliquota: 0.15
          apuracao: anual

  - id: E6_conversao_entre_criptos
    descricao: "Trocar BTC por ETH é fato gerador (alienação)"
    tributacao_brasil: SIM
    base: valor_de_mercado_no_momento_da_troca
    nota: |
      ARESTA-CRÍTICA: trocar 1 BTC por 15 ETH é tratada como VENDA do BTC pelo valor de mercado +
      AQUISIÇÃO de 15 ETH pelo mesmo valor. Cliente que faz day-trade entre criptos gera centenas de FGs.

  - id: E7_recebimento_de_airdrop
    tratamento: rendimento_no_recebimento_pelo_valor_de_mercado

  - id: E8_uso_de_cripto_para_pagar_servico
    tratamento: como_venda  # alienação do cripto pelo valor de mercado
    base: valor_de_mercado_no_dia_do_pagamento

  - id: E9_in_RFB_1888_obrigacao_reportar
    descricao: "Mensalmente, contribuinte deve reportar à Receita movimentações de cripto"
    quem: PF_que_movimentou_acima_de_30k_mes
    como: e-CAC ou via corretora_brasileira
    nota: "Obrigação acessória, não tributação"

notas:
  - "Aresta: NFT — tratamento ainda mais cinzento; geralmente tratado como criptoativo para fins fiscais"
  - "Aresta: self-custody (wallet pessoal não custodiada) é zona cinza; Receita tende a tratar como exterior"
```

---

## VII. OFFSHORE PIC (PERSONAL INVESTMENT COMPANY)

```yaml
classe: pic_offshore
nome_canonico: "Personal Investment Company (PIC) no exterior"
domicilios_tipicos: [BVI, Cayman, Bahamas, Delaware, Estados Unidos LLC, Luxemburgo Soparfi]

eventos:
  - id: E1_constituicao
    pre_condicoes: [residente_no_brasil_constitui_pj_no_exterior]
    impactos:
      - obrigacao_declaratoria_DCBE_Banco_Central
      - obrigacao_declaratoria_DAA_anual

  - id: E_opcao_de_regime
    descricao: "PF decide se PIC será opaca (padrão) ou transparente"
    opcao_irrevogavel: SIM
    prazo: ate_DAA_apos_constituicao_OU_ate_2024_para_PICs_existentes_em_2023

  - id: E5_apuracao_anual_opaca
    pre_condicoes: [regime_opaco_eleito_OR_default]
    base_calculo: lucro_anual_da_PIC_em_brl
    formula: |
      lucro_em_moeda_da_PIC = receitas - despesas - perdas
      lucro_em_BRL = lucro_em_moeda * PTAX_31_12_do_ano
      ir_devido = lucro_em_BRL * 0.15
    tributacao_brasil: 0.15
    retencao_no_pais_da_PIC: tipicamente_zero  # paraísos fiscais
    apuracao: anual_em_DAA
    notas:
      - "PF paga 15% sobre LUCRO CONTÁBIL da PIC, mesmo que nada seja distribuído"
      - "Sem possibilidade de compensar com prejuízos de ativos individuais da PIC (já que regime é opaco)"

  - id: E5b_apuracao_anual_transparente
    pre_condicoes: [regime_transparente_eleito]
    tratamento: |
      cada ativo da PIC é tributado como se fosse da PF direto
      apuração ativo a ativo
      compensação de prejuízos por categoria (mesma da PF)
    notas:
      - "Mais complexo administrativamente"
      - "Mas permite aplicar isenções específicas (cripto R$ 35k, etc.)"
      - "Em geral mais eficiente para PIC com ativos heterogêneos e ganhos/perdas mistos"

  - id: E6_distribuicao_da_pic_para_pf
    pre_condicoes: [PIC_distribui_dividendo_para_pf]
    sub_cenarios:
      - id: pic_opaca:
          tributacao_distribuicao: nenhuma_adicional  # PF já paga 15% anual sobre lucro
          nota: "Distribuição da PIC opaca para PF é redução de patrimônio, sem novo FG"
      - id: pic_transparente:
          tributacao_distribuicao: depende_natureza_do_ativo_que_originou
          nota: "Cada ativo da PIC tem seu regime; distribuição apenas materializa caixa"

  - id: E7_liquidacao_da_pic
    descricao: "PIC é encerrada e ativos voltam para PF"
    tributacao:
      pic_opaca: "lucro_acumulado_da_PIC_x_15% + tratamento_dos_ativos_no_recebimento_pela_PF"
      pic_transparente: "como já tributado; sem novo FG na liquidação"
```

---

## VIII. TRUST

```yaml
classe: trust_no_exterior
nome_canonico: "Trust (instituidor/grantor brasileiro, com beneficiários e ativos no exterior)"
referencia_legal: [lei_14754_2023]
regime_obrigatorio: TRANSPARENCIA_FISCAL
nao_ha_opcao_opaca: TRUE

definicoes:
  instituidor_grantor: pessoa_que_aporta_recursos_ao_trust
  beneficiario: pessoa_que_recebe_distribuicao
  trustee: administrador_do_trust
  protetor: opcional

tributacao_do_trust:
  durante_vida_do_instituidor:
    titularidade_fiscal: instituidor  # ativos do trust são tratados como do instituidor
    apuracao: ativo_a_ativo_como_se_fossem_do_instituidor_direto
  apos_falecimento_do_instituidor:
    titularidade_fiscal: beneficiarios
    distribuicoes_aos_beneficiarios: regime_pos_morte_complexo
    nota: "Interpretação ainda em consolidação para sucessão via trust"

sub_tipos:
  trust_revogavel:
    descricao: "Instituidor pode reverter a transferência"
    tratamento: titularidade_segue_instituidor
  trust_irrevogavel:
    descricao: "Transferência definitiva"
    tratamento: |
      ainda assim, Lei 14.754 trata como transparente em relação ao instituidor enquanto vivo
      após morte, transição para beneficiários
  trust_discricionario:
    descricao: "Trustee decide quem recebe e quando"
    tratamento_brasileiro: transparente_em_relação_ao_instituidor

eventos:
  - id: E1_constituicao_do_trust
    obrigacao: declarar_no_DAA_DCBE
    tributacao_no_aporte: nenhuma_se_ativos_ja_eram_do_instituidor

  - id: E5_rendimentos_dos_ativos_do_trust
    tributacao: como_se_fossem_da_PF_instituidor
    apuracao: lei_14754_anual_DAA

  - id: E6_distribuicao_a_beneficiarios
    tratamento: depende_de_vida_OR_morte_instituidor
    nota: "Tema complexo; flag para tributarista"
```

---

## IX. IMÓVEIS NO EXTERIOR

```yaml
classe: imovel_exterior
referencia_legal: [lei_14754_2023, lei_9249_1995_arts_18-20]

eventos:
  - id: E1_compra
    captura: [data, pais, endereco, valor_em_moeda, ptax, valor_em_brl]

  - id: E5_aluguel_recebido
    tributacao:
      regime: lei_14754_2023
      aliquota: 0.15
      apuracao: anual_em_DAA
      deducoes_permitidas: depende_da_legislacao_do_pais  # geral: despesas necessárias

  - id: E2_venda
    tributacao:
      regime: ganho_de_capital_imovel_lei_9249_OR_lei_14754
      controversia: aresta_interpretativa
    sub_cenarios:
      - interpretacao_imovel_isolada:
          base: ganho_de_capital_imovel
          aliquota: 0.15_a_0.225_tabela_progressiva
          isencoes: R_440_000_unico_imovel_ate_5_anos
      - interpretacao_lei_14754_aplicacao_financeira:
          base: ganho_anual
          aliquota: 0.15
    notas:
      - "ARESTA-CRÍTICA: tratamento de imóvel no exterior é tema interpretativo"
      - "Verificar IN específica da Receita 2024-2026"
```

---

## X. APLICAÇÕES FINANCEIRAS SIMPLES

```yaml
classe: conta_corrente_remunerada_exterior
sub_tipos: [savings_account_eua, CD_americano, money_market_account, stablecoin_yield_account]

eventos:
  - id: E5_juros_recebidos
    tributacao_brasil: 0.15
    retencao_eua_para_pf_brasileira:
      cd_bancario_eua: 0  # Portfolio Interest Exemption se cliente não-residente
      savings_account_eua: depende
      money_market: similar
    apuracao: anual_em_DAA

  - id: E2_resgate
    se_ganho_for_apenas_juros: tributacao_na_data_dos_juros
    se_ha_diferenca_FX_no_principal: tributacao_via_14754

classe: stablecoin_yield_account
exemplos: [USDC_yield_Aave, USDT_em_centralized_exchanges]
tratamento: |
  rendimento de stablecoin: 15% Lei 14.754
  resgate: pode haver ganho de capital se preço da stablecoin oscilou (raro)
```

---

## XI. EVENTOS TRANSVERSAIS

---

### XI.1 Variação cambial — não destacada

```yaml
regra: variacao_cambial_lei_14754
descricao: |
  Antes da Lei 14.754 (até 2023): cliente vendia stock no exterior, separava ganho em USD
  (tributado 15-22,5% pela tabela do ganho de capital) e ganho cambial (até R$ 35k isento).

  Após Lei 14.754 (2024+): ganho TOTAL em BRL é tributado a 15% — NÃO há destaque.

implicacao:
  - "Cliente em ciclo USD up vs BRL: ganho cambial entra inteiro no 15%"
  - "Cliente em ciclo USD down: prejuízo cambial reduz o ganho total"
  - "Aresta: cliente que tinha posição pré-2024 pode ter regime de transição (verificar)"
```

---

### XI.2 Compensação de prejuízos no exterior

```yaml
regra: compensacao_prejuizos_exterior
escopo: TODOS_os_ativos_lei_14754
matriz_compensacao:
  stock_com_stock: SIM
  stock_com_etf: SIM
  stock_com_bond: SIM
  stock_com_cripto_exterior: SIM
  reit_com_qualquer: SIM
  imovel_com_outros: depende_interpretacao  # cinzenta
  cripto_exterior_com_cripto_br: NAO  # categorias diferentes

prazo: sem_prazo  # acumula indefinidamente
nao_compensa_com_brasil: TRUE  # prejuízo exterior NÃO compensa ganho brasileiro
```

---

### XI.3 Crédito de IR pago no exterior

```yaml
regra: credito_ir_exterior
descricao: "IR retido no país de origem pode ser creditado contra os 15% brasileiros"
condicoes:
  - tratado_bilateral_OR_reciprocidade
  - imposto_da_mesma_natureza_que_ir_brasileiro
  - documentacao_comprobatoria (1099-DIV, recibo, etc.)

calculo:
  if tratado_aplica:
    credito = min(retencao_pais_origem * valor_brl, 15% * valor_brl)
  else:
    credito = 0
    nota: "Sem tratado, retenção do exterior é custo perdido"

implicacao:
  - "EUA-PF: 30% retido. 15% creditável no Brasil (reciprocidade). 15% perdido"
  - "Países com tratado pleno: retenção ~15% no origem totalmente creditável; carga final = 15%"
```

---

### XI.4 Apuração na DAA

```yaml
processo: apuracao_anual_exterior_DAA
vencimento: ultima_quinta_feira_util_de_maio

passos:
  1. listar_todos_ativos_exterior_no_31_12
  2. consolidar_ganhos_realizados_no_ano (por ativo, por classe)
  3. compensar_prejuizos_acumulados
  4. aplicar_15_porcento
  5. creditar_ir_retido_exterior
  6. apurar_ir_a_pagar_no_brasil

output: linha_especifica_na_DAA "Aplicações Financeiras no Exterior"
```

---

## XII. ARESTAS NÃO ÓBVIAS

---

### XII.1 Aresta da troca cripto-cripto

Toda conversão entre criptoativos é fato gerador. Cliente que faz day-trade BTC↔ETH ↔SOL gera centenas de FGs por mês. App tem que importar histórico de trades de exchanges e gerar a apuração — não tem como o cliente fazer manualmente.

---

### XII.2 Aresta do regime opaco da PIC com prejuízo

PIC opaca com prejuízo anual: NÃO tributa (lucro zero ou negativo). Prejuízo acumula? Aresta: interpretação ainda em consolidação. Conservador: prejuízo da PIC NÃO compensa com ganhos diretos da PF. Otimista: PIC opaca opera prejuízos como diferimento natural.

---

### XII.3 Aresta da opção de regime

Decisão entre opaco e transparente é IRREVOGÁVEL. App deve permitir simulação multi-ano antes da decisão. Para PICs com ativos voláteis e heterogêneos, transparência tipicamente é melhor; para PICs com ativos passivos e pouca movimentação, opaca é mais simples.

---

### XII.4 Aresta do W-8BEN

Cliente sem W-8BEN preenchido junto à corretora americana é tributado a 30% em dividendos. Com W-8BEN, beneficia-se de tratado quando aplica. Aresta operacional: app deve rastrear status de W-8BEN como dado crítico do cliente.

---

### XII.5 Aresta de imóvel no exterior

Tratamento ainda interpretativo. Cliente que comprou imóvel em Miami em 2020 e vende em 2026: aplica regra antiga de ganho de capital? Ou regra Lei 14.754 de 15% sobre ganho total em BRL? Verificar IN.

---

### XII.6 Aresta da DCBE / Banco Central

Brasileiro com ativos no exterior > USD 1MM deve apresentar DCBE ao Banco Central anualmente. Esse é dever DECLARATÓRIO, não tributário, mas multa por descumprimento é alta. App deve alertar quando patrimônio do cliente no exterior aproximar US$ 1MM.

---

### XII.7 Aresta da residência fiscal brasileira

Cliente que muda residência fiscal para fora do Brasil deixa de aplicar Lei 14.754 — vira não-residente para Receita. Aresta complexa: timing, declaração de saída definitiva, fato gerador da declaração.

---

### XII.8 Aresta da herança no exterior

Brasileiro recebe herança de parente no exterior. Tributação: ITCMD do estado brasileiro do herdeiro (não há IR federal sobre herança). Mas se herança é em ativos financeiros, esses ativos passam a integrar o patrimônio do herdeiro brasileiro e ficam sob Lei 14.754. Custo de aquisição: valor da herança (não custo histórico do falecido).

---

## XIII. LACUNAS CONHECIDAS

1. **Tratamento exato de NFTs** — aplicação financeira, bem móvel ou arte? Cinzento.
2. **Trust irrevogável com beneficiários menores** — sucessão e tributação. Verificar IN.
3. **Bonds com OID (Original Issue Discount)** — tributação anual mesmo sem pagamento.
4. **Stablecoins em DeFi (Aave, Compound)** — tratamento como cripto vs como conta remunerada.
5. **Tax-loss harvesting via PIC transparente** — viabilidade operacional.
6. **Stock options exercidas no exterior** — RSU/ISO/NSO americanas; cada uma tem tratamento diferente.
7. **Empréstimos para PIC ou trust** — implicações tributárias dos juros pagos.
8. **Migração de residência fiscal** — fato gerador da saída e tratamento de mais-valias acumuladas.

---

## XIV. CHECKLIST PARA REVISÃO DO TRIBUTARISTA

- [ ] Lei 14.754 aplicada a stocks, REITs, bonds, mutual funds, UCITS
- [ ] Cripto BR (Lei 8.981, isenção R$ 35k) vs cripto exterior (Lei 14.754)
- [ ] PIC: regime opaco vs transparência com opção irrevogável
- [ ] Trust como transparente obrigatório
- [ ] REITs com classificação 1099-DIV (ROC vs ordinary vs capital gain)
- [ ] Tratado Brasil-país aplicado caso a caso
- [ ] W-8BEN como dado crítico
- [ ] Variação cambial não destacada (Lei 14.754)
- [ ] DCBE > US$ 1MM
- [ ] Imóvel no exterior com aresta interpretativa
- [ ] Arestas XII.1 a XII.8 documentadas

---

*Próximas MGTs a montar: Fundos abertos com come-cotas, Fundos fechados pós-14.754 (FIDC/FIP/exclusivos/FIA), Veículos (PJ Lucro Presumido / Holding patrimonial / Offshore como estrutura).*
