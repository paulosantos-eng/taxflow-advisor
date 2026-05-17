# MGT — Matriz de Granularidade Tributária | Fundos Abertos com Come-Cotas

**Versão:** 0.1 (rascunho de trabalho — para revisão de tributarista antes de virar config de produção)
**Vigência:** 01/01/2026
**Escopo:** Fundos de investimento abertos negociados no Brasil — Multimercado, Renda Fixa, Ações (FIA), Cambial, FoF abertos. Sob regime de come-cotas semestral (maio/novembro).
**Formato:** declarativo (YAML-ish), pronto para virar config do tax engine

---

## 0. Glossário (extensão às MGTs anteriores)

| Variável | Significado |
|----------|-------------|
| `tipo_fundo_aberto` | multimercado / rf_lp / rf_cp / acoes_fia / cambial / fof_aberto |
| `classificacao_cp_lp` | curto_prazo (CP) se PMR carteira ≤ 365d; longo_prazo (LP) se > 365d |
| `pmr_carteira` | Prazo Médio Ponderado dos ativos do fundo (em dias) |
| `data_corte_come_cotas` | último dia útil de maio OU novembro |
| `aliquota_come_cotas` | 15% para LP, 20% para CP (alíquota MENOR da classe) |
| `aliquota_complemento_resgate` | diferença entre regressiva final e o já retido em come-cotas |
| `e_fia_qualificado` | true se ≥ 67% em ações qualificadas (B3 lista, BDR nível 3, etc.) |
| `cotas_recolhidas_come_cotas` | qtde de cotas amortizadas a cada come-cotas para pagar IR |

---

## 0.1 Tabela regressiva no resgate (fundos abertos)

```yaml
tabela: regressiva_fundos_abertos
referencia_legal: [lei_11033_2004, in_rfb_1585_2015]

# Para fundos LONGO PRAZO (PMR > 365d)
longo_prazo:
  - condicao: "dias_desde_aplicacao <= 180"
    aliquota: 0.225
  - condicao: "180 < dias_desde_aplicacao <= 360"
    aliquota: 0.20
  - condicao: "360 < dias_desde_aplicacao <= 720"
    aliquota: 0.175
  - condicao: "dias_desde_aplicacao > 720"
    aliquota: 0.15

# Para fundos CURTO PRAZO (PMR ≤ 365d)
curto_prazo:
  - condicao: "dias_desde_aplicacao <= 180"
    aliquota: 0.225
  - condicao: "dias_desde_aplicacao > 180"
    aliquota: 0.20

notas:
  - "Classificação CP/LP é DO FUNDO (pelo PMR da carteira), não do cotista"
  - "Mudança de PMR no fundo pode mudar classificação ao longo do tempo"
  - "Cotista vê alíquota efetiva = pelo prazo desde a aplicação dele, pela tabela do fundo"
```

---

## 0.2 Tabela de come-cotas semestral

```yaml
tabela: come_cotas_semestral
referencia_legal: [lei_10892_2004, in_rfb_1585_2015]

datas: [ultimo_dia_util_maio, ultimo_dia_util_novembro]
base: rendimento_acumulado_no_periodo_por_cota

aliquota_aplicada:
  - tipo: longo_prazo
    aliquota: 0.15  # menor alíquota da classe LP
  - tipo: curto_prazo
    aliquota: 0.20  # menor alíquota da classe CP

mecanica:
  formato: amortizacao_compulsoria_de_cotas
  descricao: |
    O administrador do fundo CALCULA o IR devido sobre o rendimento desde a última
    come-cotas (ou desde a aplicação, se primeira), e RESGATA cotas no valor do IR.
    Cotista vê redução do número de cotas, com NAV mantido.
  output_cotista:
    - reducao_qtde_cotas
    - sem_movimentacao_de_caixa

isento_de_come_cotas:
  - fia_qualificado (≥ 67% em ações)
  - fundos_offshore (regem-se pela Lei 14.754)
  - fundos_fechados (regem-se por capítulo próprio - ver MGT_fundos_fechados.md)

notas:
  - "Come-cotas APENAS sobre rendimento positivo no período"
  - "Se prejuízo no semestre: zero retenção, sem acumular prejuízo nesse momento"
  - "No resgate, aplica-se complemento = alíquota_regressiva_final - alíquota_come_cotas_já_paga"
```

