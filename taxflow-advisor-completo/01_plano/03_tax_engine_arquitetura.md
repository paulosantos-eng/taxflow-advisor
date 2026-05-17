# Tax Engine — Arquitetura e Decisões

**Produto:** TaxFlow Advisor
**Componente:** Tax Engine (núcleo de cálculo)
**Stack:** Python 3.11+, Pydantic v2, YAML/JSON para regras, PostgreSQL para persistência (fora do PoC)
**Estado:** PoC para demo investidor + spec executiva para dev senior implementar

---

## 1. Princípios

**1. Função pura, idempotente.** Toda apuração é função de `(operações, regras_vigentes, data_evento)`. Mesma entrada → mesma saída. Reapurar mil vezes dá o mesmo número.

**2. Regras como dados, não código.** A MGT vive em YAML. Mudança de IN da Receita = pull request no arquivo de regras, não release de software.

**3. Versionado por vigência temporal.** Cada regra tem `vigencia_inicio` e `vigencia_fim`. Lei 14.754 vigora a partir de 01/2024; Lei 15.270 a partir de 01/2026. Engine sempre escolhe a versão de regra aplicável à data do evento.

**4. Event-driven, não snapshot-based.** O estado da carteira é DERIVADO dos eventos. Comprou → evento. Vendeu → evento. Dividendo recebido → evento. Custo médio, posição, prejuízo acumulado são todos resultados, nunca insumos.

**5. Apuração separada de projeção.** "IR devido" (fato consumado) e "IR projetado" (passivo latente + simulação) usam o mesmo engine mas em modos diferentes. Não duplicar lógica.

**6. Auditabilidade nativa.** Cada número de saída referencia os eventos que o originaram. Trail completo do "por quê esse número" sem trabalho adicional.

**7. Multi-veículo desde o esqueleto.** Apuração é por (cliente, veículo, mês/ano). Cliente é container; cálculos são por veículo.

---

## 2. Visão de alto nível

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INPUTS                                          │
│                                                                          │
│  ┌─ Operações ─┐  ┌─ Catálogo ativos ─┐  ┌─ Regras (YAML) ─┐            │
│  │ compra      │  │ classe            │  │ tabela_regr.   │            │
│  │ venda       │  │ atributos fiscais │  │ tabela_iof_30d │            │
│  │ dividendo   │  │ ISIN, ticker      │  │ tabela_irpfm   │            │
│  │ cupom       │  │ requisitos isenç. │  │ regras_classe  │            │
│  │ amortização │  └───────────────────┘  └────────────────┘            │
│  │ corporate   │                                                         │
│  └─────────────┘                                                         │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          ENGINE                                          │
│                                                                          │
│  ┌─ Loader ──┐  ┌─ Dispatcher ──┐  ┌─ Evaluator ─┐  ┌─ Aggregator ─┐    │
│  │ YAML → AST │→│ evento→regra  │→│ aplica regra │→│ consolida    │   │
│  │            │  │ (por classe)  │  │ (sub-cenár.) │  │ (mês, ano)   │   │
│  └────────────┘  └───────────────┘  └──────────────┘  └──────────────┘  │
│                                                                          │
│  ┌─ Compensador ─┐  ┌─ Projetor ─┐  ┌─ Detector ──┐                     │
│  │ prejuízos por │  │ passivo    │  │ gatilhos    │                     │
│  │ categoria     │  │ latente    │  │ (R$ 50k,    │                     │
│  │ saldo running │  │ what-if    │  │ R$ 20k,...) │                     │
│  └───────────────┘  └────────────┘  └─────────────┘                     │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          OUTPUTS                                         │
│                                                                          │
│  ┌─ Apuração ──┐  ┌─ DARFs ─┐  ┌─ Calendário ─┐  ┌─ Oportunidades ─┐    │
│  │ por mês     │  │ valores │  │ eventos      │  │ harvesting      │   │
│  │ por ano     │  │ códigos │  │ futuros      │  │ janela R$ 20k   │   │
│  │ por classe  │  │ vencim. │  │ projetados   │  │ timing distrib. │   │
│  └─────────────┘  └─────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de dados

