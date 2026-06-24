import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { LOGO_SINALTRAN } from "@/lib/pdf/logo-sinaltran";

export type FichaEpiItem = {
  data_entrega: string;
  data_devolucao: string | null;
  quantidade: number;
  nome: string;
  ca: string | null;
};

export type FichaEpiProps = {
  empregado: string;
  funcao: string;
  admissao: string | null; // ISO
  itens: FichaEpiItem[];
  emissao: string; // DD/MM/AAAA
};

function dataBR(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

const BORDA = "#000000";

const s = StyleSheet.create({
  page: { paddingTop: 22, paddingBottom: 20, paddingHorizontal: 34, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  logoWrap: { alignItems: "center", marginBottom: 8 },
  logo: { width: 140, height: 46, objectFit: "contain" },
  tituloBox: { borderWidth: 1, borderColor: BORDA, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, alignSelf: "center", marginBottom: 9 },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 11, textAlign: "center", lineHeight: 1.25 },

  infoTable: { borderWidth: 1, borderColor: BORDA, marginBottom: 9 },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDA },
  infoRowLast: { flexDirection: "row" },
  infoLabel: { width: 110, fontFamily: "Helvetica-Bold", padding: 3, textAlign: "right", borderRightWidth: 1, borderColor: BORDA },
  infoValue: { flex: 1, padding: 3 },

  termo: { textAlign: "justify", lineHeight: 1.35, marginBottom: 6 },
  bold: { fontFamily: "Helvetica-Bold" },
  assLine: { marginTop: 3, marginBottom: 9 },

  table: { borderWidth: 1, borderColor: BORDA },
  th: { flexDirection: "row", backgroundColor: "#f0f0f0", borderBottomWidth: 1, borderColor: BORDA },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDA, minHeight: 18 },
  thCell: { fontFamily: "Helvetica-Bold", fontSize: 8, padding: 3, textAlign: "center", borderRightWidth: 1, borderColor: BORDA },
  tdCell: { fontSize: 8, padding: 3, borderRightWidth: 1, borderColor: BORDA, justifyContent: "center" },
  cData: { width: "13%", textAlign: "center" },
  cDev: { width: "13%", textAlign: "center" },
  cQt: { width: "6%", textAlign: "center" },
  cNome: { width: "40%" },
  cCa: { width: "12%", textAlign: "center" },
  cAss: { width: "16%", borderRightWidth: 0 },

  // página 2
  p2title: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 5 },
  par: { textAlign: "justify", lineHeight: 1.28, marginBottom: 3 },
  h: { fontFamily: "Helvetica-Bold", marginTop: 5, marginBottom: 2 },
  li: { marginLeft: 10, marginBottom: 1, lineHeight: 1.22 },
  italic: { fontFamily: "Helvetica-Oblique", textAlign: "justify", lineHeight: 1.28, marginBottom: 3 },
  cienteRow: { flexDirection: "row", marginTop: 12, alignItems: "flex-end" },
});

