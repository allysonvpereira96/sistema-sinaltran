import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { OrcamentoDetalhe, OrcamentoItemRow } from "@/lib/types/orcamento";
import { formatBRL, formatCNPJ, formatDateBR, formatNumber } from "@/lib/format";

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
  // Cabeçalho
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headerInfo: { flexGrow: 1, alignItems: "center", paddingTop: 2 },
  headerLine: { fontSize: 7.5, marginBottom: 1.5 },
  headerLineBold: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  logoBox: {
    width: 124,
    alignItems: "flex-end",
  },
  logoMark: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: AMARELO,
    letterSpacing: 0.5,
  },
  logoSub: { fontSize: 5.5, color: CINZA, letterSpacing: 1.5, marginTop: 1 },
  // Tabela
  table: { borderWidth: 0.7, borderColor: BORDA, marginTop: 2 },
  rowHeader: {
    flexDirection: "row",
    backgroundColor: AMARELO,
  },
  rowSection: {
    flexDirection: "row",
    backgroundColor: AMARELO_SOFT,
  },
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
  // Larguras de coluna
  cNum: { width: 28, textAlign: "center" },
  cDesc: { flexGrow: 1, flexBasis: 0 },
  cUn: { width: 34, textAlign: "center" },
  cQtd: { width: 46, textAlign: "right" },
  cMoney: { width: 58, textAlign: "right" },
  cMoneyTot: { width: 66, textAlign: "right" },
  right: { textAlign: "right" },
  // Total
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
    alignItems: "center",
    gap: 12,
  },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  totalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#111",
  },
  // Condições
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

type Secao = { titulo: string; itens: OrcamentoItemRow[] };

function agruparSecoes(itens: OrcamentoItemRow[]): Secao[] {
  const out: Secao[] = [];
  for (const it of itens) {
    const titulo = it.secao?.trim() || "GERAL";
    let s = out.find((x) => x.titulo === titulo);
    if (!s) {
      s = { titulo, itens: [] };
      out.push(s);
    }
    s.itens.push(it);
  }
  return out;
}

