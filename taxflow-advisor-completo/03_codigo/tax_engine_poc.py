"""
TaxFlow Tax Engine - Prova de Conceito
========================================
Implementação de referência em Python puro (stdlib only) demonstrando:
- Modelo de dados event-driven
- Engine de regras com versioning temporal
- Apuração mensal e anual
- Cálculo de IRPFM (Lei 15.270/2025)
- Cálculo de IRRF de dividendos > R$ 50k/mês
- Tributação Lei 14.754/2023 (exterior)
- Caso do João Mendes rodando ano fiscal 2026 end-to-end

Para executar: python3 tax_engine_poc.py

Em produção, este código se decompõe em ~30 arquivos. O PoC mantém tudo
em um arquivo para legibilidade da arquitetura.
"""

from __future__ import annotations
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Optional


# ============================================================================
# ENUMS E TIPOS
# ============================================================================


class ClasseAtivo(Enum):
    ACAO_BR = "acao_br"
    ETF_RV_BR = "etf_rv_br"
    ETF_RF_BR = "etf_rf_br"
    FII = "fii"
    FIAGRO = "fiagro"
    TESOURO_SELIC = "tesouro_selic"
    TESOURO_PRE = "tesouro_pre"
    TESOURO_IPCA = "tesouro_ipca"
    CDB = "cdb"
    DEBENTURE_COMUM = "debenture_comum"
    LCI = "lci"
    LCA = "lca"
    DEBENTURE_INCENTIVADA = "debenture_incentivada"
    STOCK_EXTERIOR = "stock_exterior"
    ETF_EXTERIOR_ACUMULACAO = "etf_exterior_acumulacao"
    ETF_EXTERIOR_DISTRIBUICAO = "etf_exterior_distribuicao"
    REIT_EXTERIOR = "reit_exterior"
    BOND_EXTERIOR = "bond_exterior"


class TipoOperacao(Enum):
    COMPRA = "compra"
    VENDA_SWING = "venda_swing"
    VENDA_DAY = "venda_day"
    DIVIDENDO_RECEBIDO = "dividendo_recebido"
    JCP_RECEBIDO = "jcp_recebido"
    RENDIMENTO_FII = "rendimento_fii"
    CUPOM_RECEBIDO = "cupom_recebido"
    VENCIMENTO_RF = "vencimento_rf"
    AMORTIZACAO = "amortizacao"
    PRO_LABORE = "pro_labore"
    DISTRIBUICAO_PJ_PROPRIA = "distribuicao_pj_propria"
    EVENTO_CORPORATIVO_NEUTRO = "evento_corporativo_neutro"


class TipoVeiculo(Enum):
    PF = "pessoa_fisica"
    PJ_LR = "pj_lucro_real"
    PJ_LP = "pj_lucro_presumido"
    HOLDING = "holding_patrimonial"
    OFFSHORE_OPACA = "offshore_pic_opaca"
    OFFSHORE_TRANSPARENTE = "offshore_pic_transparente"
    TRUST = "trust"


# ============================================================================
# MODELS — domínio
# ============================================================================


@dataclass
class Ativo:
    codigo: str  # ticker ou ID interno
    nome: str
    classe: ClasseAtivo
    moeda: str = "BRL"
    # Atributos fiscais específicos por classe:
    cumpre_requisitos_isencao_fii: bool = False  # só relevante para FII/Fiagro
    e_qualificado_ie_lei_12431: bool = False  # debênture incentivada, ETF IE
    pais_origem: str = "BR"
    politica_dividendos: str = "acumulacao"  # ou "distribuicao"


@dataclass
class Veiculo:
    id: str
    cliente_id: str
    tipo: TipoVeiculo
    pais_domicilio: str = "BR"


@dataclass
class Cliente:
    id: str
    nome: str
    cpf: str
    data_nascimento: date
    residencia_fiscal: str = "BR"
    veiculos: list[Veiculo] = field(default_factory=list)


@dataclass
class Operacao:
    id: str
    veiculo_id: str
    ativo: Ativo
    tipo: TipoOperacao
    data: date
    quantidade: Decimal = Decimal("0")
    preco_unitario: Decimal = Decimal("0")
    valor_total: Decimal = Decimal("0")
    custos: Decimal = Decimal("0")  # corretagem + emolumentos
    taxa_cambio_ptax: Decimal = Decimal("1")  # 1.0 para BRL
    irrf_retido_fonte: Decimal = Decimal("0")
    fonte_pagadora_cnpj: Optional[str] = None  # para dividendos (gatilho Lei 15.270)
    observacao: str = ""


@dataclass
class Posicao:
    """Posição derivada das operações (custo médio + quantidade)."""
    ativo: Ativo
    quantidade: Decimal = Decimal("0")
    custo_total_brl: Decimal = Decimal("0")

    @property
    def custo_medio(self) -> Decimal:
        if self.quantidade == 0:
            return Decimal("0")
        return self.custo_total_brl / self.quantidade


