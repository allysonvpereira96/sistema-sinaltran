import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  OrcamentoDetalhe,
  OrcamentoItemRow,
  OrcamentoBlocoComItens,
  OrcamentoBlocoTipo,
} from "@/lib/types/orcamento";
import {
  formatBRL,
  formatCNPJ,
  formatDateBR,
  formatNumber,
  formatTelefone,
} from "@/lib/format";
import { LOGO_SINALTRAN } from "@/lib/pdf/logo-sinaltran";

// Paleta — amarelo de destaque da Sinaltran + cinzas de borda.
const AMARELO = "#EAB308";
const AMARELO_SOFT = "#FBE8A6";
const BORDA = "#B8B8B8";
const CINZA = "#555555";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 22,
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  headerInfo: { flexGrow: 1, alignItems: "center", paddingTop: 2 },
  headerLine: { fontSize: 7.5, marginBottom: 1.5 },
  headerLineBold: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  logoBox: { width: 140, alignItems: "flex-end" },
  logo: { width: 132, height: 36 },
  table: { borderWidth: 0.7, borderColor: BORDA, marginTop: 6 },
  rowHeader: { flexDirection: "row", backgroundColor: AMARELO },
  rowSection: { flexDirection: "row", backgroundColor: AMARELO_SOFT },
  row: { flexDirection: "row" },
  rowAlt: { flexDirection: "row", backgroundColor: "#F6F6F6" },
  cell: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderRightWidth: 0.5,
    borderRightColor: BORDA,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDA,
  },
  cellHeaderTxt: { fontFamily: "Helvetica-Bold", fontSize: 7 },
  cNum: { width: 30, textAlign: "center" },
  cDesc: { flexGrow: 1, flexBasis: 0 },
  cUn: { width: 38, textAlign: "center" },
  cQtd: { width: 56, textAlign: "right" },
  cMoney: { width: 78, textAlign: "right" },
  cMoneyTot: { width: 88, textAlign: "right" },
  subRow: { flexDirection: "row", justifyContent: "flex-end" },
  subLabel: { fontSize: 7, color: CINZA, paddingVertical: 1.5, paddingHorizontal: 6 },
  subValue: { fontSize: 7, paddingVertical: 1.5, paddingHorizontal: 6, width: 88, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    alignItems: "center",
    gap: 12,
  },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#111" },
  condBox: {
    marginTop: 14,
    borderWidth: 0.7,
    borderColor: BORDA,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  condTitle: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 4 },
  condLine: { fontSize: 8, marginBottom: 1.5 },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: CINZA,
  },
});

const brl = (v: number) => (v > 0 ? formatBRL(v) : "R$ -");

export type ConteudoPdf = "completo" | "servicos" | "produtos" | "sinalshop";

/** Dados da empresa exibidos no cabeçalho/rodapé (independe da empresa-líder). */
export type EmpresaPdfHeader = {
  razao_social: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email: string | null;
};

const TITULO_BLOCO: Record<OrcamentoBlocoTipo, string> = {
  servicos: "MÃO DE OBRA",
  produtos: "MATERIAL — PRODUTOS",
  sinalshop: "MATERIAL — TINTA",
};

const itemUnit = (i: OrcamentoItemRow) =>
  i.valor_unit_mao_obra > 0 ? i.valor_unit_mao_obra : i.valor_unit_material;

// ── Cabeçalho de colunas (simples: Descrição · Un · Qtd · Vlr unit · Total) ──
function ColunasHeader() {
  return (
    <View style={styles.rowHeader}>
      <Text style={[styles.cell, styles.cNum, styles.cellHeaderTxt]}>#</Text>
      <Text style={[styles.cell, styles.cDesc, styles.cellHeaderTxt]}>Descrição</Text>
      <Text style={[styles.cell, styles.cUn, styles.cellHeaderTxt]}>Un.</Text>
      <Text style={[styles.cell, styles.cQtd, styles.cellHeaderTxt]}>Qtd.</Text>
      <Text style={[styles.cell, styles.cMoney, styles.cellHeaderTxt]}>Vlr. unit.</Text>
      <Text style={[styles.cell, styles.cMoneyTot, styles.cellHeaderTxt, { borderRightWidth: 0 }]}>
        Total
      </Text>
    </View>
  );
}

