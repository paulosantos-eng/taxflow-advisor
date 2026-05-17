# MGT — Matriz de Granularidade Tributária | Fundos Fechados pós-Lei 14.754/2023

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência:** 01/01/2024 (Lei 14.754) — pleno em 2026 com IN consolidadas
**Escopo:** FIDC, FIP qualificado e não-qualificado, FIA fechado, Fundos Exclusivos (multimercado/RF fechados pós-14.754), e o regime de transição do estoque pré-2024.
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine

---

## 0. Glossário (extensão às MGTs anteriores)

| Variável | Significado |
|----------|-------------|
| `tipo_fundo_fechado` | fidc / fip_qualificado / fip_nao_qualificado / fundo_exclusivo / fia_fechado / fundo_imobiliario_pip_ie |
| `regime_pre_14754` | true se fundo existia antes de 01/01/2024 e tem estoque legado |
| `estoque_diferido` | rendimentos acumulados até 31/12/2023 que ficaram em diferimento |
| `regime_estoque` | tratamento desse estoque legado: imposto único 8% (antecipação) OU regime regular (15% na realização) |
| `fip_qualificacao_cvm_578` | atende requisitos da IN CVM 578 (≥ 90% em ativos qualificados) |
| `fundo_exclusivo` | fundo com 1 cotista ou < 5 cotistas, ou cota minoritária > 50% |
| `come_cotas_aplica` | true se fundo passou a sofrer come-cotas pós-14.754 |
| `prazo_medio_carteira` | PMR usado para classificação CP/LP em FIDC |

---

## 0.1 Tabelas auxiliares específicas

```yaml
tabela: classificacao_fidc
descricao: "Classificação CP/LP para FIDC (segue regra similar a fundos abertos)"
referencia_legal: [in_rfb_1585_2015, lei_14754_2023]
faixas:
  - condicao: "pmr_carteira <= 365"
    classificacao: curto_prazo
    aliquota_come_cotas: 0.20
  - condicao: "pmr_carteira > 365"
    classificacao: longo_prazo
    aliquota_come_cotas: 0.15

tabela: regime_estoque_pre_2024
descricao: "Opções de tratamento do estoque legado de fundos fechados pré-14.754"
referencia_legal: [lei_14754_2023_disposicoes_transitorias]
opcoes:
  - id: antecipacao_8_porcento
    descricao: "PF pagou 8% sobre o estoque diferido até 31/12/2023, em dezembro/2023 ou em 24 parcelas em 2024"
    consequencia: "Estoque fica 'limpo'; resgates futuros aplicam regime novo só sobre rendimento novo"
    prazo_para_optar: ate_dez_2024  # PASSADO
    nota: "Cliente que NÃO optou: estoque vira tributável conforme realização (regime regular pós-14.754)"
  - id: regime_regular
    descricao: "Sem antecipação; estoque tributado conforme realização"
    aliquota_aplicavel: 15  # regressiva final
```

---

## I. FIDC — Fundo de Investimento em Direitos Creditórios