@dataclass
class ApuracaoMensal:
    """Resultado de apuração de um mês para um veículo."""
    veiculo_id: str
    ano: int
    mes: int
    # Por classe/categoria:
    ganho_acao_swing: Decimal = Decimal("0")
    ganho_acao_day: Decimal = Decimal("0")
    ganho_etf_rv: Decimal = Decimal("0")
    ganho_fii: Decimal = Decimal("0")
    rendimento_fii_isento: Decimal = Decimal("0")
    rendimento_fii_tributado: Decimal = Decimal("0")
    rendimento_rf_tributada: Decimal = Decimal("0")
    rendimento_rf_isenta: Decimal = Decimal("0")
    dividendos_brutos: Decimal = Decimal("0")
    jcp_bruto: Decimal = Decimal("0")
    jcp_irrf: Decimal = Decimal("0")
    pro_labore: Decimal = Decimal("0")
    distribuicao_pj_propria: Decimal = Decimal("0")
    irrf_dividendos_lei_15270: Decimal = Decimal("0")
    # IR devido por categoria:
    ir_swing_acao: Decimal = Decimal("0")
    ir_day: Decimal = Decimal("0")
    ir_etf_rv: Decimal = Decimal("0")
    ir_fii_ganho: Decimal = Decimal("0")
    ir_progressivo: Decimal = Decimal("0")
    # Volume para isenção R$ 20k:
    volume_vendas_acao_swing: Decimal = Decimal("0")
    # Total mensal a pagar (DARF 6015 + carnê-leão):
    total_darf_6015: Decimal = Decimal("0")
    # Trail:
    operacoes_referenciadas: list[str] = field(default_factory=list)


@dataclass
class ApuracaoAnual:
    """Consolidação anual com IRPFM."""
    veiculo_id: str
    ano: int
    renda_total_para_irpfm: Decimal = Decimal("0")
    ir_pago_no_ano: Decimal = Decimal("0")
    irpfm_bruto: Decimal = Decimal("0")
    irpfm_devido: Decimal = Decimal("0")
    ganho_exterior_brl: Decimal = Decimal("0")
    ir_exterior_brl: Decimal = Decimal("0")


# ============================================================================
# CATÁLOGO DE REGRAS (hardcoded para PoC; produção vem de YAML)
# ============================================================================


class Regras:
    """Centraliza constantes e tabelas — em produção carrega de YAML."""

    # Renda Variável
    ISENCAO_SWING_ACAO_MENSAL = Decimal("20000.00")
    ALIQUOTA_SWING_ACAO = Decimal("0.15")
    ALIQUOTA_DAY = Decimal("0.20")
    ALIQUOTA_ETF_RV_SWING = Decimal("0.15")
    ALIQUOTA_FII_GANHO = Decimal("0.20")

    # Dividendos / JCP
    ALIQUOTA_JCP = Decimal("0.15")
    GATILHO_IRRF_DIVIDENDOS_LEI_15270 = Decimal("50000.00")
    ALIQUOTA_IRRF_DIVIDENDOS_LEI_15270 = Decimal("0.10")
    DATA_VIGENCIA_LEI_15270 = date(2026, 1, 1)

    # Renda Fixa — tabela regressiva
    @staticmethod
    def aliquota_rf_regressiva(dias: int) -> Decimal:
        if dias <= 180:
            return Decimal("0.225")
        elif dias <= 360:
            return Decimal("0.20")
        elif dias <= 720:
            return Decimal("0.175")
        else:
            return Decimal("0.15")

    # Exterior Lei 14.754
    ALIQUOTA_LEI_14754 = Decimal("0.15")

    # IRPFM Lei 15.270
    LIMITE_INFERIOR_IRPFM = Decimal("600000.00")
    LIMITE_SUPERIOR_IRPFM = Decimal("1200000.00")
    ALIQUOTA_MAX_IRPFM = Decimal("0.10")

    @staticmethod
    def aliquota_irpfm(renda_anual: Decimal) -> Decimal:
        if renda_anual <= Regras.LIMITE_INFERIOR_IRPFM:
            return Decimal("0")
        if renda_anual >= Regras.LIMITE_SUPERIOR_IRPFM:
            return Regras.ALIQUOTA_MAX_IRPFM
        # progressiva linear entre 0 e 10%
        progresso = (renda_anual - Regras.LIMITE_INFERIOR_IRPFM) / (
            Regras.LIMITE_SUPERIOR_IRPFM - Regras.LIMITE_INFERIOR_IRPFM
        )
        return progresso * Regras.ALIQUOTA_MAX_IRPFM

    # Progressiva IRPF — 2026 (Lei 15.270 — nova faixa de isenção R$ 5k)
    @staticmethod
    def aliquota_irpf_progressiva_mensal(base: Decimal) -> tuple[Decimal, Decimal]:
        """Retorna (aliquota, deducao) — tabela mensal 2026."""
        # Valores aproximados; em produção vem de IN da Receita atualizada
        if base <= Decimal("5000.00"):
            return Decimal("0"), Decimal("0")
        elif base <= Decimal("7530.00"):
            # faixa transitória com redução regressiva
            return Decimal("0.075"), Decimal("375.00")
        elif base <= Decimal("9282.00"):
            return Decimal("0.15"), Decimal("939.75")
        elif base <= Decimal("12257.00"):
            return Decimal("0.225"), Decimal("1635.90")
        else:
            return Decimal("0.275"), Decimal("2248.75")


# ============================================================================
# ENGINE
# ============================================================================