```python
# Esqueleto Pydantic — versão completa em tax_engine_poc.py

class Cliente(BaseModel):
    id: UUID
    cpf: str
    residencia_fiscal: str  # ISO
    veiculos: list[Veiculo]

class Veiculo(BaseModel):
    id: UUID
    cliente_id: UUID
    tipo: Literal["PF", "PJ_LR", "PJ_LP", "PJ_Simples",
                  "Holding", "Offshore_Opaca", "Offshore_Transparente", "Trust"]
    pais_domicilio: str
    regime_aplicavel: str

class Ativo(BaseModel):
    id: UUID
    classe: Literal["acao_br", "etf_rv_br", "etf_rf_br", "fii", "fiagro_fii",
                    "fiagro_fidc", "fiagro_fip", "tesouro_selic", "tesouro_pre",
                    "tesouro_ipca", "cdb", "debenture_comum", "lci", "lca",
                    "stock_exterior", "etf_exterior", "reit_exterior",
                    "bond_exterior", "cripto_br", "cripto_exterior", ...]
    ticker: str | None
    isin: str | None
    atributos_fiscais: dict  # depende da classe (ex.: FII tem requisitos_isencao)

class Operacao(BaseModel):
    id: UUID
    veiculo_id: UUID
    ativo_id: UUID
    tipo: TipoOperacao  # enum exaustivo: compra, venda, dividendo, jcp, cupom...
    data: date
    quantidade: Decimal
    preco_unitario: Decimal
    valor_total: Decimal
    moeda: str  # BRL, USD, EUR...
    taxa_cambio_ptax: Decimal | None
    custos: Decimal  # corretagem + emolumentos
    origem: Literal["csv", "manual", "api"]
    documento_id: UUID | None  # rastreabilidade até nota PDF

class Apuracao(BaseModel):
    veiculo_id: UUID
    ano: int
    mes: int | None  # None = anual
    classe: str | None  # None = consolidado
    ganho_bruto: Decimal
    prejuizo_consumido: Decimal
    base_tributavel: Decimal
    aliquota_aplicada: Decimal
    ir_devido: Decimal
    irrf_creditavel: Decimal
    ir_a_pagar: Decimal  # após créditos
    eventos_referenciados: list[UUID]  # rastreabilidade
```

---

## 4. Regras como dados — formato declarativo

### 4.1 Estrutura de um arquivo de regras

```yaml
# tax_engine/regras/rv_br.yaml

classe: acao_br
versao_inicio: 1995-01-01
versao_fim: null  # vigente

constantes:
  isencao_swing_acoes_mes: 20000.00
  dedo_duro_swing: 0.00005
  dedo_duro_day: 0.01
  threshold_minimo_dedo_duro: 1.00

eventos:
  - id: E1_compra
    tipo: aquisicao
    tributacao: nenhuma
    impacto:
      tipo: atualizar_custo_medio
      formula: |
        novo_custo_medio = (
          custo_medio_atual * qtde_atual
          + valor_compra + custos
        ) / (qtde_atual + qtde_comprada)

  - id: E2_venda_swing
    tipo: realizacao
    pre_condicoes:
      - qtde_em_carteira > 0
      - compra_e_venda_em_pregoes_diferentes
    sub_cenarios:
      - id: isenta
        condicao: total_vendas_swing_acoes_mes <= 20000
        aliquota: 0.0
      - id: tributada
        condicao: total_vendas_swing_acoes_mes > 20000
        aliquota: 0.15
    base_calculo:
      formula: ganho_liquido_mes - prejuizos_swing_acumulados
    tributacao:
      formula: max(0, base) * aliquota
      retencao: dedo_duro_swing
      apuracao: mensal_via_DARF_6015

  # ... E2b_venda_day, E4_marcacao, EC1..EC8 (corporativos)
```

### 4.2 Carregamento e validação

