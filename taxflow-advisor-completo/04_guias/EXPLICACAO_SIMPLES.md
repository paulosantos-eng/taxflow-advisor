# TaxFlow Advisor — Guia Simples

Tudo explicado sem jargão. Você é o consultor; o app é a ferramenta. Cada tela responde a uma pergunta concreta.

---

## O que o app faz, em uma frase

**Mostra quanto cada cliente seu vai pagar de imposto este ano, descobre onde ele está deixando dinheiro na mesa, e te dá um plano pra reduzir essa conta — tudo calculado em tempo real, sem você abrir Excel.**

---

## As três telas, em uma frase cada

1. **Dashboard de clientes** — abre o app, vê quem precisa de atenção hoje.
2. **Ficha do cliente** — clica num cliente, vê tudo dele de imposto e patrimônio.
3. **Rebalanceador** — clica em "Rebalancear", vê quanto o cliente economiza se você seguir a sugestão de tax-optimization.

---

## TELA 1 — Dashboard de Clientes (a porta de entrada)

### O que tem em cima
- **3 cards de métricas:** quantos clientes você tem, quanto patrimônio sob gestão, quanto IR projetado total, quanto você economizou em relação ao ano passado.
- O quarto card (economia) é o **número-norte do produto** — é o que você mostra pro cliente provando que vale a pena te pagar.

### O alerta amarelo no topo
Aparece quando **algum cliente seu vai pagar imposto novo** por causa das novas leis (Lei 15.270 ou IRPFM). É um aviso pra você agir antes do fim do ano.

### A lista dos clientes
- **Verde "Em dia"** = tudo certo, nada de novo de imposto pra ele este ano.
- **Amarelo "Lei 15.270 acionada"** = ele recebeu mais de R$ 50 mil de dividendos no mês de alguma empresa e disparou um imposto novo de 10%.
- **Vermelho "IRPFM"** = ele tem renda anual muito alta (acima de R$ 600 mil) e vai pagar a "tributação mínima" criada em 2025.

Click no cliente → vai pra ficha dele.

---

## TELA 2 — Ficha do Cliente (o coração da operação)

### Header do cliente (em cima)
Foto/avatar, nome, idade, CPF. Você vê uma badge **"Pessoa Física"** — isso indica o veículo que estamos olhando. No futuro, esse cliente pode ter mais veículos: Holding, Offshore, Trust. Hoje no MVP só tem PF.

**Botão vermelho "Rebalancear"** → leva pra terceira tela.

### Os 4 cards de números grandes
1. **Patrimônio a mercado** — quanto vale a carteira hoje (custo + valorização).
2. **Ganho latente** (verde) — quanto o cliente já ganhou em valor de mercado, mas que ainda não realizou vendendo. O número diz "está valorizado em X% sobre o custo de compra".
3. **IR projetado 2026** (laranja) — quanto ele vai pagar de imposto no ano somando tudo (DARFs mensais + DAA anual + retenções).
4. **IR latente se vender hoje** (vermelho) — **passivo escondido**. Se ele resolvesse zerar tudo hoje, quanto sairia de IR? Esse número é importante porque rebalanceamentos disparam parte dele.

### Tabela de Posições Detalhadas (a tabela longa)
**É aqui que você vê o detalhe que falta no Excel.** Cada classe (Ações BR, FII, Renda Fixa Tributada, etc.) é uma linha que abre/fecha clicando.

Dentro de cada classe, você vê **cada ativo individual**:
- **Ticker** (ex.: PETR4)
- **Nome completo** (ex.: Petrobras PN)
- **Quantidade** (ex.: 400 ações)
- **Custo médio** (ex.: R$ 25,01 — o que ele pagou em média por ação)
- **Valor atual** (ex.: R$ 12.500 — quanto vale hoje somando todas as ações)
- **Ganho latente** (ex.: +R$ 1.500 / +12% — quanto valorizou sem vender)
- **IR se vender hoje** (ex.: R$ 225 — quanto pagaria de imposto se realizasse o ganho hoje)
- **% Carteira** (ex.: 3,2% — peso desse ativo no patrimônio total dele)

### Decomposição do IR (a tabela de 6 linhas)
Mostra de onde vem cada centavo de imposto que ele vai pagar. Cada linha tem uma frase curta embaixo dizendo "quando" o imposto é cobrado.