```yaml
classe: fidc
nome_canonico: "Fundo de Investimento em Direitos Creditórios"
referencia_legal: [in_cvm_175, lei_14754_2023, in_rfb_2154_2023]
estrutura_basica: fechado_com_cotas_seniores_e_subordinadas_ou_unica_classe
formatos:
  - fidc_multicedente_multissacado
  - fidc_padronizado
  - fidc_nao_padronizado
  - fof_de_fidc

eventos:
  - id: E1_aplicacao
    captura: [data_aplicacao, qtde_cotas, preco_cota, classe (senior/subordinada/unica)]

  - id: E2_amortizacao_programada
    tipo: realizacao_periodica
    descricao: "FIDC amortiza cotas em datas pré-definidas (mensal, trimestral, semestral)"
    pre_condicoes: [data_amortizacao_atingida, posicao_em_carteira > 0]
    sub_cenarios:
      - id: amortizacao_de_principal
        tratamento: reduz_custo_medio_lote
        tributacao: nenhuma  # se for devolução de principal
      - id: amortizacao_com_rendimento
        tratamento: parte_rendimento_tributa
        sub_cenarios:
          - usa_tabela: classificacao_fidc (LP ou CP por PMR)
          - aplica_regressiva_pelo_prazo_desde_aplicacao
        retencao: na_fonte_pelo_administrador
    notas:
      - "Algumas FIDCs amortizam mais principal e menos juros nos primeiros pagamentos (similar a empréstimo Price)"
      - "App deve diferenciar amortização-principal vs amortização-rendimento — administradora informa"

  - id: E3_vencimento_do_fundo
    tipo: realizacao_terminal
    descricao: "FIDC com prazo determinado chega ao vencimento; liquidação"
    tratamento: trata_como_E2_resgate_total_pelo_valor_de_liquidacao
    sub_cenarios:
      - usa_tabela: classificacao_fidc
      - alíquota_complemento: pelo prazo total da aplicação

  - id: E5_come_cotas_pos_14754
    tipo: realizacao_periodica_automatica
    pre_condicoes:
      - data == "último dia útil de maio OU novembro"
      - "fundo NÃO é classificado como exceção (FIP qualificado / FIA qualificado)"
      - rendimento_acumulado_no_periodo > 0
    aliquota: 0.15 (LP) ou 0.20 (CP)
    retencao: amortizacao_compulsoria_de_cotas_pela_administradora
    notas:
      - "MUDANÇA-CHAVE DA LEI 14.754: FIDC agora tem come-cotas — antes era só na amortização"
      - "Fim do diferimento que existia até 2023"

  - id: E_evento_credito_subjacente
    tipo: evento_excepcional
    descricao: "Default de cedentes / mudança no perfil dos recebíveis"
    impacto: marcação_a_mercado_negativa
    tributacao_no_evento: nenhuma
    consequencia: rendimento_acumulado_no_periodo_diminui (afeta come-cotas seguinte)

  - id: E_secundario
    descricao: "Venda da cota em mercado secundário (raro em FIDC)"
    pre_condicoes: [secundario_existente]
    tributacao:
      sub_cenarios: [usa_tabela: classificacao_fidc]
      retencao: na_fonte_pelo_intermediario
```

---

## II. FIP — Fundo de Investimento em Participações

```yaml
classe: fip
referencia_legal: [in_cvm_578, lei_14754_2023, lei_11312_2006]
sub_tipos:
  - fip_qualificado  # IN CVM 578 art. 9-A: ≥ 90% em ativos qualificados
  - fip_nao_qualificado

# ============================================================================
# FIP QUALIFICADO — REGIME ESPECIAL MANTIDO PÓS-14.754
# ============================================================================

classe: fip_qualificado
caracteristica_distintiva: "≥ 90% em (ações, debêntures conversíveis, bônus de subscrição, etc.) de companhias fechadas com participação no processo decisório do gestor"

eventos:
  - id: E1_aplicacao
    captura: [data_aplicacao, qtde_cotas, valor_pago, compromisso_total_de_investimento]

  - id: E2_chamada_de_capital
    tipo: aporte_adicional
    descricao: "FIP chama capital previamente comprometido"
    tributacao: nenhuma
    impacto: adiciona_ao_custo_de_aquisicao_do_lote

  - id: E5_distribuicao_ou_amortizacao
    tipo: realizacao_periodica_OU_eventual
    descricao: "FIP qualificado distribui em momentos discretos (vendas de participadas)"
    sub_cenarios:
      - id: pf_residente_brasil
        aliquota: 0.15  # alíquota FIXA, especial para FIP qualificado
        nota: "ARESTA: FIP qualificado NÃO entra no regime regressivo nem no come-cotas"
      - id: pf_nao_residente
        aliquota: 0.00  # eventual isenção via tratado
        nota: "Verificar tratado país a país"
      - id: pj_qualificada
        aliquota: 0.15
    retencao: na_fonte_pelo_administrador
    base_calculo: valor_distribuido_proporcional_ao_lote (líquido de capital amortizado)

  - id: E5b_come_cotas
    aplica: FALSE
    nota: "FIP QUALIFICADO É ISENTO DE COME-COTAS — exceção mantida na Lei 14.754"

  - id: E3_venda_da_cota
    tipo: realizacao_no_secundario
    aliquota: 0.15
    retencao: na_fonte_ou_via_DARF

  - id: E_terminal_liquidacao
    descricao: "FIP encerra; distribui ativos ou valor de liquidação"
    tratamento: trata_como_E5_distribuicao_final
    sub_cenarios:
      - distribuicao_em_dinheiro: aplica_15_porcento
      - distribuicao_em_acoes_da_participada: "tema interpretativo — custo médio das ações recebidas = valor distribuído atribuído"

# ============================================================================
# FIP NÃO-QUALIFICADO
# ============================================================================

classe: fip_nao_qualificado
caracteristica: "Não atende os requisitos da IN CVM 578"
regime: como_fundo_fechado_padrao_pos_14754

eventos:
  - id: E5_come_cotas_pos_14754
    aplica: TRUE  # diferentemente do qualificado
    aliquota: 0.15 (LP) ou 0.20 (CP)
    retencao: amortizacao_compulsoria_de_cotas

  - id: E2_distribuicao
    sub_cenarios:
      - usa_tabela: regressiva_fundos_abertos (LP ou CP)
      - aplica_complemento_do_que_ainda_falta

notas:
  - "FIP NÃO-QUALIFICADO PERDEU o regime especial após Lei 14.754"
  - "Cliente com FIP precisa verificar qualificação CVM"
  - "App deve flagrar FIPs não-qualificados como 'come-cotas aplica'"
```