export function OrcamentoDocument({ orcamento }: { orcamento: OrcamentoDetalhe }) {
  const empresa = orcamento.empresa;
  const cliente = orcamento.cliente;
  const secoes = agruparSecoes(orcamento.itens);

  const contatoResp = [
    orcamento.responsavel,
    empresa?.telefone,
    empresa?.email,
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

  return (
    <Document
      title={`Orçamento ${orcamento.numero}`}
      author={empresa?.razao_social ?? "Sinaltran"}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={{ width: 124 }} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerLineBold}>
              ORÇAMENTO FORNECIDO POR: {empresa?.razao_social ?? "—"}
            </Text>
            {empresa?.cnpj ? (
              <Text style={styles.headerLine}>CNPJ: {formatCNPJ(empresa.cnpj)}</Text>
            ) : null}
            {empresa?.endereco ? (
              <Text style={styles.headerLine}>
                {empresa.endereco}
                {empresa.cidade ? ` — ${empresa.cidade}/${empresa.estado ?? ""}` : ""}
              </Text>
            ) : null}
            {contatoResp ? (
              <Text style={styles.headerLine}>
                RESPONSÁVEL ORÇAMENTO: {contatoResp}
              </Text>
            ) : null}
            <Text style={styles.headerLine}>
              DADOS CLIENTE: {cliente?.razao_social ?? "—"}
              {cliente?.cnpj_cpf ? ` — CNPJ ${formatCNPJ(cliente.cnpj_cpf)}` : ""}
            </Text>
            <Text style={styles.headerLine}>
              Nº {orcamento.numero}
              {"   ·   "}
              DATA: {formatDateBR(orcamento.data_envio || orcamento.created_at)}
              {"   ·   "}
              VALIDADE:{" "}
              {orcamento.data_validade
                ? formatDateBR(orcamento.data_validade)
                : "—"}
            </Text>
          </View>
          <View style={styles.logoBox}>
            <Text style={styles.logoMark}>SINALTRAN</Text>
            <Text style={styles.logoSub}>SINALIZAÇÃO VIÁRIA</Text>
          </View>
        </View>

        {orcamento.descricao ? (
          <Text
            style={{
              fontFamily: "Helvetica-Bold",
              fontSize: 9,
              marginBottom: 4,
            }}
          >
            {orcamento.descricao}
          </Text>
        ) : null}

        {/* Tabela de itens */}
        <View style={styles.table}>
          {/* Cabeçalho de colunas */}
          <View style={styles.rowHeader}>
            <Text style={[styles.cell, styles.cNum, styles.cellHeaderTxt]}>#</Text>
            <Text style={[styles.cell, styles.cDesc, styles.cellHeaderTxt]}>
              Descrição
            </Text>
            <Text style={[styles.cell, styles.cUn, styles.cellHeaderTxt]}>Un.</Text>
            <Text style={[styles.cell, styles.cQtd, styles.cellHeaderTxt]}>Qtd.</Text>
            <Text style={[styles.cell, styles.cMoney, styles.cellHeaderTxt]}>
              Mão de obra
            </Text>
            <Text style={[styles.cell, styles.cMoney, styles.cellHeaderTxt]}>
              Material
            </Text>
            <Text style={[styles.cell, styles.cMoneyTot, styles.cellHeaderTxt]}>
              Total MO
            </Text>
            <Text style={[styles.cell, styles.cMoneyTot, styles.cellHeaderTxt]}>
              Total Mat.
            </Text>
            <Text
              style={[
                styles.cell,
                styles.cMoneyTot,
                styles.cellHeaderTxt,
                { borderRightWidth: 0 },
              ]}
            >
              Total Geral
            </Text>
          </View>

          {secoes.map((secao, si) => (
            <View key={secao.titulo} wrap={false}>
              {/* Faixa da seção */}
              <View style={styles.rowSection}>
                <Text
                  style={[
                    styles.cell,
                    { flexGrow: 1, fontFamily: "Helvetica-Bold", fontSize: 7.5 },
                  ]}
                >
                  {si + 1}.0 {secao.titulo}
                </Text>
              </View>

              {secao.itens.map((item, ii) => (
                <View
                  key={item.id}
                  style={ii % 2 === 1 ? styles.rowAlt : styles.row}
                >
                  <Text style={[styles.cell, styles.cNum]}>
                    {si + 1}.{ii + 1}
                  </Text>
                  <Text style={[styles.cell, styles.cDesc]}>{item.descricao}</Text>
                  <Text style={[styles.cell, styles.cUn]}>
                    {item.unidade_medida}
                  </Text>
                  <Text style={[styles.cell, styles.cQtd]}>
                    {formatNumber(item.quantidade)}
                  </Text>
                  <Text style={[styles.cell, styles.cMoney]}>
                    {brl(item.valor_unit_mao_obra)}
                  </Text>
                  <Text style={[styles.cell, styles.cMoney]}>
                    {brl(item.valor_unit_material)}
                  </Text>
                  <Text style={[styles.cell, styles.cMoneyTot]}>
                    {brl(item.valor_total_mao_obra)}
                  </Text>
                  <Text style={[styles.cell, styles.cMoneyTot]}>
                    {brl(item.valor_total_material)}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      styles.cMoneyTot,
                      { borderRightWidth: 0, fontFamily: "Helvetica-Bold" },
                    ]}
                  >
                    {formatBRL(item.valor_total)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Total geral */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL GERAL</Text>
          <Text style={styles.totalValue}>{formatBRL(orcamento.valor_total)}</Text>
        </View>

        {/* Condições de fornecimento */}
        <View style={styles.condBox} wrap={false}>
          <Text style={styles.condTitle}>Condições de fornecimento</Text>
          <Text style={styles.condLine}>Obra: {localObra}</Text>
          {orcamento.condicoes_pagamento ? (
            <Text style={styles.condLine}>
              Pagamento: {orcamento.condicoes_pagamento}
            </Text>
          ) : null}
          {orcamento.prazo_execucao ? (
            <Text style={styles.condLine}>
              Prazo de execução: {orcamento.prazo_execucao}
            </Text>
          ) : null}
          {engenheiro ? (
            <Text style={styles.condLine}>
              Engenheiro responsável: {engenheiro}
            </Text>
          ) : null}
          {orcamento.observacoes ? (
            <Text style={[styles.condLine, { marginTop: 3, color: CINZA }]}>
              {orcamento.observacoes}
            </Text>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {empresa?.razao_social ?? "Sinaltran"}
            {empresa?.cnpj ? ` — CNPJ ${formatCNPJ(empresa.cnpj)}` : ""}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Pág. ${pageNumber}/${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