function LinhaItem({ item, n, alt }: { item: OrcamentoItemRow; n: string; alt: boolean }) {
  return (
    <View style={alt ? styles.rowAlt : styles.row}>
      <Text style={[styles.cell, styles.cNum]}>{n}</Text>
      <Text style={[styles.cell, styles.cDesc]}>{item.descricao}</Text>
      <Text style={[styles.cell, styles.cUn]}>{item.unidade_medida}</Text>
      <Text style={[styles.cell, styles.cQtd]}>{formatNumber(item.quantidade)}</Text>
      <Text style={[styles.cell, styles.cMoney]}>{brl(itemUnit(item))}</Text>
      <Text style={[styles.cell, styles.cMoneyTot, { borderRightWidth: 0, fontFamily: "Helvetica-Bold" }]}>
        {formatBRL(item.valor_total)}
      </Text>
    </View>
  );
}

function SubLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.subRow}>
      <Text style={styles.subLabel}>{label}</Text>
      <Text style={styles.subValue}>{valor}</Text>
    </View>
  );
}

// ── Render por BLOCO (orçamentos unificados) ─────────────────────────────────
function SecaoBloco({ bloco, indice }: { bloco: OrcamentoBlocoComItens; indice: number }) {
  return (
    <View style={styles.table} wrap={false}>
      <View style={styles.rowSection}>
        <Text style={[styles.cell, { flexGrow: 1, fontFamily: "Helvetica-Bold", fontSize: 8, borderRightWidth: 0 }]}>
          {TITULO_BLOCO[bloco.tipo]}
        </Text>
      </View>
      <ColunasHeader />
      {bloco.itens.map((item, ii) => (
        <LinhaItem key={item.id} item={item} n={`${indice}.${ii + 1}`} alt={ii % 2 === 1} />
      ))}
      <SubLinha label="Subtotal" valor={formatBRL(bloco.valor_subtotal)} />
      {bloco.valor_ipi > 0 ? <SubLinha label="IPI" valor={formatBRL(bloco.valor_ipi)} /> : null}
      {bloco.valor_icms_st > 0 ? <SubLinha label="ICMS ST" valor={formatBRL(bloco.valor_icms_st)} /> : null}
      {bloco.valor_iss > 0 ? <SubLinha label="ISS" valor={formatBRL(bloco.valor_iss)} /> : null}
      {bloco.valor_frete > 0 ? <SubLinha label="Frete" valor={formatBRL(bloco.valor_frete)} /> : null}
      {bloco.valor_desconto > 0 ? <SubLinha label="Desconto" valor={`- ${formatBRL(bloco.valor_desconto)}`} /> : null}
      <SubLinha label="Total do bloco" valor={formatBRL(bloco.valor_total)} />
    </View>
  );
}