---

## III. FUNDO EXCLUSIVO

```yaml
classe: fundo_exclusivo
nome_canonico: "Fundo Exclusivo (ou Restrito) — geralmente 1 cotista ou poucos cotistas ligados"
referencia_legal: [in_cvm_555, lei_14754_2023]
definicao_caracteristica: "Fundo com poucos cotistas (frequentemente 1) que historicamente teve diferimento de 30+ anos para tributação"

mudanca_estrutural_lei_14754:
  antes: "Tributação só no resgate; podia-se segurar décadas sem pagar IR"
  depois: "Come-cotas semestral; fim do diferimento perpétuo"

eventos:
  - id: E1_aplicacao
    captura: idêntico aos outros fundos
    nota: "Frequentemente cotista único: dono do patrimônio aplicado"

  - id: E5_come_cotas
    aplica: TRUE  # NOVIDADE pós-14.754
    sub_cenarios:
      - usa: classificacao_cp_lp_padrao
    aliquota: 0.15 (LP) ou 0.20 (CP)
    retencao: amortizacao_compulsoria_cotas

  - id: E2_resgate
    sub_cenarios:
      - aplica_complemento_pela_regressiva_final
      - "Ganho remanescente = ganho_total - ir_já_retido_em_come_cotas_acumulado"

  - id: E_regime_estoque_pre_2024
    sub_cenarios:
      - id: cliente_optou_antecipacao_8_porcento
        condicao: "PF pagou 8% sobre estoque até dez/2024"
        tratamento: estoque_zerado_e_isento
      - id: cliente_nao_optou
        condicao: "Default — não optou"
        tratamento: |
          estoque_legado_tributa_pela_regressiva_quando_realizado
          PORÉM rendimento NOVO (pós-2024) sofre come-cotas semestral
          App tem que CONTABILIZAR SEPARADAMENTE o estoque legado vs o rendimento novo

notas_criticas:
  - "ARESTA-CRÍTICA: app precisa distinguir LOTE PRÉ-2024 do LOTE PÓS-2024 dentro do mesmo fundo exclusivo"
  - "Para cliente que NÃO optou pela antecipação dos 8%, esse split é obrigatório"
  - "Erro comum: tratar o fundo como um único bucket — gera tributação incorreta"
```

---

## IV. FIA FECHADO