- **DARF 6015 (RV/FII)** — o consultor paga todo mês até o último dia útil quando o cliente vende ação ou FII com ganho.
- **IR progressivo (pró-labore)** — empresa retém quando paga o salário do sócio. Você vê o total já retido no ano.
- **JCP IRRF (15%)** — quando empresa paga "juros sobre capital próprio", retém 15% direto, ponto.
- **IRRF Lei 15.270 (10% > R$ 50k/mês)** — **regra NOVA de 2026**. Se cliente recebe mais de R$ 50k/mês de dividendos de uma mesma empresa, retém 10% sobre TUDO. Em vermelho se acionou.
- **Lei 14.754 (exterior)** — quando ele tem ações/ETFs/REITs nos EUA via Avenue ou IBKR, paga 15% anual em maio do ano seguinte.
- **IRPFM (Lei 15.270)** — **regra NOVA de 2026**. Renda acima de R$ 600k/ano paga uma "alíquota mínima" de até 10%. Em vermelho se acionou.

No final, o **Total IR 2026** somando tudo.

### Card de Carga Efetiva (no lado direito)
- **% do patrimônio** — qual fatia do dinheiro dele vai pra imposto este ano. Quanto menor, mais eficiente está a estrutura dele.
- **Carga 5 anos projetada** — extrapola: se ele continuar assim, vai pagar X em imposto nos próximos 5 anos.
- **Botão verde "Ver como reduzir →"** — vai pro Rebalanceador.

### Oportunidades identificadas pelo engine
Cards coloridos. Cada card é uma sugestão concreta que o app detectou olhando a carteira:
- **Azul (info)** = está tudo bem, vale anotar mesmo assim.
- **Amarelo (warn)** = perdeu uma chance de economizar (ex.: estourou janela R$ 20k).
- **Vermelho (high)** = lei nova disparada, precisa de ação.

Cada card mostra um **valor em R$** estimado de impacto.

### Calendário Fiscal
Lista de eventos do ano-calendário com data e valor:
- DARF de cada mês onde teve venda.
- Gatilhos da Lei 15.270 (quando o cliente recebeu dividendos > R$ 50k).
- Vencimentos de RF (Tesouro, CDB) que viram fato gerador automático.

---

## TELA 3 — Rebalanceador (a tela que vende o produto)

### CARD GIGANTE NO TOPO (verde)
**A primeira coisa que aparece — e é o argumento mais forte.**

- **Economia projetada em 5 anos: R$ X** (em fonte grande, verde Suno)
- **% menos imposto** comparado a não fazer nada.
- Quatro quadrantes embaixo: "Sem rebalancear 1 ano vs Com tax-otimização 1 ano" + "Sem rebalancear 5 anos vs Com tax-otimização 5 anos".

**O cliente vê esse número e quer assinar o serviço.**

Abaixo do card grande tem um disclaimer de uma linha explicando **como** a economia foi calculada (cinco alavancas: janela R$ 20k, harvesting, isentos vs tributados, timing de dividendos pela Lei 15.270, UCITS no exterior). Auditoria total.

### Alocação atual vs proposta (lado a lado)
Duas colunas:
- **Esquerda (branca)** = como a carteira está hoje, classe por classe, em % e R$.
- **Direita (vermelha clara)** = como a alocação ficaria depois do rebalanceamento, com a setinha de quanto vai mudar (+R$ 100k em RF Isenta, -R$ 200k em Ações BR, etc.).

### Trades sugeridos por ATIVO
**Esta é a parte concreta — não é mais "venda Ações BR R$ 50k", é "Venda PETR4 400 cotas, R$ 18 mil, custo fiscal R$ 0 (porque cabe na janela R$ 20k)".**

Cada linha:
- **Ação** — Vender (vermelho) ou Comprar (verde)
- **Ticker** — qual ativo exato (PETR4, KNRI11, etc.)
- **Classe** — pra qual classe pertence
- **Valor** — quanto em R$
- **IR estimado** — quanto pagaria de imposto vendendo aquele lote
- **Racional** — explicação curta de PORQUE o engine sugeriu vender aquele ativo específico ("lote com ganho latente baixo — IR mínimo")

O total no final mostra: vendas R$ X, compras R$ Y, custo fiscal total R$ Z.

