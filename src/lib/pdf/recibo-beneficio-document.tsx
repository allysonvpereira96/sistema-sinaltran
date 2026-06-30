import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { LOGO_SINALTRAN } from "@/lib/pdf/logo-sinaltran";

export type ReciboBeneficioProps = {
  titulo: string;
  empregado: string;
  funcao: string;
  competencia: string; // MM/AAAA
  declaracao: string;
  /** Detalhamento opcional (combustível/VR). */
  linhas?: { label: string; valor: string }[];
  total?: string | null;
  emissao: string; // DD/MM/AAAA
};

const BORDA = "#000";
const s = StyleSheet.create({
  page: { paddingTop: 34, paddingHorizontal: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  logoWrap: { alignItems: "center", marginBottom: 16 },
  logo: { width: 150, height: 52, objectFit: "contain" },
  tituloBox: { borderWidth: 1, borderColor: BORDA, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: "center", marginBottom: 16 },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "center" },
  infoTable: { borderWidth: 1, borderColor: BORDA, marginBottom: 16 },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDA },
  infoRowLast: { flexDirection: "row" },
  infoLabel: { width: 120, fontFamily: "Helvetica-Bold", padding: 5, textAlign: "right", borderRightWidth: 1, borderColor: BORDA },
  infoValue: { flex: 1, padding: 5 },
  decl: { textAlign: "justify", lineHeight: 1.5, marginBottom: 18 },
  tabela: { borderWidth: 1, borderColor: BORDA, marginBottom: 16 },
  linha: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDA },
  linhaUlt: { flexDirection: "row" },
  cLabel: { flex: 1, padding: 5, borderRightWidth: 1, borderColor: BORDA },
  cVal: { width: 120, padding: 5, textAlign: "right" },
  totalRow: { flexDirection: "row", backgroundColor: "#f0f0f0" },
  totalLabel: { flex: 1, padding: 5, fontFamily: "Helvetica-Bold", borderRightWidth: 1, borderColor: BORDA },
  totalVal: { width: 120, padding: 5, textAlign: "right", fontFamily: "Helvetica-Bold" },
  ass: { marginTop: 40, alignItems: "center" },
  assLine: { borderTopWidth: 1, borderColor: BORDA, width: 320, marginBottom: 4 },
  data: { textAlign: "right", marginTop: 8, marginBottom: 24 },
});

export function ReciboBeneficioDocument({ titulo, empregado, funcao, competencia, declaracao, linhas, total, emissao }: ReciboBeneficioProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.logoWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
          <Image src={LOGO_SINALTRAN} style={s.logo} />
        </View>
        <View style={s.tituloBox}>
          <Text style={s.titulo}>{titulo}</Text>
        </View>

        <View style={s.infoTable}>
          <View style={s.infoRow}><Text style={s.infoLabel}>EMPREGADO (A):</Text><Text style={s.infoValue}>{empregado}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>FUNÇÃO:</Text><Text style={s.infoValue}>{funcao}</Text></View>
          <View style={s.infoRowLast}><Text style={s.infoLabel}>COMPETÊNCIA:</Text><Text style={s.infoValue}>{competencia}</Text></View>
        </View>

        <Text style={s.decl}>{declaracao}</Text>

        {linhas && linhas.length > 0 ? (
          <View style={s.tabela}>
            {linhas.map((l, i) => (
              <View key={i} style={i === linhas.length - 1 && !total ? s.linhaUlt : s.linha}>
                <Text style={s.cLabel}>{l.label}</Text>
                <Text style={s.cVal}>{l.valor}</Text>
              </View>
            ))}
            {total ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>TOTAL A RECEBER</Text>
                <Text style={s.totalVal}>{total}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={s.data}>Data: {emissao}</Text>

        <View style={s.ass}>
          <View style={s.assLine} />
          <Text>{empregado}</Text>
          <Text style={{ fontSize: 9, color: "#555" }}>Assinatura do empregado</Text>
        </View>
      </Page>
    </Document>
  );
}