---

## I. FUNDOS MULTIMERCADO

```yaml
classe: fundo_multimercado_aberto
nome_canonico: "Fundo Multimercado aberto"
classificacao_padrao: longo_prazo  # maioria; CP minoria
referencia_legal: [in_cvm_555, in_rfb_1585_2015, lei_10892_2004]

eventos:
  - id: E1_aplicacao
    tipo: aquisicao
    tributacao: nenhuma
    impacto:
      tipo: registrar_lote
      formula: |
        novo_lote = {
          data: data_aplicacao,
          valor_aplicado: valor,
          cotas_adquiridas: valor / valor_cota_dia,
          rendimento_acumulado_periodo: 0
        }
    captura: [data_aplicacao, valor_aplicado, valor_cota_dia, qtde_cotas, classificacao_cp_lp_no_momento]

  - id: E2_resgate_total_ou_parcial
    tipo: realizacao
    pre_condicoes: [posicao_em_carteira > 0]
    sub_cenarios:
      - usa_tabela: regressiva_fundos_abertos (LP ou CP conforme classificação)
    base_calculo: |
      ganho_total = (valor_resgate - custo_aplicacao_lote)
      ganho_residual = ganho_total - ir_ja_retido_em_come_cotas_do_lote
    tributacao:
      formula: "complemento = ganho_residual * (aliquota_regressiva_final - aliquota_menor_da_classe)"
      retencao: na_fonte_pelo_administrador
    output: [valor_liquido_resgatado, ir_complemento, ir_total_pago]
    captura: [data_resgate, qtde_cotas_resgatadas, valor_resgate, ir_retido]
    notas:
      - "Resgate FIFO por padrão (primeiro lote aplicado é primeiro resgatado)"
      - "IR já retido em come-cotas REDUZ o complemento — auditoria precisa rastrear por lote"

  - id: E5_come_cotas_maio
    tipo: realizacao_periodica_automatica
    pre_condicoes:
      - data == "último dia útil de maio"
      - cotista_tem_posicao_no_fundo
      - rendimento_acumulado_no_periodo > 0
    base_calculo: rendimento_acumulado_desde_ultima_come_cotas_ou_aplicacao
    tributacao:
      aliquota: 0.15 (LP) ou 0.20 (CP)
      retencao: na_fonte_pela_administradora_via_amortizacao_compulsoria_de_cotas
    output: [reducao_qtde_cotas, ir_retido_acumulado]
    captura: [data_come_cotas, rendimento_periodo, cotas_amortizadas, ir_retido]
    notas:
      - "Cotista NÃO recebe dinheiro — vê redução do número de cotas"
      - "Valor da cota permanece igual no dia"
      - "Se cotista aplicou em 10/maio, no come-cotas de maio NÃO há retenção (período < 30d em geral)"

  - id: E5b_come_cotas_novembro
    descricao: idêntica a E5_come_cotas_maio mas em novembro

  - id: E4_marcacao
    tipo: estado
    tributacao: nenhuma
    output: passivo_latente
    captura: [data_snapshot, valor_cota_dia, valor_posicao, rendimento_acumulado_no_periodo_atual]

  - id: E6_conversao_para_outro_fundo_do_mesmo_administrador
    descricao: "Cotista transfere recursos para outro fundo da mesma família (raro)"
    tributacao: depende_da_estrutura  # geralmente é fato gerador (resgate + nova aplicação)
    notas: ["Conferir caso a caso; alguns produtos têm cláusulas que permitem migração sem FG"]

  - id: E7_mudanca_de_classificacao_cp_lp
    descricao: "Fundo muda PMR e migra de CP para LP (ou vice-versa)"
    tributacao_no_momento: nenhuma
    impacto_futuro: alíquota_aplicável_muda_a_partir_dali
    notas: ["Verificar fato relevante / aviso de mudança de regulamento"]
```

---