export function FichaEpiDocument({ empregado, funcao, admissao, itens, emissao }: FichaEpiProps) {
  // garante um mínimo de linhas em branco para preenchimento manual
  const linhas = [...itens];
  const minLinhas = 16;
  while (linhas.length < minLinhas) linhas.push({ data_entrega: "", data_devolucao: null, quantidade: 0, nome: "", ca: "" });

  return (
    <Document>
      {/* ── Página 1 ── */}
      <Page size="A4" style={s.page}>
        <View style={s.logoWrap}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, não é <img> */}
          <Image src={LOGO_SINALTRAN} style={s.logo} />
        </View>
        <View style={s.tituloBox}>
          <Text style={s.titulo}>FICHA DE COMPROVAÇÃO DE ENTREGA DE{"\n"}EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL – E.P.I.</Text>
        </View>

        <View style={s.infoTable}>
          <View style={s.infoRow}><Text style={s.infoLabel}>EMPREGADO (A):</Text><Text style={s.infoValue}>{empregado}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>FUNÇÃO:</Text><Text style={s.infoValue}>{funcao}</Text></View>
          <View style={s.infoRowLast}><Text style={s.infoLabel}>ADMISSÃO:</Text><Text style={s.infoValue}>{dataBR(admissao)}</Text></View>
        </View>

        <Text style={s.termo}>
          <Text style={s.bold}>TERMO DE RESPONSABILIDADE PELO USO E GUARDA: </Text>
          Eu, abaixo assinado, empregado (a) desta Instituição, declaro para os devidos fins que recebi os E.P.I.s
          abaixo discriminados, sendo treinado quanto ao uso adequado, guarda e higienização. Também fui informado
          da obrigação de utilização no decurso da jornada de trabalho permanentemente e estou ciente que o não uso
          ou o uso incorreto destes constitui falta grave, bem como ser de minha responsabilidade a conservação e
          guarda sob pena de ressarcimento ao empregador no caso de perda, extravio ou inutilização proposital de
          E.P.I., e, ainda, comprometo-me pela observância das disposições da PORTARIA MINISTERIAL 3214/78 e NR–6
          anexas no verso deste documento e demais considerações.
        </Text>
        <Text style={s.assLine}>Ass: ______________________________________________________________________</Text>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.thCell, s.cData]}>Data Entrega</Text>
            <Text style={[s.thCell, s.cDev]}>Data devolução</Text>
            <Text style={[s.thCell, s.cQt]}>QT.</Text>
            <Text style={[s.thCell, s.cNome]}>Nome do E.P.I.</Text>
            <Text style={[s.thCell, s.cCa]}>C.A - Cert. Aprovação</Text>
            <Text style={[s.thCell, s.cAss]}>Assinatura do empregado</Text>
          </View>
          {linhas.map((it, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdCell, s.cData]}>{dataBR(it.data_entrega)}</Text>
              <Text style={[s.tdCell, s.cDev]}>{dataBR(it.data_devolucao)}</Text>
              <Text style={[s.tdCell, s.cQt]}>{it.quantidade ? String(it.quantidade).padStart(2, "0") : ""}</Text>
              <Text style={[s.tdCell, s.cNome]}>{it.nome}</Text>
              <Text style={[s.tdCell, s.cCa]}>{it.ca ?? ""}</Text>
              <Text style={[s.tdCell, s.cAss]}> </Text>
            </View>
          ))}
        </View>
      </Page>

      {/* ── Página 2: extrato legal ── */}
      <Page size="A4" style={s.page}>
        <View style={s.tituloBox}>
          <Text style={s.titulo}>FICHA DE COMPROVAÇÃO DE ENTREGA DE{"\n"}EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL – E.P.I.</Text>
        </View>

        <Text style={s.p2title}>EXTRATO DA PORTARIA MINISTERIAL 3214/78 E NR - 6 EPI.</Text>

        <Text style={s.par}><Text style={s.bold}>Disposições Gerais: </Text>Segundo esta Portaria Ministerial, E.P.I. é assim definido:</Text>
        <Text style={s.par}>“É todo o dispositivo de uso individual destinado a proteger a integridade física do trabalhador, durante o exercício do trabalho, contra as consequências do acidente do trabalho e/ou das doenças profissionais.”</Text>

        <Text style={s.h}>Obrigações do Empregador:</Text>
        <Text style={s.par}>Obriga-se o empregador quanto ao E.P.I.:</Text>
        <Text style={s.li}>a) Adquirir o adequado ao risco de cada atividade;</Text>
        <Text style={s.li}>b) Exigir seu uso;</Text>
        <Text style={s.li}>c) Fornecer ao trabalhador somente o aprovado pelo órgão nacional competente em matéria de segurança e saúde no trabalho;</Text>
        <Text style={s.li}>d) Orientar e treinar o trabalhador sobre o uso adequado, guarda e conservação;</Text>
        <Text style={s.li}>e) Substituir imediatamente, quando danificado ou extraviado;</Text>
        <Text style={s.li}>f) Responsabilizar-se pela higienização e manutenção periódica;</Text>
        <Text style={s.li}>g) Comunicar ao MTE qualquer irregularidade observada; e,</Text>
        <Text style={s.li}>h) Registrar o seu fornecimento ao trabalhador, podendo ser adotados livros, fichas ou sistema eletrônico.</Text>

        <Text style={s.h}>Obrigações do Empregado:</Text>
        <Text style={s.par}>Obriga-se o empregado quanto ao E.P.I.:</Text>
        <Text style={s.li}>a) Usar, utilizando-o apenas para a finalidade a que se destina;</Text>
        <Text style={s.li}>b) Responsabilizar-se pela guarda e conservação;</Text>
        <Text style={s.li}>c) Comunicar ao empregador qualquer alteração que o torne impróprio para uso; e,</Text>
        <Text style={s.li}>d) Cumprir as determinações do empregador sobre o uso adequado.</Text>

        <Text style={s.italic}><Text style={s.bold}>NOTA: </Text>Manifesto o conhecimento que terei que devolver os E.P.I.s fornecidos pelo empregador em caso de desligamento da Instituição, estando ciente, ainda, que na eventualidade de PERDA OU EXTRAVIO OU INUTILIZAÇÃO DO EQUIPAMENTO POR ATO DOLOSO OU CULPOSO, estarei sujeito ao desconto do valor atualizado deste, em meu salário, conforme previsto no art. 462, §1º da CLT.</Text>
        <Text style={s.italic}>Também terei que devolver o E.P.I. que se tornar impróprio para o uso, seja por irregularidade verificada ou por desgaste natural, quando da substituição do equipamento.</Text>
        <Text style={s.italic}><Text style={s.bold}>OBSERVAÇÃO: </Text>A transgressão desta NORMA REGULAMENTADORA, A NÃO OBSERVÂNCIA DO USO DE E.P.I. NO DECURSO DE MEU TRABALHO, IMPLICARÁ EM ADVERTÊNCIA VERBAL, ESCRITA, SUSPENSÃO, OU APLICAÇÃO DE FALTA GRAVE NOS TERMOS DO ART. 482 DA CLT.</Text>

        <Text style={{ textAlign: "right", marginTop: 4 }}>Data: {emissao}</Text>
        <View style={s.cienteRow}>
          <Text>Ciente empregado: X</Text>
          <Text>______________________________________________________</Text>
        </View>
      </Page>
    </Document>
  );
}