class TaxEngine:
    """Núcleo de cálculo event-driven."""

    def __init__(self):
        self.operacoes: list[Operacao] = []
        self.posicoes: dict[tuple[str, str], Posicao] = {}  # (veiculo_id, ativo_codigo) -> Posicao
        self.apuracoes_mensais: dict[tuple[str, int, int], ApuracaoMensal] = {}
        # Tracking de dividendos por (CNPJ_fonte, CPF/veiculo, ano, mês) para Lei 15.270
        self.acumulado_dividendos_mes: dict[tuple[str, str, int, int], Decimal] = defaultdict(
            lambda: Decimal("0")
        )

    # -------------------------------------------------------------------------
    # INGESTÃO DE OPERAÇÕES
    # -------------------------------------------------------------------------

    def processar_operacao(self, op: Operacao):
        """Despacha operação para o handler apropriado."""
        self.operacoes.append(op)

        handlers = {
            TipoOperacao.COMPRA: self._handle_compra,
            TipoOperacao.VENDA_SWING: self._handle_venda_swing,
            TipoOperacao.VENDA_DAY: self._handle_venda_day,
            TipoOperacao.DIVIDENDO_RECEBIDO: self._handle_dividendo,
            TipoOperacao.JCP_RECEBIDO: self._handle_jcp,
            TipoOperacao.RENDIMENTO_FII: self._handle_rendimento_fii,
            TipoOperacao.CUPOM_RECEBIDO: self._handle_cupom_rf,
            TipoOperacao.VENCIMENTO_RF: self._handle_vencimento_rf,
            TipoOperacao.PRO_LABORE: self._handle_pro_labore,
            TipoOperacao.DISTRIBUICAO_PJ_PROPRIA: self._handle_distribuicao_pj_propria,
            TipoOperacao.AMORTIZACAO: self._handle_amortizacao,
        }
        handler = handlers.get(op.tipo)
        if handler:
            handler(op)

    def _key_posicao(self, op: Operacao) -> tuple[str, str]:
        return (op.veiculo_id, op.ativo.codigo)

    def _get_apuracao(self, veiculo_id: str, ano: int, mes: int) -> ApuracaoMensal:
        key = (veiculo_id, ano, mes)
        if key not in self.apuracoes_mensais:
            self.apuracoes_mensais[key] = ApuracaoMensal(
                veiculo_id=veiculo_id, ano=ano, mes=mes
            )
        return self.apuracoes_mensais[key]

    # -------------------------------------------------------------------------
    # HANDLERS POR TIPO DE OPERAÇÃO
    # -------------------------------------------------------------------------

    def _handle_compra(self, op: Operacao):
        """Compra atualiza custo médio. Sem fato gerador."""
        key = self._key_posicao(op)
        pos = self.posicoes.get(key) or Posicao(ativo=op.ativo)
        valor_brl = op.valor_total * op.taxa_cambio_ptax + op.custos
        pos.quantidade += op.quantidade
        pos.custo_total_brl += valor_brl
        self.posicoes[key] = pos

    def _handle_venda_swing(self, op: Operacao):
        """Venda swing: aplica regras da classe."""
        key = self._key_posicao(op)
        pos = self.posicoes.get(key)
        if not pos or pos.quantidade < op.quantidade:
            raise ValueError(f"Posição insuficiente para venda: {op.ativo.codigo}")

        valor_venda_brl = op.valor_total * op.taxa_cambio_ptax - op.custos
        custo_alocado = pos.custo_medio * op.quantidade
        ganho = valor_venda_brl - custo_alocado

        ap = self._get_apuracao(op.veiculo_id, op.data.year, op.data.month)
        ap.operacoes_referenciadas.append(op.id)

        if op.ativo.classe == ClasseAtivo.ACAO_BR:
            # Acumula volume e ganho; tributação avaliada no fechamento do mês
            ap.volume_vendas_acao_swing += valor_venda_brl
            ap.ganho_acao_swing += ganho
        elif op.ativo.classe == ClasseAtivo.ETF_RV_BR:
            # ETF não tem isenção R$ 20k
            ap.ganho_etf_rv += ganho
        elif op.ativo.classe == ClasseAtivo.FII:
            # FII tem alíquota 20% sem isenção
            ap.ganho_fii += ganho
        elif op.ativo.classe in (
            ClasseAtivo.STOCK_EXTERIOR,
            ClasseAtivo.ETF_EXTERIOR_ACUMULACAO,
            ClasseAtivo.ETF_EXTERIOR_DISTRIBUICAO,
            ClasseAtivo.REIT_EXTERIOR,
        ):
            # Exterior: acumula para apuração anual
            ap_anual = self._ensure_annual(op.veiculo_id, op.data.year)
            ap_anual.ganho_exterior_brl += ganho

        # Atualiza posição
        pos.quantidade -= op.quantidade
        pos.custo_total_brl -= custo_alocado

    def _handle_venda_day(self, op: Operacao):
        """Day trade: alíquota 20%, sem isenção."""
        key = self._key_posicao(op)
        pos = self.posicoes.get(key)
        if not pos:
            return
        valor_venda_brl = op.valor_total * op.taxa_cambio_ptax - op.custos
        custo_alocado = pos.custo_medio * op.quantidade
        ganho = valor_venda_brl - custo_alocado

        ap = self._get_apuracao(op.veiculo_id, op.data.year, op.data.month)
        ap.ganho_acao_day += ganho
        ap.operacoes_referenciadas.append(op.id)

        pos.quantidade -= op.quantidade
        pos.custo_total_brl -= custo_alocado

    def _handle_dividendo(self, op: Operacao):
        """Dividendo de PJ brasileira. Aplica Lei 15.270 se ≥ 2026."""
        ap = self._get_apuracao(op.veiculo_id, op.data.year, op.data.month)
        ap.dividendos_brutos += op.valor_total
        ap.operacoes_referenciadas.append(op.id)

        if op.data >= Regras.DATA_VIGENCIA_LEI_15270 and op.fonte_pagadora_cnpj:
            # Verifica gatilho R$ 50k/mês pela mesma fonte
            key = (op.fonte_pagadora_cnpj, op.veiculo_id, op.data.year, op.data.month)
            acumulado_anterior = self.acumulado_dividendos_mes[key]
            acumulado_novo = acumulado_anterior + op.valor_total
            self.acumulado_dividendos_mes[key] = acumulado_novo

            if acumulado_novo > Regras.GATILHO_IRRF_DIVIDENDOS_LEI_15270:
                # Retém 10% sobre TODO o acumulado do mês — recalculando
                irrf_total = acumulado_novo * Regras.ALIQUOTA_IRRF_DIVIDENDOS_LEI_15270
                # Retenção residual = total - já retido em ops anteriores deste mês
                ap.irrf_dividendos_lei_15270 = irrf_total

    def _handle_jcp(self, op: Operacao):
        """JCP: 15% IRRF definitivo na PF; entra na base do IRPFM."""
        ap = self._get_apuracao(op.veiculo_id, op.data.year, op.data.month)
        ap.jcp_bruto += op.valor_total
        ap.jcp_irrf += op.valor_total * Regras.ALIQUOTA_JCP
        ap.operacoes_referenciadas.append(op.id)

    def _handle_rendimento_fii(self, op: Operacao):
        """Rendimento mensal FII — isento PF se atende requisitos."""
        ap = self._get_apuracao(op.veiculo_id, op.data.year, op.data.month)
        if op.ativo.cumpre_requisitos_isencao_fii:
            ap.rendimento_fii_isento += op.valor_total
        else:
            # Tributa pela regressiva (aresta — passaria a tributar)
            ap.rendimento_fii_tributado += op.valor_total
        ap.operacoes_referenciadas.append(op.id)

    def _handle_cupom_rf(self, op: Operacao):
        """Cupom de RF (NTN-F, NTN-B, debênture). Tributa pela regressiva."""
        ap = self._get_apuracao(op.veiculo_id, op.data.year, op.data.month)
        # Para PoC: assume prazo > 720 dias (15%); em produção, rastreia data_compra
        irrf = op.valor_total * Decimal("0.15")
        if op.ativo.classe == ClasseAtivo.DEBENTURE_INCENTIVADA or op.ativo.classe in (
            ClasseAtivo.LCI,
            ClasseAtivo.LCA,
        ):
            ap.rendimento_rf_isenta += op.valor_total
        else:
            ap.rendimento_rf_tributada += op.valor_total - irrf
        ap.operacoes_referenciadas.append(op.id)

    def _handle_vencimento_rf(self, op: Operacao):
        """Vencimento de RF: evento automático, fato gerador."""
        key = self._key_posicao(op)
        pos = self.posicoes.get(key)
        if not pos:
            return
        valor_recebido = op.valor_total
        ganho = valor_recebido - pos.custo_total_brl
        # Assume prazo > 720d (típico para vencimento "natural")
        irrf = max(Decimal("0"), ganho) * Decimal("0.15")
        ap = self._get_apuracao(op.veiculo_id, op.data.year, op.data.month)
        ap.rendimento_rf_tributada += ganho - irrf
        ap.operacoes_referenciadas.append(op.id)

        pos.quantidade = Decimal("0")
        pos.custo_total_brl = Decimal("0")

    def _handle_pro_labore(self, op: Operacao):
        """Pró-labore: tabela progressiva."""
        ap = self._get_apuracao(op.veiculo_id, op.data.year, op.data.month)
        ap.pro_labore += op.valor_total
        ap.operacoes_referenciadas.append(op.id)

    def _handle_distribuicao_pj_propria(self, op: Operacao):
        """Distribuição de dividendos da PJ própria do cliente — aplica Lei 15.270."""
        self._handle_dividendo(op)
        ap = self._get_apuracao(op.veiculo_id, op.data.year, op.data.month)
        ap.distribuicao_pj_propria += op.valor_total

    def _handle_amortizacao(self, op: Operacao):
        """Amortização: reduz custo, sem FG."""
        key = self._key_posicao(op)
        pos = self.posicoes.get(key)
        if not pos:
            return
        pos.custo_total_brl = max(Decimal("0"), pos.custo_total_brl - op.valor_total)

    # -------------------------------------------------------------------------
    # APURAÇÃO MENSAL — fecha o mês aplicando isenções e alíquotas
    # -------------------------------------------------------------------------

    def fechar_apuracao_mensal(self, veiculo_id: str, ano: int, mes: int) -> ApuracaoMensal:
        ap = self._get_apuracao(veiculo_id, ano, mes)

        # 1. Apuração de RV BR — swing ações
        if ap.volume_vendas_acao_swing <= Regras.ISENCAO_SWING_ACAO_MENSAL:
            ap.ir_swing_acao = Decimal("0")
        else:
            ap.ir_swing_acao = max(Decimal("0"), ap.ganho_acao_swing) * Regras.ALIQUOTA_SWING_ACAO

        # 2. ETF RV — sem isenção
        ap.ir_etf_rv = max(Decimal("0"), ap.ganho_etf_rv) * Regras.ALIQUOTA_ETF_RV_SWING

        # 3. Day trade
        ap.ir_day = max(Decimal("0"), ap.ganho_acao_day) * Regras.ALIQUOTA_DAY

        # 4. FII — ganho na cota
        ap.ir_fii_ganho = max(Decimal("0"), ap.ganho_fii) * Regras.ALIQUOTA_FII_GANHO

        # 5. IR progressivo sobre pró-labore + distribuição PJ (se ≥ 5k)
        base_progressiva = ap.pro_labore  # distribuição PJ vai pelo regime dividendos
        if base_progressiva > 0:
            aliquota, deducao = Regras.aliquota_irpf_progressiva_mensal(base_progressiva)
            ap.ir_progressivo = max(
                Decimal("0"), base_progressiva * aliquota - deducao
            )

        # 6. Total DARF 6015 (RV + day + ETF + FII)
        ap.total_darf_6015 = (
            ap.ir_swing_acao + ap.ir_day + ap.ir_etf_rv + ap.ir_fii_ganho
        )

        return ap

    # -------------------------------------------------------------------------
    # APURAÇÃO ANUAL + IRPFM
    # -------------------------------------------------------------------------

    apuracoes_anuais: dict[tuple[str, int], ApuracaoAnual] = {}

    def _ensure_annual(self, veiculo_id: str, ano: int) -> ApuracaoAnual:
        key = (veiculo_id, ano)
        if key not in self.apuracoes_anuais:
            self.apuracoes_anuais[key] = ApuracaoAnual(veiculo_id=veiculo_id, ano=ano)
        return self.apuracoes_anuais[key]

    def fechar_apuracao_anual(self, veiculo_id: str, ano: int) -> ApuracaoAnual:
        ap_anual = self._ensure_annual(veiculo_id, ano)

        # Fechar todos os meses do ano
        for mes in range(1, 13):
            self.fechar_apuracao_mensal(veiculo_id, ano, mes)

        # Consolidar base ampla do IRPFM
        renda_total = Decimal("0")
        ir_pago = Decimal("0")
        for mes in range(1, 13):
            apm = self.apuracoes_mensais.get((veiculo_id, ano, mes))
            if not apm:
                continue
            # Inclui TUDO (isentos e tributados) — base ampla
            renda_total += apm.pro_labore
            renda_total += apm.dividendos_brutos  # mesmo se isentos
            renda_total += apm.jcp_bruto
            renda_total += apm.rendimento_fii_isento
            renda_total += apm.rendimento_fii_tributado
            renda_total += apm.rendimento_rf_isenta
            renda_total += apm.rendimento_rf_tributada
            renda_total += max(Decimal("0"), apm.ganho_acao_swing)
            renda_total += max(Decimal("0"), apm.ganho_etf_rv)
            renda_total += max(Decimal("0"), apm.ganho_fii)
            renda_total += max(Decimal("0"), apm.ganho_acao_day)

            ir_pago += apm.total_darf_6015
            ir_pago += apm.ir_progressivo
            ir_pago += apm.jcp_irrf
            ir_pago += apm.irrf_dividendos_lei_15270

        # Exterior também entra
        renda_total += max(Decimal("0"), ap_anual.ganho_exterior_brl)
        ap_anual.ir_exterior_brl = max(Decimal("0"), ap_anual.ganho_exterior_brl) * Regras.ALIQUOTA_LEI_14754
        ir_pago += ap_anual.ir_exterior_brl

        ap_anual.renda_total_para_irpfm = renda_total
        ap_anual.ir_pago_no_ano = ir_pago

        # Calcula IRPFM
        aliquota_irpfm = Regras.aliquota_irpfm(renda_total)
        ap_anual.irpfm_bruto = renda_total * aliquota_irpfm
        ap_anual.irpfm_devido = max(Decimal("0"), ap_anual.irpfm_bruto - ir_pago)

        return ap_anual


