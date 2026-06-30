import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { MedicaoDetalhe } from "@/lib/types/medicao";
import { itemPrecoUnit } from "@/lib/types/medicao";
import type { ObraDetalhe } from "@/lib/types/obra";
import { calcularSaldo } from "@/lib/types/obra";
import {
  formatBRL,
  formatCNPJ,
  formatDateBR,
  formatNumber,
  formatTelefone,
} from "@/lib/format";
import { LOGO_SINALTRAN } from "@/lib/pdf/logo-sinaltran";
import type { EmpresaPdfHeader } from "@/lib/pdf/orcamento-document";

const AMARELO = "#EAB308";
const AMARELO_SOFT = "#FBE8A6";
const BORDA = "#B8B8B8";
const CINZA = "#555555";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 22,
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  headerInfo: { flexGrow: 1, alignItems: "center", paddingTop: 2 },
  headerLine: { fontSize: 7.5, marginBottom: 1.5 },
  headerLineBold: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  logoBox: { width: 140, alignItems: "flex-end" },
  logo: { width: 132, height: 36 },
  faixa: {
    backgroundColor: AMARELO,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  faixaTxt: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  infoCell: { width: "50%", marginBottom: 2 },
  infoLabel: { fontFamily: "Helvetica-Bold", fontSize: 7 },
  table: { borderWidth: 0.7, borderColor: BORDA, marginTop: 2 },
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
  cellHeaderTxt: { fontFamily: "Helvetica-Bold", fontSize: 6.5 },
  cNum: { width: 22, textAlign: "center" },
  cDesc: { flexGrow: 1, flexBasis: 0 },
  cUn: { width: 30, textAlign: "center" },
  cQtd: { width: 50, textAlign: "right" },
  cPct: { width: 34, textAlign: "right" },
  cMoney: { width: 62, textAlign: "right" },
  cMoneyTot: { width: 72, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    alignItems: "center",
    gap: 12,
  },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#111" },
  assinaturas: { flexDirection: "row", justifyContent: "space-between", marginTop: 34, gap: 30 },
  assinBox: { flexGrow: 1, flexBasis: 0, alignItems: "center" },
  assinLinha: { borderTopWidth: 0.7, borderTopColor: "#333", width: "100%", marginBottom: 3 },
  assinTxt: { fontSize: 7.5, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: CINZA,
  },
});