```python
from yaml import safe_load
from pydantic import BaseModel

class RegraEvento(BaseModel):
    id: str
    tipo: str
    pre_condicoes: list[str] = []
    sub_cenarios: list[SubCenario] = []
    base_calculo: BaseCalculo
    tributacao: Tributacao
    impacto: Impacto | None = None

class RegraClasse(BaseModel):
    classe: str
    versao_inicio: date
    versao_fim: date | None
    constantes: dict
    eventos: list[RegraEvento]

def load_regras(path: Path) -> dict[str, list[RegraClasse]]:
    """Carrega todos os YAMLs e agrupa por classe.
    Permite múltiplas versões por classe (histórico)."""
    ...
```

### 4.3 Avaliação de condições (mini-DSL)

Condições nos YAMLs são expressões simples. Avaliamos com namespace controlado:

```python
def avaliar_condicao(expr: str, contexto: dict) -> bool:
    """Avalia 'total_vendas_swing_acoes_mes > 20000' contra o contexto."""
    # Sandbox: só permite operadores e variáveis do contexto
    return eval(expr, {"__builtins__": {}}, contexto)
```

Para produção: substituir `eval` por parser de DSL próprio (já vem pronto em libs como `simpleeval` ou parser custom — mas para PoC, `eval` com sandbox é suficiente).

---

## 5. Fluxo de processamento de evento

```
1. Recebe operação (ex.: venda de PETR4 200 cotas a R$ 28,00)
                            ↓
2. Dispatcher identifica:   classe = "acao_br"
                            evento = E2_venda_swing
                            data = 15/mai/2026
                            regra_aplicavel = vigência_2026_padrao
                            ↓
3. Carrega contexto:        custo_medio_atual_PETR4 = R$ 26,50
                            qtde_atual = 1500
                            total_vendas_swing_acoes_mes_anteriores = R$ 0
                            prejuizos_swing_acumulados = R$ 1.200
                            ↓
4. Avalia pré-condições:    qtde_em_carteira > 0  ✓
                            mesmo_pregao? não → swing ✓
                            ↓
5. Calcula derivados:       total_vendas_swing_acoes_mes_apos = R$ 5.600
                            ganho_op = (28,00 - 26,50) × 200 = R$ 300
                            ↓
6. Avalia sub-cenários:     5600 <= 20000 → isenta (alíquota 0%)
                            ↓
7. Aplica regra:            base = 300
                            ir_devido = 0
                            ↓
8. Atualiza estado:         qtde_atual_PETR4 → 1300
                            total_vendas_swing_acoes_mes → R$ 5.600
                            registra evento de saída
                            ↓
9. Persiste apuração:       Apuracao(veiculo, 2026, mai, classe="acao_br",
                              ganho_bruto=300, ir_devido=0, ...)
                            ↓
10. Verifica gatilhos:      janela_20k_consumida = 28%
                            sem alerta agora
```

---

## 6. Camadas de flexibilidade (A + C + B simplificado)

**Camada A — Regras core (config declarativa, versionada):** vivem em `tax_engine/regras/*.yaml`. Editáveis sem deploy. Cada arquivo tem `versao_inicio`/`versao_fim`. Engine carrega o arquivo cuja vigência cobre a data do evento.

**Camada B — Overlays por cliente (override manual no PoC):** cada `Apuracao` pode ter campo opcional `override_consultor` com valor + justificativa + assinatura digital. Engine respeita override mas marca como "ajuste manual" para auditoria.

**Camada C — Cenários what-if (simulação pura):** simulador cria `ContextoSimulacao` com operações hipotéticas; engine roda contra esse contexto sem persistir. Saída tem flag `is_simulation=True`. Engine é o mesmo — diferença está só no estado de entrada.

```python
def apurar(contexto: ContextoApuracao, modo: Literal["real", "simulacao", "projecao"]) -> ResultadoApuracao:
    # mesmo engine, três modos
    ...
```

---

## 7. Estrutura de pastas (projeto completo)