## II. FUNDOS DE RENDA FIXA (RF Longo Prazo e Curto Prazo)

```yaml
classe: fundo_rf_aberto
sub_tipos:
  - rf_longo_prazo  # PMR > 365d
  - rf_curto_prazo  # PMR ≤ 365d
  - cambial  # tratado como CP
  - di  # cotidianamente LP (mas verificar PMR efetivo)
  - referenciado  # idem

eventos:
  - mesma_estrutura_que: fundo_multimercado_aberto
  - particularidades_rf:
      - "Carteira é PURAMENTE renda fixa (CDB, debêntures, títulos públicos)"
      - "Maioria dos DI / Selic é LP — PMR > 365d porque investe em LFT e congêneres"
      - "Cambial é sempre CP — ativos curtos para hedge"

notas:
  - "Aresta: fundos 'DI' coloquialmente chamados de baixa volatilidade — mas ainda são LP fiscalmente, com 15% LP"
  - "Conferir lâmina do fundo para classificação real"
```

---

## III. FIA — FUNDOS DE INVESTIMENTO EM AÇÕES

```yaml
classe: fia_aberto
nome_canonico: "Fundo de Investimento em Ações (aberto)"
referencia_legal: [lei_11033_2004, in_rfb_1585_2015_art_72]
caracteristica_distintiva: "≥ 67% em ações negociadas em bolsa ou mercado de balcão organizado"
e_qualificado: depende_da_composicao

eventos:
  - id: E1_aplicacao
    captura: idêntica aos outros fundos abertos

  - id: E2_resgate
    sub_cenarios:
      - id: fia_qualificado
        aliquota: 0.15  # fixa
        nota: "NÃO aplica tabela regressiva (diferente de outros fundos)"
      - id: fia_perde_qualificacao
        condicao: "composição cai abaixo de 67% em ações qualificadas"
        tratamento: "passa a ser tratado como fundo multimercado LP com regressiva"

  - id: E5_come_cotas
    aplica: FALSE
    nota: "FIA QUALIFICADO É ISENTO DE COME-COTAS. Tributação 100% no resgate"

  - id: E4_marcacao
    output: passivo_latente
    nota: "Carrego pode ser grande porque tributação só vem no resgate"
```

---

## IV. FUNDOS CAMBIAIS

```yaml
classe: fundo_cambial_aberto
classificacao_padrao: curto_prazo
referencia_legal: [in_rfb_1585_2015]

eventos:
  - mesma_estrutura_que: fundo_multimercado_aberto
  - particularidade:
      - "Sempre CP — alíquota mínima 20% (com complemento até 22,5% se < 180d)"
      - "Come-cotas com alíquota 20%"
```

---

## V. FOF — FUNDOS DE FUNDOS ABERTOS

```yaml
classe: fof_aberto
descricao: "Fundo que investe em cotas de outros fundos"
tributacao:
  no_nivel_FoF: pela_classificacao_do_FoF (CP/LP/FIA)
  no_nivel_dos_fundos_subjacentes: cada um tem seu regime, mas isso é INTERNO ao FoF
  para_o_cotista_PF: somente o regime do FoF importa

notas:
  - "Cotista PF não 'enxerga' através do FoF"
  - "FoF que investe em FIA mas não cumpre os 67% próprios: vira multimercado/RF, perde isenção de come-cotas"
```

---

## VI. EVENTOS TRANSVERSAIS

### VI.1 Compensação de prejuízos em fundos abertos

```yaml
regra: compensacao_prejuizos_fundos_abertos
matriz:
  prejuizo_de_fundo_X_com_ganho_de_fundo_X: SIM (mesmo CNPJ, mesma classificação)
  prejuizo_lp_com_ganho_lp_diferentes_fundos: SIM
  prejuizo_cp_com_ganho_cp_diferentes_fundos: SIM
  prejuizo_lp_com_ganho_cp: NAO
  prejuizo_fundo_aberto_com_ganho_rv_a_vista: NAO
  prejuizo_fia_aberto_com_ganho_acao: NAO  # FIA tem regime próprio
  prejuizo_fundo_aberto_com_rendimento_RF_tributada: NAO

prazo: sem_prazo  # acumula indefinidamente

implicacao_para_engine:
  - "App tem que manter saldos de prejuízo separados por (classificação, mesma família ou não)"
  - "Aresta: alguns administradores fazem 'sub-baldes' por sub-classe (RF vs Multimercado), conservador"
```