export function MedicaoDocument({
  medicao,
  obra,
  empresa,
  anterior,
  logo,
}: {
  medicao: MedicaoDetalhe;
  obra?: ObraDetalhe | null;
  empresa?: EmpresaPdfHeader | null;
  anterior?: Record<string, number>;
  logo?: string | null;
}) {
  const cabecalho: EmpresaPdfHeader = empresa ?? {
    razao_social: "Sinaltran",
    cnpj: null,
    endereco: null,
    cidade: null,
    estado: null,
    telefone: null,
    email: null,
  };
  const logoSrc = logo === undefined ? LOGO_SINALTRAN : logo;
  const cliente = obra?.cliente ?? medicao.obra?.cliente ?? null;
  const ant = anterior ?? {};

  const obraNome = obra?.nome ?? medicao.obra?.nome ?? "—";
  const obraNumero = obra?.numero ?? medicao.obra?.numero ?? "";
  const contratoObra = obra?.valor_total ?? medicao.obra?.valor_total ?? 0;
  const saldo = obra
    ? calcularSaldo(obra.valor_total, medicao.obra_valor_medido)
    : null;

  const localObra = obra?.endereco
    ? `${obra.endereco}${obra.cidade ? ` — ${obra.cidade}/${obra.estado ?? ""}` : ""}`
    : obra?.cidade
      ? `${obra.cidade}/${obra.estado ?? ""}`
      : "—";

  const contato = [
    cabecalho.telefone ? formatTelefone(cabecalho.telefone) : null,
    cabecalho.email,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Document title={`Boletim de Medição ${medicao.numero} - ${obraNome}`} author={cabecalho.razao_social}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho empresa */}
        <View style={styles.header}>
          <View style={{ width: 140 }} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerLineBold}>{cabecalho.razao_social}</Text>
            {cabecalho.cnpj ? (
              <Text style={styles.headerLine}>CNPJ: {formatCNPJ(cabecalho.cnpj)}</Text>
            ) : null}
            {cabecalho.endereco ? (
              <Text style={styles.headerLine}>
                {cabecalho.endereco}
                {cabecalho.cidade ? ` — ${cabecalho.cidade}/${cabecalho.estado ?? ""}` : ""}
              </Text>
            ) : null}
            {contato ? <Text style={styles.headerLine}>{contato}</Text> : null}
          </View>
          <View style={styles.logoBox}>
            {logoSrc ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoSrc} style={styles.logo} />
            ) : null}
          </View>
        </View>

        {/* Faixa do título */}
        <View style={styles.faixa}>
          <Text style={styles.faixaTxt}>
            BOLETIM DE MEDIÇÃO Nº {String(medicao.numero).padStart(2, "0")}
          </Text>
          <Text style={styles.faixaTxt}>
            {formatDateBR(medicao.data_inicio)} a {formatDateBR(medicao.data_fim)}
          </Text>
        </View>

        {/* Dados da obra/cliente */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text>
              <Text style={styles.infoLabel}>Obra: </Text>
              {obraNome} ({obraNumero})
            </Text>
          </View>
          <View style={styles.infoCell}>
            <Text>
              <Text style={styles.infoLabel}>Cliente: </Text>
              {cliente?.razao_social ?? "—"}
            </Text>
          </View>
          <View style={styles.infoCell}>
            <Text>
              <Text style={styles.infoLabel}>Local: </Text>
              {localObra}
            </Text>
          </View>
          {obra?.numero_contrato ? (
            <View style={styles.infoCell}>
              <Text>
                <Text style={styles.infoLabel}>Contrato: </Text>
                {obra.numero_contrato}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoCell}>
            <Text>
              <Text style={styles.infoLabel}>Valor do contrato: </Text>
              {formatBRL(contratoObra)}
            </Text>
          </View>
          {saldo ? (
            <View style={styles.infoCell}>
              <Text>
                <Text style={styles.infoLabel}>Acumulado da obra: </Text>
                {formatBRL(medicao.obra_valor_medido)} ({saldo.percentual_executado.toFixed(1)}%)
              </Text>
            </View>
          ) : null}
        </View>

        {/* Tabela de itens */}
        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={[styles.cell, styles.cNum, styles.cellHeaderTxt]}>#</Text>
            <Text style={[styles.cell, styles.cDesc, styles.cellHeaderTxt]}>Descrição</Text>
            <Text style={[styles.cell, styles.cUn, styles.cellHeaderTxt]}>Un.</Text>
            <Text style={[styles.cell, styles.cQtd, styles.cellHeaderTxt]}>Contrat.</Text>
            <Text style={[styles.cell, styles.cQtd, styles.cellHeaderTxt]}>Acum. ant.</Text>
            <Text style={[styles.cell, styles.cQtd, styles.cellHeaderTxt]}>Período</Text>
            <Text style={[styles.cell, styles.cQtd, styles.cellHeaderTxt]}>Acumulada</Text>
            <Text style={[styles.cell, styles.cPct, styles.cellHeaderTxt]}>%</Text>
            <Text style={[styles.cell, styles.cMoney, styles.cellHeaderTxt]}>Vlr unit.</Text>
            <Text style={[styles.cell, styles.cMoneyTot, styles.cellHeaderTxt, { borderRightWidth: 0 }]}>
              Valor período
            </Text>
          </View>
          {medicao.itens.map((it, i) => {
            const antes = it.orcamento_item_id ? ant[it.orcamento_item_id] ?? 0 : 0;
            const acum = antes + it.quantidade_medida;
            const pct = it.quantidade_contratada
              ? (acum / it.quantidade_contratada) * 100
              : 0;
            const alt = i % 2 === 1;
            return (
              <View key={it.id} style={alt ? styles.rowAlt : styles.row}>
                <Text style={[styles.cell, styles.cNum]}>{i + 1}</Text>
                <Text style={[styles.cell, styles.cDesc]}>{it.descricao}</Text>
                <Text style={[styles.cell, styles.cUn]}>{it.unidade_medida}</Text>
                <Text style={[styles.cell, styles.cQtd]}>{formatNumber(it.quantidade_contratada)}</Text>
                <Text style={[styles.cell, styles.cQtd]}>{antes ? formatNumber(antes) : "—"}</Text>
                <Text style={[styles.cell, styles.cQtd, { fontFamily: "Helvetica-Bold" }]}>
                  {formatNumber(it.quantidade_medida)}
                </Text>
                <Text style={[styles.cell, styles.cQtd]}>{formatNumber(acum)}</Text>
                <Text style={[styles.cell, styles.cPct]}>{pct.toFixed(0)}%</Text>
                <Text style={[styles.cell, styles.cMoney]}>{formatBRL(itemPrecoUnit(it))}</Text>
                <Text style={[styles.cell, styles.cMoneyTot, { borderRightWidth: 0, fontFamily: "Helvetica-Bold" }]}>
                  {formatBRL(it.valor_total)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL DA MEDIÇÃO</Text>
          <Text style={styles.totalValue}>{formatBRL(medicao.valor_total)}</Text>
        </View>

        {medicao.observacoes ? (
          <Text style={{ marginTop: 8, fontSize: 7.5, color: CINZA }}>
            Observações: {medicao.observacoes}
          </Text>
        ) : null}

        {/* Assinaturas */}
        <View style={styles.assinaturas} wrap={false}>
          <View style={styles.assinBox}>
            <View style={styles.assinLinha} />
            <Text style={styles.assinTxt}>{cabecalho.razao_social}</Text>
            <Text style={[styles.assinTxt, { color: CINZA }]}>Responsável técnico</Text>
          </View>
          <View style={styles.assinBox}>
            <View style={styles.assinLinha} />
            <Text style={styles.assinTxt}>{cliente?.razao_social ?? "Cliente"}</Text>
            <Text style={[styles.assinTxt, { color: CINZA }]}>Fiscalização / aprovação</Text>
          </View>
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