```yaml
classe: fia_fechado
caracteristica: "Fundo de ações em formato fechado (raríssimo)"
referencia_legal: [in_rfb_1585_2015]

eventos:
  - id: E5_come_cotas
    aplica: FALSE  # FIA mantém isenção mesmo em formato fechado
    pre_condicao: "≥ 67% em ações qualificadas"
    nota: "Excepcionalidade: FIA não sofre come-cotas independente de aberto/fechado"

  - id: E2_resgate
    aliquota: 0.15  # fixa
    retencao: na_fonte
```

---

## V. FII-IE / FIP-IE (Fundos de Investimento em Infraestrutura)

```yaml
classe: fii_ie_ou_fip_ie
nome_canonico: "Fundo de Investimento em Participações em Infraestrutura"
referencia_legal: [lei_12431_2011_art_3]
caracteristica: "Investe em projetos qualificados de infraestrutura — gozam de benefício fiscal análogo à debênture incentivada"

tributacao_pf:
  rendimentos_distribuidos: ISENTO  # PF residente
  ganho_de_capital_na_cota: ISENTO  # PF residente
  pj_residente: 15%  # alíquota reduzida

requisitos_para_manter_beneficio:
  - investimento_qualificado_em_infra (energia, transporte, saneamento)
  - prazo_minimo_de_carteira
  - ≥ 95% em ativos qualificados Lei 12.431

eventos:
  - id: E5_distribuicao
    pf: isenta
    pj: 15% retido na fonte

  - id: E2_venda_no_secundario
    pf: isenta
    pj: 15%

  - id: E_perda_qualificacao
    consequencia: tributacao_retroativa
    nota: "Aresta: se projeto perde qualificação, há risco de retributação — verificar regulamento"
```

---

## VI. EVENTOS TRANSVERSAIS

### VI.1 Regra de transição pós-14.754 — antecipação dos 8%

```yaml
regra: antecipacao_estoque_8_porcento
referencia_legal: [lei_14754_2023_disposicoes_transitorias, in_rfb_2166_2023]
prazo: ate_31_12_2024  # PASSADO
elegivel: ["fundos_fechados_existentes_em_31_12_2023"]

mecanica:
  - PF avaliava o rendimento acumulado da posição até 31/12/2023
  - Aplicava 8% sobre esse valor
  - Pagava em dezembro/2023 OU em 24 parcelas mensais ao longo de 2024
  - Estoque ficava "lavado" — tributação futura aplicava-se só sobre rendimento NOVO

implicacao_app:
  - "Cada fundo fechado tem uma flag 'optou_antecipacao_8' por cliente"
  - "App tem que registrar o valor do estoque em 31/12/2023 (input do cliente)"
  - "Para quem optou: tratamento simplificado, fundo zerado fiscalmente"
  - "Para quem não optou: split obrigatório — estoque velho × rendimento novo"

aresta_2026:
  - "Em 2026, a janela já fechou. Sistema só lê o histórico — não permite mais optar"
  - "Mas auditoria 2024-2025 ainda é possível — alguns processos estão em discussão judicial"
```

### VI.2 Matriz de compensação de prejuízos (fundos fechados)

```yaml
matriz_compensacao_fundos_fechados:
  fidc_lp_com_fidc_lp: SIM
  fidc_cp_com_fidc_cp: SIM
  fidc_lp_com_fidc_cp: NAO  # categorias separadas
  fidc_com_fundo_aberto_lp: NAO  # mercados separados
  fidc_com_fundo_aberto_cp: NAO
  fip_qualificado_com_fip_qualificado: SIM
  fip_qualificado_com_fip_nao_qualificado: NAO  # regimes diferentes
  fip_nao_qualificado_com_fundo_aberto: NAO
  fundo_exclusivo_com_fundo_aberto: SIM se mesma classificação CP/LP  # interpretação
  fia_fechado_com_fia_aberto: SIM  # mesma natureza
  fii_ie_com_outros: NAO  # regime de isenção, sem prejuízo a compensar
```

### VI.3 Aresta: come-cotas em fundo recém-aplicado

Cliente aplica em fundo fechado em 15 de maio. Come-cotas é em 31 de maio. Período de 16 dias — rendimento minúsculo. App calcula corretamente: come-cotas sobre rendimento DESDE A APLICAÇÃO, não desde início do semestre. Se rendimento negativo (raro): zero retenção, sem acumular prejuízo.