# ============================================================================
# CASO DO JOÃO MENDES — ano fiscal 2026
# ============================================================================


def criar_caso_joao() -> tuple[Cliente, list[Operacao]]:
    """Cliente exemplar: advogado tributarista, 38 anos, R$ 4M patrimônio."""
    cliente = Cliente(
        id="cli_joao",
        nome="João Mendes",
        cpf="123.456.789-00",
        data_nascimento=date(1988, 3, 15),
    )
    pf = Veiculo(id="vec_pf_joao", cliente_id="cli_joao", tipo=TipoVeiculo.PF)
    cliente.veiculos.append(pf)

    # Ativos
    petr4 = Ativo("PETR4", "Petrobras PN", ClasseAtivo.ACAO_BR)
    wege3 = Ativo("WEGE3", "WEG ON", ClasseAtivo.ACAO_BR)
    vale3 = Ativo("VALE3", "Vale ON", ClasseAtivo.ACAO_BR)
    itsa4 = Ativo("ITSA4", "Itaúsa PN", ClasseAtivo.ACAO_BR)
    knri11 = Ativo("KNRI11", "Kinea Renda Imob", ClasseAtivo.FII, cumpre_requisitos_isencao_fii=True)
    btlg11 = Ativo("BTLG11", "BTG Pactual Log", ClasseAtivo.FII, cumpre_requisitos_isencao_fii=True)
    selic2026 = Ativo("LFT2026", "Tesouro Selic 2026", ClasseAtivo.TESOURO_SELIC)
    selic2027 = Ativo("LFT2027", "Tesouro Selic 2027", ClasseAtivo.TESOURO_SELIC)
    cdb_banco = Ativo("CDB_XP", "CDB Banco XP 110% CDI", ClasseAtivo.CDB)
    lca_bb = Ativo("LCA_BB", "LCA Banco do Brasil", ClasseAtivo.LCA)
    deb_eletro = Ativo("DEB_ELET", "Debênture Eletrobras IE", ClasseAtivo.DEBENTURE_INCENTIVADA, e_qualificado_ie_lei_12431=True)
    ivvb11 = Ativo("IVVB11", "iShares S&P 500", ClasseAtivo.ETF_RV_BR)
    voo = Ativo("VOO", "Vanguard S&P 500 ETF", ClasseAtivo.ETF_EXTERIOR_ACUMULACAO,
                moeda="USD", pais_origem="US")
    schd = Ativo("SCHD", "Schwab US Div ETF", ClasseAtivo.ETF_EXTERIOR_DISTRIBUICAO,
                 moeda="USD", pais_origem="US", politica_dividendos="distribuicao")

    operacoes: list[Operacao] = []
    cnpj_pj_propria = "12.345.678/0001-90"  # Mendes Advocacia

    # ===== JANEIRO =====
    # Pró-labore mensal
    for mes in range(1, 13):
        valor_pl = Decimal("25000") if mes != 11 else Decimal("35000")  # nov tem bônus
        operacoes.append(Operacao(
            id=f"op_pl_{mes:02d}", veiculo_id="vec_pf_joao", ativo=Ativo("PRO_LABORE", "Pró-labore Mendes Adv", ClasseAtivo.ACAO_BR),
            tipo=TipoOperacao.PRO_LABORE, data=date(2026, mes, 5),
            valor_total=valor_pl, fonte_pagadora_cnpj=cnpj_pj_propria
        ))

    # Compras iniciais (manutenção da carteira existente)
    operacoes.append(Operacao(
        id="op_001", veiculo_id="vec_pf_joao", ativo=knri11,
        tipo=TipoOperacao.COMPRA, data=date(2026, 1, 10),
        quantidade=Decimal("1000"), preco_unitario=Decimal("160"),
        valor_total=Decimal("160000"), custos=Decimal("80")
    ))
    operacoes.append(Operacao(
        id="op_002", veiculo_id="vec_pf_joao", ativo=selic2027,
        tipo=TipoOperacao.COMPRA, data=date(2026, 1, 20),
        quantidade=Decimal("200"), preco_unitario=Decimal("1000"),
        valor_total=Decimal("200000")
    ))
    operacoes.append(Operacao(
        id="op_003", veiculo_id="vec_pf_joao", ativo=voo,
        tipo=TipoOperacao.COMPRA, data=date(2026, 1, 25),
        quantidade=Decimal("500"), preco_unitario=Decimal("450"),
        valor_total=Decimal("225000"), custos=Decimal("0"),
        taxa_cambio_ptax=Decimal("5.10")
    ))

    # Compra ações para venda futura
    operacoes.append(Operacao(
        id="op_004", veiculo_id="vec_pf_joao", ativo=petr4,
        tipo=TipoOperacao.COMPRA, data=date(2026, 1, 15),
        quantidade=Decimal("1000"), preco_unitario=Decimal("25"),
        valor_total=Decimal("25000"), custos=Decimal("12")
    ))
    operacoes.append(Operacao(
        id="op_005", veiculo_id="vec_pf_joao", ativo=wege3,
        tipo=TipoOperacao.COMPRA, data=date(2026, 1, 15),
        quantidade=Decimal("500"), preco_unitario=Decimal("40"),
        valor_total=Decimal("20000"), custos=Decimal("10")
    ))

    # ===== FEVEREIRO ===== — distribuições FII mensais começam
    for mes in range(2, 13):
        operacoes.append(Operacao(
            id=f"op_div_knri_{mes:02d}", veiculo_id="vec_pf_joao", ativo=knri11,
            tipo=TipoOperacao.RENDIMENTO_FII, data=date(2026, mes, 15),
            valor_total=Decimal("1200")  # ~R$ 1,20/cota * 1000 cotas
        ))

    # ===== MARÇO ===== — venda PETR4 dentro da isenção R$ 20k
    operacoes.append(Operacao(
        id="op_006", veiculo_id="vec_pf_joao", ativo=petr4,
        tipo=TipoOperacao.VENDA_SWING, data=date(2026, 3, 12),
        quantidade=Decimal("600"), preco_unitario=Decimal("30"),
        valor_total=Decimal("18000"), custos=Decimal("9")
    ))
    # dividendo trimestral PETR4
    operacoes.append(Operacao(
        id="op_div_petr4_q1", veiculo_id="vec_pf_joao", ativo=petr4,
        tipo=TipoOperacao.DIVIDENDO_RECEBIDO, data=date(2026, 3, 28),
        valor_total=Decimal("800"), fonte_pagadora_cnpj="33.000.167/0001-01"
    ))

    # ===== ABRIL ===== — distribuição PJ Mendes Adv R$ 60k (DISPARA Lei 15.270)
    operacoes.append(Operacao(
        id="op_dist_pj_abr", veiculo_id="vec_pf_joao",
        ativo=Ativo("DIST_PJ", "Distribuição Mendes Adv", ClasseAtivo.ACAO_BR),
        tipo=TipoOperacao.DISTRIBUICAO_PJ_PROPRIA, data=date(2026, 4, 15),
        valor_total=Decimal("60000"), fonte_pagadora_cnpj=cnpj_pj_propria
    ))

    # ===== MAIO ===== — venda WEGE3 que estoura R$ 20k
    operacoes.append(Operacao(
        id="op_007", veiculo_id="vec_pf_joao", ativo=wege3,
        tipo=TipoOperacao.VENDA_SWING, data=date(2026, 5, 10),
        quantidade=Decimal("400"), preco_unitario=Decimal("55"),
        valor_total=Decimal("22000"), custos=Decimal("11")
    ))
    # Venda IVVB11 (ETF, sem isenção)
    operacoes.append(Operacao(
        id="op_008", veiculo_id="vec_pf_joao", ativo=ivvb11,
        tipo=TipoOperacao.COMPRA, data=date(2026, 5, 5),
        quantidade=Decimal("300"), preco_unitario=Decimal("330"),
        valor_total=Decimal("99000"), custos=Decimal("50")
    ))

    # ===== JULHO ===== — distribuição PJ R$ 50k (NO LIMITE — não dispara)
    operacoes.append(Operacao(
        id="op_dist_pj_jul", veiculo_id="vec_pf_joao",
        ativo=Ativo("DIST_PJ", "Distribuição Mendes Adv", ClasseAtivo.ACAO_BR),
        tipo=TipoOperacao.DISTRIBUICAO_PJ_PROPRIA, data=date(2026, 7, 15),
        valor_total=Decimal("50000"), fonte_pagadora_cnpj=cnpj_pj_propria
    ))
    # Dividendo SCHD trimestral
    operacoes.append(Operacao(
        id="op_div_schd_q3", veiculo_id="vec_pf_joao", ativo=schd,
        tipo=TipoOperacao.DIVIDENDO_RECEBIDO, data=date(2026, 7, 28),
        valor_total=Decimal("4800"), taxa_cambio_ptax=Decimal("5.20"),
        fonte_pagadora_cnpj="SCHD_US"  # fonte estrangeira
    ))

    # ===== SETEMBRO ===== — JCP Itaúsa + day trade
    operacoes.append(Operacao(
        id="op_jcp_itsa", veiculo_id="vec_pf_joao", ativo=itsa4,
        tipo=TipoOperacao.JCP_RECEBIDO, data=date(2026, 9, 20),
        valor_total=Decimal("3500"), fonte_pagadora_cnpj="61.532.644/0001-15"
    ))
    # Day trade VALE3
    operacoes.append(Operacao(
        id="op_dt_vale_buy", veiculo_id="vec_pf_joao", ativo=vale3,
        tipo=TipoOperacao.COMPRA, data=date(2026, 9, 18),
        quantidade=Decimal("100"), preco_unitario=Decimal("70"),
        valor_total=Decimal("7000"), custos=Decimal("3.50")
    ))
    operacoes.append(Operacao(
        id="op_dt_vale_sell", veiculo_id="vec_pf_joao", ativo=vale3,
        tipo=TipoOperacao.VENDA_DAY, data=date(2026, 9, 18),
        quantidade=Decimal("100"), preco_unitario=Decimal("72"),
        valor_total=Decimal("7200"), custos=Decimal("3.50")
    ))

    # ===== OUTUBRO ===== — venda KNRI11 com ganho (20%)
    operacoes.append(Operacao(
        id="op_009", veiculo_id="vec_pf_joao", ativo=knri11,
        tipo=TipoOperacao.VENDA_SWING, data=date(2026, 10, 22),
        quantidade=Decimal("400"), preco_unitario=Decimal("178"),
        valor_total=Decimal("71200"), custos=Decimal("36")
    ))

    # ===== NOVEMBRO ===== — distribuição PJ R$ 40k (junto com PL R$ 35k)
    operacoes.append(Operacao(
        id="op_dist_pj_nov", veiculo_id="vec_pf_joao",
        ativo=Ativo("DIST_PJ", "Distribuição Mendes Adv", ClasseAtivo.ACAO_BR),
        tipo=TipoOperacao.DISTRIBUICAO_PJ_PROPRIA, data=date(2026, 11, 20),
        valor_total=Decimal("40000"), fonte_pagadora_cnpj=cnpj_pj_propria
    ))

    # ===== DEZEMBRO ===== — venda parcial VOO no exterior
    operacoes.append(Operacao(
        id="op_010", veiculo_id="vec_pf_joao", ativo=voo,
        tipo=TipoOperacao.VENDA_SWING, data=date(2026, 12, 15),
        quantidade=Decimal("100"), preco_unitario=Decimal("510"),
        valor_total=Decimal("51000"), custos=Decimal("0"),
        taxa_cambio_ptax=Decimal("5.40")  # USD subiu
    ))

    return cliente, operacoes