### VI.2 Aplicação automática (varredura saldo conta corrente)

```yaml
caso_de_uso: aplicacao_automatica
descricao: "Banco aplica saldo livre da conta corrente em fundo DI no fim do dia"
tratamento:
  - "Cada D+1 é nova aplicação (novo lote)"
  - "Cada D+1 é resgate parcial do lote do dia anterior"
  - "Gera centenas de lotes; rastreamento por data de aplicação é essencial"
notas:
  - "ARESTA OPERACIONAL: app deve agregar aplicações/resgates de varredura em um único lote 'flutuante'"
  - "Senão a apuração fica absurda computacionalmente"
```

### VI.3 Aresta: mudança de regulamento que altera classificação CP/LP

Fundo pode mudar sua composição ao longo do tempo. Se um multimercado LP recebe novos aportes do gestor em ativos curtos, o PMR pode baixar e mudar a classificação para CP. O efeito é prospectivo — alíquotas no resgate passam a usar a tabela CP, mas o come-cotas anterior já foi pago à alíquota LP. App deve rastrear histórico de classificação.

### VI.4 Aresta: fundos antigos com benefício fiscal

Fundos PIBB e similares (raros, históricos): alguns ainda têm regime especial com isenção total para PF se mantiver por X anos. Verificar regulamento do fundo. App deve permitir flag "regime_legado_isencao" por fundo.

### VI.5 Aresta: fundos imobiliários abertos (?)

A maioria absoluta dos FIIs é FECHADA (já coberta em MGT_fii_fiagro.md). Existem FIIs abertos raríssimos — verificar regulamento individual; geralmente seguem regime de FII (isenção mensal PF) e não regime de fundo aberto.

### VI.6 Resgate em conversão D+0 / D+30 / D+360

Fundos têm prazo de conversão (D+0, D+1, D+30, D+60, D+90 ou mais para alguns alternativos). O FG é na data da CONVERSÃO, não na data do pedido de resgate. App deve rastrear pedidos pendentes.

---

## VII. LACUNAS CONHECIDAS

1. **Fundos com classes de cotas distintas** (Classe A com taxa de adm, Classe B sem) — tratamento da migração entre classes
2. **Fundos credit/private em formato aberto** — alguns possuem estruturas híbridas
3. **Fundos com prazo de carência** — interação entre prazo de carência e tabela regressiva
4. **Fundos previdenciários (PGBL/VGBL)** — regime totalmente diferente (regressivo definitivo OU progressivo), capítulo próprio merecido
5. **Resgate em data específica fixa (fundos com prazo de saída anual)** — eventos automáticos
6. **Conversão "in kind"** — fundo entrega ativos em vez de dinheiro no resgate (raro)
7. **Fundos espelhos** (master-feeder) — quem aplica é o feeder; tratamento da carteira do master

---

## VIII. CHECKLIST PARA REVISÃO DO TRIBUTARISTA

- [ ] Tabela regressiva LP vs CP corretamente aplicada por classificação
- [ ] Come-cotas semestral em maio e novembro com alíquota mínima da classe
- [ ] FIA qualificado isento de come-cotas (verificação dos 67%)
- [ ] Mecânica de amortização compulsória de cotas no come-cotas
- [ ] Complemento no resgate calculado certo (diferença entre regressiva final e alíquota já paga)
- [ ] Compensação de prejuízos com matriz de cruzamento clara
- [ ] Aplicação automática como caso especial (varredura saldo conta corrente)
- [ ] Fundos cambiais sempre como CP
- [ ] Mudança prospectiva quando classificação CP/LP altera

---

*Próximos capítulos: Fundos Fechados pós-Lei 14.754 (FIDC/FIP/exclusivos/FIA fechado), Veículos como estrutura, Camada de consolidação transversal.*