```
tax_engine/
├── __init__.py
├── models/
│   ├── __init__.py
│   ├── cliente.py
│   ├── ativo.py
│   ├── operacao.py
│   ├── evento.py
│   ├── apuracao.py
│   └── enums.py
├── regras/
│   ├── rv_br.yaml
│   ├── fii_fiagro.yaml
│   ├── rf_tributada.yaml
│   ├── rf_isenta.yaml
│   ├── etf_br.yaml
│   ├── etf_exterior.yaml
│   ├── exterior_lei_14754.yaml
│   ├── fundos_abertos.yaml
│   ├── fundos_fechados.yaml
│   ├── dividendos_jcp.yaml
│   ├── irpfm_lei_15270.yaml
│   ├── veiculos.yaml
│   └── tabelas/
│       ├── regressiva_ir.yaml
│       ├── iof_30d.yaml
│       ├── progressiva_irpf.yaml
│       └── irpfm.yaml
├── engine/
│   ├── loader.py        # carrega YAML → AST
│   ├── dispatcher.py    # evento → regra
│   ├── evaluator.py     # avalia condições e fórmulas
│   ├── aggregator.py    # consolida apurações
│   ├── compensador.py   # prejuízos por categoria
│   ├── projetor.py      # passivo latente + what-if
│   └── detector.py      # alertas (gatilhos)
├── outputs/
│   ├── darf.py
│   ├── calendario_fiscal.py
│   ├── oportunidades.py
│   └── relatorio_executivo.py
├── importers/
│   ├── csv_xp.py
│   ├── csv_btg.py
│   ├── csv_avenue.py
│   ├── csv_b3.py
│   └── manual.py
└── tests/
    ├── golden/
    │   ├── caso_joao_2026.json       # input
    │   ├── caso_joao_2026_esperado.json  # output esperado
    │   └── ...
    ├── test_rv_br.py
    ├── test_fii.py
    ├── test_irpfm.py
    └── test_integration.py
```

---

## 8. Padrão de extensão — adicionando nova classe

Quando aparecer uma nova classe (ex.: tokens RWA, criptos staking, etc.), o caminho é:

1. **Adicionar classe ao enum** (`models/enums.py`)
2. **Criar YAML em `regras/`** com a estrutura padrão (constantes + eventos)
3. **Adicionar atributos_fiscais necessários** na model `Ativo` (se for específico)
4. **Implementar handler em `engine/dispatcher.py`** SE houver lógica não declarativa (raro)
5. **Adicionar golden file de teste** com 5-10 cenários da classe
6. **Submeter ao tributarista parceiro** para revisão antes de produção

Quem desenvolver consegue adicionar uma nova classe em 1-2 dias se a regra for declarativa.

---

## 9. Performance e escalabilidade

**PoC (em memória):** roda 1 cliente com ano fiscal completo (~200 eventos) em < 100ms.

**Produção (1 escritório, 100 clientes):** apurar todos os clientes de um mês = ~5-10 segundos. Aceitável.

**Produção (10k clientes):** precisa de jobs assíncronos + cache + paralelização. Roadmap V2.

**Estratégia para escalar:**
- Engine puro (sem I/O dentro do hot path) → fácil paralelizar
- Cache de apurações finalizadas (mês fechado → imutável)
- Recálculo só de meses afetados quando operação muda
- Job queue (Celery/Dramatiq) para apurações pesadas

---

## 10. Testes — golden files

Cada classe tem golden files na forma `(input, regras_versao, output_esperado)`:

```json
// tests/golden/rv_br_isencao_20k_isenta.json
{
  "descricao": "Venda total mensal <= R$ 20k → isenção",
  "regras_versao": "rv_br_v1_2026",
  "input": {
    "operacoes": [
      {"tipo": "compra", "ativo": "PETR4", "data": "2026-01-10", "qtde": 1000, "preco": 25.00},
      {"tipo": "venda", "ativo": "PETR4", "data": "2026-02-15", "qtde": 500, "preco": 28.00}
    ]
  },
  "output_esperado": {
    "apuracoes": [
      {
        "mes": "2026-02",
        "classe": "acao_br",
        "categoria_internal": "swing",
        "ganho_bruto": 1500.00,
        "isenta": true,
        "motivo_isencao": "total_vendas_mes_R$_14000_abaixo_de_R$_20000",
        "ir_devido": 0.00
      }
    ]
  }
}
```