export function OrcamentoDocument({
  orcamento,
  empresa,
  conteudo = "completo",
  logo,
}: {
  orcamento: OrcamentoDetalhe;
  empresa?: EmpresaPdfHeader | null;
  conteudo?: ConteudoPdf;
  logo?: string | null;
}) {
  const cabecalho: EmpresaPdfHeader =
    empresa ??
    (orcamento.empresa
      ? {
          razao_social: orcamento.empresa.razao_social,
          cnpj: orcamento.empresa.cnpj,
          endereco: orcamento.empresa.endereco,
          cidade: orcamento.empresa.cidade,
          estado: orcamento.empresa.estado,
          telefone: orcamento.empresa.telefone,
          email: orcamento.empresa.email,
        }
      : { razao_social: "Sinaltran", cnpj: null, endereco: null, cidade: null, estado: null, telefone: null, email: null });

  const cliente = orcamento.cliente;
  const logoSrc = logo === undefined ? LOGO_SINALTRAN : logo;

  // Conteúdo: blocos filtrados (modelo unificado) ou itens (modelo antigo).
  const blocos = orcamento.blocos ?? [];
  const temBlocos = blocos.length > 0;
  const blocosExibidos = temBlocos
    ? conteudo === "completo"
      ? blocos
      : blocos.filter((b) => b.tipo === conteudo)
    : [];
  const itensFallback = temBlocos
    ? []
    : conteudo === "completo"
      ? orcamento.itens
      : conteudo === "servicos"
        ? orcamento.itens.filter((i) => i.valor_total_mao_obra > 0)
        : orcamento.itens.filter((i) => i.valor_total_material > 0);

  const totalGeral = temBlocos
    ? blocosExibidos.reduce((s, b) => s + b.valor_total, 0)
    : itensFallback.reduce((s, i) => s + i.valor_total, 0);

  const contatoResp = [
    orcamento.responsavel,
    cabecalho.telefone ? formatTelefone(cabecalho.telefone) : null,
    cabecalho.email,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const localObra = orcamento.endereco
    ? `${orcamento.endereco}${orcamento.cidade ? ` — ${orcamento.cidade}/${orcamento.estado ?? ""}` : ""}`
    : orcamento.cidade
      ? `${orcamento.cidade}/${orcamento.estado ?? ""}`
      : "—";

  const engenheiro = orcamento.engenheiro_responsavel
    ? `${orcamento.engenheiro_responsavel}${orcamento.crea_engenheiro ? ` — ${orcamento.crea_engenheiro}` : ""}`
    : null;

  const titulo = orcamento.obra_nome || orcamento.descricao || `Orçamento ${orcamento.numero}`;

  return (
    <Document title={`Orçamento ${orcamento.numero}`} author={cabecalho.razao_social}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={{ width: 140 }} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerLineBold}>
              ORÇAMENTO FORNECIDO POR: {cabecalho.razao_social}
            </Text>
            {cabecalho.cnpj ? (
              <Text style={styles.headerLine}>CNPJ: {formatCNPJ(cabecalho.cnpj)}</Text>
            ) : null}
            {cabecalho.endereco ? (
              <Text style={styles.headerLine}>
                {cabecalho.endereco}
                {cabecalho.cidade ? ` — ${cabecalho.cidade}/${cabecalho.estado ?? ""}` : ""}
              </Text>
            ) : null}
            {contatoResp ? (
              <Text style={styles.headerLine}>RESPONSÁVEL ORÇAMENTO: {contatoResp}</Text>
            ) : null}
            <Text style={styles.headerLine}>
              DADOS CLIENTE: {cliente?.razao_social ?? "—"}
              {cliente?.cnpj_cpf ? ` — CNPJ ${formatCNPJ(cliente.cnpj_cpf)}` : ""}
            </Text>
            <Text style={styles.headerLine}>
              Nº {orcamento.numero}
              {"   ·   "}DATA: {formatDateBR(orcamento.data_envio || orcamento.created_at)}
              {"   ·   "}VALIDADE:{" "}
              {orcamento.data_validade ? formatDateBR(orcamento.data_validade) : "—"}
            </Text>
          </View>
          <View style={styles.logoBox}>
            {logoSrc ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoSrc} style={styles.logo} />
            ) : null}
          </View>
        </View>

        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 2 }}>
          {titulo}
        </Text>

        {/* Itens */}
        {temBlocos ? (
          blocosExibidos.map((bloco, bi) => (
            <SecaoBloco key={bloco.id} bloco={bloco} indice={bi + 1} />
          ))
        ) : (
          <View style={styles.table}>
            <ColunasHeader />
            {itensFallback.map((item, ii) => (
              <LinhaItem key={item.id} item={item} n={`${ii + 1}`} alt={ii % 2 === 1} />
            ))}
          </View>
        )}

        {/* Total geral */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL GERAL</Text>
          <Text style={styles.totalValue}>{formatBRL(totalGeral)}</Text>
        </View>

        {/* Condições de fornecimento */}
        <View style={styles.condBox} wrap={false}>
          <Text style={styles.condTitle}>Condições de fornecimento</Text>
          <Text style={styles.condLine}>Obra: {localObra}</Text>
          {orcamento.condicoes_pagamento ? (
            <Text style={styles.condLine}>Pagamento: {orcamento.condicoes_pagamento}</Text>
          ) : null}
          {orcamento.prazo_execucao ? (
            <Text style={styles.condLine}>Prazo de execução: {orcamento.prazo_execucao}</Text>
          ) : null}
          {engenheiro ? (
            <Text style={styles.condLine}>Engenheiro responsável: {engenheiro}</Text>
          ) : null}
          {orcamento.observacoes ? (
            <Text style={[styles.condLine, { marginTop: 3, color: CINZA }]}>
              {orcamento.observacoes}
            </Text>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {cabecalho.razao_social}
            {cabecalho.cnpj ? ` — CNPJ ${formatCNPJ(cabecalho.cnpj)}` : ""}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