# ============================================================================
# OUTPUT — relatório formatado
# ============================================================================


def f(v: Decimal, prefix: str = "R$") -> str:
    """Formata Decimal como moeda."""
    v = v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"{prefix} {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def imprimir_relatorio(engine: TaxEngine, cliente: Cliente, veiculo_id: str, ano: int):
    print("=" * 78)
    print(f"  TAXFLOW ADVISOR — Relatório Fiscal {ano}")
    print(f"  Cliente: {cliente.nome}  •  Veículo: {veiculo_id}")
    print("=" * 78)

    print("\n📊 APURAÇÃO MENSAL — DARF 6015 + IRRF Lei 15.270")
    print("-" * 78)
    print(f"{'Mês':<6}{'Vol.swing':>14}{'Ganho swing':>14}{'IR swing':>12}{'IR FII':>10}{'IR Day':>10}{'DARF':>12}{'IRRF 15.270':>12}")
    print("-" * 78)
    total_darf = Decimal("0")
    total_irrf_15270 = Decimal("0")
    for mes in range(1, 13):
        apm = engine.fechar_apuracao_mensal(veiculo_id, ano, mes)
        total_darf += apm.total_darf_6015
        total_irrf_15270 += apm.irrf_dividendos_lei_15270
        if (
            apm.volume_vendas_acao_swing > 0
            or apm.ganho_fii > 0
            or apm.ganho_acao_day > 0
            or apm.irrf_dividendos_lei_15270 > 0
            or apm.total_darf_6015 > 0
        ):
            print(
                f"{mes:02d}/{ano}{f(apm.volume_vendas_acao_swing,''):>15}"
                f"{f(apm.ganho_acao_swing,''):>14}{f(apm.ir_swing_acao,''):>12}"
                f"{f(apm.ir_fii_ganho,''):>10}{f(apm.ir_day,''):>10}"
                f"{f(apm.total_darf_6015,''):>12}{f(apm.irrf_dividendos_lei_15270,''):>12}"
            )
    print("-" * 78)
    print(f"{'TOTAL ANUAL':<6}{'':>14}{'':>14}{'':>12}{'':>10}{'':>10}{f(total_darf,''):>12}{f(total_irrf_15270,''):>12}")

    # Anual
    print("\n💰 CONSOLIDAÇÃO ANUAL")
    print("-" * 78)
    apa = engine.fechar_apuracao_anual(veiculo_id, ano)
    print(f"Renda total (base IRPFM):       {f(apa.renda_total_para_irpfm)}")
    print(f"IR já pago no ano:              {f(apa.ir_pago_no_ano)}")
    print(f"  • DARFs 6015:                 {f(total_darf)}")
    print(f"  • IRRF dividendos Lei 15.270: {f(total_irrf_15270)}")
    print(f"  • JCP IRRF 15%:               {f(sum((engine.apuracoes_mensais[(veiculo_id,ano,m)].jcp_irrf for m in range(1,13) if (veiculo_id,ano,m) in engine.apuracoes_mensais), Decimal('0')))}")
    print(f"  • IR exterior (Lei 14.754):   {f(apa.ir_exterior_brl)}")
    print(f"  • IR progressivo (pró-lab):   {f(sum((engine.apuracoes_mensais[(veiculo_id,ano,m)].ir_progressivo for m in range(1,13) if (veiculo_id,ano,m) in engine.apuracoes_mensais), Decimal('0')))}")

    print(f"\n🎯 IRPFM (Lei 15.270/2025)")
    print(f"Renda anual:                    {f(apa.renda_total_para_irpfm)}")
    aliquota = Regras.aliquota_irpfm(apa.renda_total_para_irpfm)
    print(f"Alíquota IRPFM aplicável:       {aliquota * 100:.2f}%")
    print(f"IRPFM bruto:                    {f(apa.irpfm_bruto)}")
    print(f"IR já pago (crédito):           {f(apa.ir_pago_no_ano)}")
    print(f"IRPFM devido (após crédito):    {f(apa.irpfm_devido)}")

    print("\n📍 POSIÇÕES FINAIS")
    print("-" * 78)
    for key, pos in engine.posicoes.items():
        if pos.quantidade > 0:
            print(
                f"  {pos.ativo.codigo:<10}  {pos.quantidade:>10}  custo médio {f(pos.custo_medio)}  "
                f"valor custo total {f(pos.custo_total_brl)}"
            )

    print("\n🚨 OPORTUNIDADES IDENTIFICADAS PELO ENGINE")
    print("-" * 78)
    # 1. Janela R$ 20k usada
    consumo_max_20k = max(
        (engine.apuracoes_mensais[(veiculo_id, ano, m)].volume_vendas_acao_swing
         for m in range(1, 13)
         if (veiculo_id, ano, m) in engine.apuracoes_mensais),
        default=Decimal("0")
    )
    print(f"  • Pico mensal de vendas swing: {f(consumo_max_20k)} "
          f"({'isenção respeitada' if consumo_max_20k <= Decimal('20000') else 'isenção quebrada — perdeu R$ 20k'})")
    # 2. Lei 15.270 dispara
    if total_irrf_15270 > 0:
        print(f"  • Lei 15.270 disparada {total_irrf_15270 > 0}: IRRF de {f(total_irrf_15270)} retido")
        print(f"    💡 Considerar redistribuir lucros 2025 (regra de transição) antes de 31/12/2025")
    # 3. IRPFM
    if apa.irpfm_devido > 0:
        print(f"  • IRPFM devido: {f(apa.irpfm_devido)} — explorar redutor anti-bitributação via PJ")
    else:
        margem = Regras.LIMITE_INFERIOR_IRPFM - apa.renda_total_para_irpfm
        if margem > Decimal("0"):
            print(f"  • Renda {f(margem)} abaixo do gatilho IRPFM — folga confortável")
    # 4. Exterior carga total
    if apa.ganho_exterior_brl > 0:
        print(f"  • Ganho exterior: {f(apa.ganho_exterior_brl)} — IR 15% = {f(apa.ir_exterior_brl)}")
        print(f"    💡 Em 5 anos, considere UCITS (CSPX/VUSA) em vez de VOO para reduzir carga em dividendos")

    print("\n" + "=" * 78)
    print(f"  Apuração finalizada. Operações processadas: {len(engine.operacoes)}")
    print("=" * 78)


# ============================================================================
# MAIN
# ============================================================================


def main():
    cliente, operacoes = criar_caso_joao()
    engine = TaxEngine()

    # Ingere operações (ordenadas por data)
    for op in sorted(operacoes, key=lambda o: o.data):
        engine.processar_operacao(op)

    # Imprime relatório
    imprimir_relatorio(engine, cliente, veiculo_id="vec_pf_joao", ano=2026)


if __name__ == "__main__":
    main()