### Alertas Táticos (caixa amarela)
4 sugestões de "como melhorar mais ainda":
1. Dividir vendas de ações em meses pra usar janela R$ 20k várias vezes.
2. Priorizar RF isenta (LCI, LCA, debêntures incentivadas) sobre RF tributada.
3. No exterior, trocar VOO americano por CSPX UCITS irlandês — paga menos imposto em dividendos por causa do tratado Irlanda-EUA.
4. Vender FIIs com prejuízo latente primeiro pra compensar ganhos.

### Botões no final
- **Voltar** — sai sem fazer nada.
- **Aplicar rebalanceamento** (vermelho Suno) — em produção, geraria a lista de ordens pra você executar no broker.

---

## Os 3 clientes de demonstração

| Cliente | Perfil | O que mostra |
|---|---|---|
| **João Mendes** | Advogado tributarista, R$ 4M, carteira mista | Dispara Lei 15.270 em abril; janela R$ 20k quebrada em maio; ganho exterior via VOO |
| **Marina Costa** | Sócia executiva, R$ 7M+, alta renda | Dispara Lei 15.270 **TODOS os meses** (R$ 70k de dividendos); renda anual ~R$ 2M; é o caso "rico de verdade" |
| **Roberto Lima** | Aposentado conservador, R$ 6M | Carteira só RF + FII + UCITS; sem disparos; é o caso "em dia, sem alerta" |

Cada um foi desenhado pra estressar uma combinação diferente das regras tributárias.

---

## Como contar a história pro investidor (pitch de 60 segundos)

> "Lei 14.754 de 2023 e Lei 15.270 de 2025 reescreveram a tributação brasileira. Consultor que atende cliente de R$ 1 milhão pra cima não consegue mais fazer apuração em Excel. **Renato**, planejador CFP, tem 67 clientes. Quando o cliente liga em dezembro perguntando 'como reduzo meu IR?', leva 2 dias pra responder. Quando recomenda um trade, ele *acha* que o impacto fiscal é OK, mas não roda o número.
>
> Construímos a primeira ferramenta de portfólio tax-aware do Brasil. Em uma tela, o consultor vê quanto cada cliente vai pagar, descobre onde está perdendo dinheiro, e gera um plano de rebalanceamento com impacto fiscal calculado em tempo real. Pra cada cliente, mostramos **a economia projetada em 5 anos** — que vai de R$ 50 mil pra clientes médios até R$ 500 mil pra altos patrimônios.
>
> O moat é a especificação tributária: temos uma matriz documentada cobrindo 19 instrumentos de renda fixa, 8 eventos corporativos de renda variável, requisitos de isenção de FII em 5 dimensões, Lei 15.270 com gatilho de R$ 50k/mês e redutor anti-bitributação, e Lei 14.754 com regime opaco vs transparência pra offshores e trusts. **Isso leva 12-18 meses pra construir do zero com tributarista qualificado.** Estamos buscando R$ 2 milhões pra fazer o MVP virar produto cobrável em 6 meses."

---

## Próximos passos (depois do deploy na Vercel)

1. **Mostrar pra 3 consultores que você conhece** — pedir feedback de UX e tributário.
2. **Contratar tributarista parceiro** pra revisar a MGT linha a linha.
3. **Adicionar 2ª classe pesada de teste:** Marina Costa precisa testar IRPFM com redutor anti-bitributação real (precisa carregar carga efetiva da PJ dela).
4. **Implementar segundo veículo de verdade** — Holding patrimonial — pra estressar o cruzamento Operacional → Holding → PF da Lei 15.270.
5. **Primeira integração CSV** — escolher um broker (XP ou BTG) e construir importador real.

---

## Onde estão os arquivos

```
D:\PAULO\PROJETOS\taxflow-advisor\          ← o app, pra você rodar
  app/                                       ← as 3 telas
  components/                                ← peças UI (sidebar, tabela, etc.)
  lib/tax-engine/                            ← cérebro de cálculo
  lib/data/mock-clients.ts                   ← 3 clientes mock

C:\Users\Silve\AppData\...\outputs\          ← tudo que produzimos junto
  plano_app_rebalanceamento_tributario.md
  MGT_*.md (6 arquivos)
  sketches_5_telas_criticas.md
  tax_engine_arquitetura.md
  tax_engine_poc.py
  deck_investidor_storyline.md
  EXPLICACAO_SIMPLES.md (este arquivo)
```

---

**Quando bater dúvida em qualquer número da tela, abre este arquivo, procura o nome da seção, lê o parágrafo.** Tudo aqui responde a "o que isso é" e "por que importa".