### VI.4 Aresta: liquidação parcial e distribuição em ativos

Alguns FIPs em fase final liquidam vendendo ações de participadas e distribuem em dinheiro. Outros distribuem AS PRÓPRIAS AÇÕES diretamente aos cotistas (distribuição "in kind"). Tratamento:

- **Em dinheiro**: aplica regra de E5_distribuicao normal (15% se qualificado)
- **Em ações**: interpretativo. Posição prudente: trata como venda das cotas FIP pelo valor de mercado das ações distribuídas + aquisição dessas ações por esse mesmo valor. Custo médio nas ações = valor recebido. Tributação na venda FIP pelo regime do FIP.

Verificar IN específica antes de produção.

### VI.5 Aresta: FIP que muda de qualificação ao longo do tempo

FIP pode entrar e sair de qualificação CVM 578 conforme composição. Implicação: o regime tributário aplicável MUDA prospectivamente. App deve rastrear histórico de qualificação por data.

### VI.6 Aresta: capital chamado vs comprometido

Cliente compromete R$ 1 milhão em FIP, mas só aporta R$ 200 mil de início (resto vai sendo chamado). Tributação trata só o efetivamente APORTADO. O compromisso futuro é off-balance fiscalmente até a chamada. Mas é input importante pra projeção de fluxo.

### VI.7 Aresta: revendas no secundário e marcação

FIDC e FIP têm secundário fraco. Quando há, marcação a mercado é uma estimativa. Tributação só nasce na realização efetiva, mas app deve mostrar marca-a-mercado para painel de patrimônio.

### VI.8 Aresta: classes de cotas (senior, subordinada mezzanine, subordinada júnior)

FIDC pode ter múltiplas classes com prioridades diferentes. Cotistas de classes diferentes têm fluxos de caixa diferentes. App deve modelar classe da cota como atributo do lote.

---

## VII. LACUNAS CONHECIDAS

1. **FIDC com cotas-mezzanine** — alguns têm comportamento híbrido entre senior e subordinada; classificação CP/LP pode mudar
2. **Tributação de distribuição em ativos** — confirmar IN específica RFB
3. **Fundo Exclusivo com múltiplos cotistas (PJ + PF)** — interação entre regimes
4. **FIP-IE em fase pré-operacional** — quando projeto ainda não está rendendo
5. **Cisão de FIDC ou FIP** — tratamento da continuidade fiscal
6. **Resgate antecipado em FIP fechado** — regulamento define; quando há, regime específico
7. **Cliente PJ residente que detém cotas de fundo fechado** — capítulo próprio
8. **Fundo Exclusivo com estrutura no exterior (offshore vinculada)** — interage com Lei 14.754
9. **Conversão entre classes de cotas no mesmo fundo** — tema interpretativo

---

## VIII. CHECKLIST PARA REVISÃO DO TRIBUTARISTA

- [ ] FIDC: come-cotas pós-14.754 ativado, classificação CP/LP por PMR
- [ ] FIP qualificado: exceção mantida (15% só na distribuição, sem come-cotas)
- [ ] FIP não-qualificado: regime padrão pós-14.754 (come-cotas aplica)
- [ ] Fundo exclusivo: come-cotas ativada, split estoque vs rendimento novo se não optou antecipação
- [ ] FIA fechado: isento de come-cotas
- [ ] FII-IE/FIP-IE: isenção PF, alíquota reduzida PJ
- [ ] Distribuição em ativos: tratamento interpretativo
- [ ] Regra de transição (8%): histórico imutável, decisão já tomada
- [ ] Matriz de compensação isolada por categoria
- [ ] Capital chamado vs comprometido tratado separadamente
- [ ] Classes de cotas (senior/subordinada) como atributo do lote

---

*Próximos capítulos: Veículos como estrutura (PJ Lucro Real/Presumido, Holding patrimonial, Offshore opaca/transparente, Trust), Camada de consolidação transversal.*