Cada caso vira teste em pytest:

```python
@pytest.mark.parametrize("golden_file", glob("tests/golden/*.json"))
def test_golden(golden_file):
    case = load_golden(golden_file)
    result = engine.apurar(case.input, regras=case.regras_versao)
    assert result == case.output_esperado, diff(result, case.output_esperado)
```

---

## 11. Decisões e racional

**Por que Python e não TypeScript / Rust / Java?**
Tributação brasileira tem muita matemática regressiva e tabela. Python + Pydantic + pandas tem o melhor ecossistema para isso. TypeScript funcionaria mas perderia velocidade de iteração com tributarista (que muitas vezes lê YAML mas escreve Python). Rust seria over-engineering; performance não é gargalo no MVP.

**Por que YAML e não JSON ou DSL própria?**
YAML é legível por humanos não-dev (tributarista revisando). JSON tem ruído visual ({"key":"value"}). DSL própria custaria 2 semanas para fazer e dar bug em produção. YAML + validação Pydantic é sweet spot.

**Por que event-driven em vez de snapshot?**
Snapshot pede "qual é a posição agora?" e calcula. Event-driven pede "quais foram os eventos até agora?" e deriva tudo. Vantagens: auditável, reprocessável, simula naturalmente what-if (basta adicionar eventos hipotéticos).

**Por que separar engine, regras, outputs?**
Regras mudam (Receita atualiza IN). Outputs mudam (precisamos novo formato DARF, ou cliente quer PDF customizado). Engine não muda. Separação reduz blast radius de cada mudança.

**Por que Pydantic v2 e não dataclasses?**
Validação automática + serialização para JSON + introspecção (model.model_json_schema) facilita gerar SQL, OpenAPI, doc.

**Por que não usar Drools ou DMN?**
Pesados, baseados em JVM, curva de aprendizado, sobrematam o problema. Para a complexidade tributária brasileira atual, YAML + evaluator próprio é mais leve e mais editável por não-devs.

---

## 12. Gaps reconhecidos no PoC (a fechar no MVP)

1. **Compensação inter-mês de prejuízos** — PoC faz mês isolado; MVP precisa de saldo running.
2. **Eventos corporativos automáticos** — PoC trata os 8 do MGT_RV_BR, mas split/grupamento intra-cota têm detalhes que precisam de validação.
3. **Importadores CSV** — PoC tem só estrutura; cada broker exige parser específico.
4. **DCBE e relatórios regulatórios** — fora do scope do PoC; entra no MVP V1.5.
5. **Lei 15.270 IRPFM com redutor anti-bitributação** — implementado mas precisa de dados da PJ (carga efetiva real). PoC usa carga nominal como aproximação.
6. **Câmbio PTAX histórico** — PoC usa dicionário hardcoded com 12 cotações; produção precisa de fonte oficial diária (BCB API).
7. **Trust e PIC offshore** — modelos definidos, mas regras de cálculo só esboçadas; precisa de tributarista para fechar.

---

## 13. Próximos passos pós-PoC

**Semana 1-2 após PoC:** validar arquitetura com tributarista parceiro (revisão de YAMLs principais).

**Semana 3-4:** implementar importadores CSV dos 3 brokers principais (XP, BTG, Avenue).

**Semana 5-8:** completar classes faltantes (Fundos abertos com come-cotas, Fundos fechados, Veículos como estrutura).

**Semana 9-10:** integração com frontend via API REST (FastAPI).

**Semana 11-12:** testes de carga + ajustes finos + revisão tributarista de saída final.

---

*Implementação de referência em `tax_engine_poc.py` — código executável que roda o caso do João end-to-end.*
