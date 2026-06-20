import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { OSDetalhe } from "@/lib/types/os";
import { OS_STATUS_LABEL } from "@/lib/types/os";

const PRETO = "#111111";
const AMARELO = "#FACC15";
const BORDA = "#222222";
const AZUL = "#1D4ED8";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: PRETO,
  },
  titleBand: {
    backgroundColor: PRETO,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDA,
  },
  titleText: {
    color: AMARELO,
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  table: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: BORDA,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDA,
  },
  rowLast: { flexDirection: "row" },
  labelCell: {
    width: 150,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: BORDA,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  valueCell: {
    flexGrow: 1,
    flexBasis: 0,
    paddingVertical: 5,
    paddingHorizontal: 8,
    color: AZUL,
  },

  sectionBand: {
    backgroundColor: "#808080",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDA,
  },
  sectionText: { fontFamily: "Helvetica-Bold", color: "#FFFFFF", fontSize: 10 },

  equipeRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDA,
  },
  equipeNum: {
    width: 150,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: BORDA,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  equipeNome: {
    flexGrow: 1,
    flexBasis: 0,
    paddingVertical: 5,
    paddingHorizontal: 8,
    color: AZUL,
  },

  obsBox: {
    minHeight: 70,
    padding: 8,
    color: AZUL,
  },
});

const horaCurta = (h: string | null | undefined) => (h ? h.slice(0, 5) : "");

function formatarDataBR(dataIso: string | null) {
  if (!dataIso) return "";
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  if (!ano) return "";
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.labelCell}>{label}</Text>
      <Text style={styles.valueCell}>{value}</Text>
    </View>
  );
}

export function OSDocument({ os }: { os: OSDetalhe }) {
  const clienteNome =
    os.cliente?.nome_fantasia ?? os.cliente?.razao_social ?? "";
  const veiculo = os.veiculo
    ? `${os.veiculo.descricao}${os.veiculo.placa ? ` (${os.veiculo.placa})` : ""}`
    : "";
  const obraLinha = [os.obra?.numero, os.pedido_omie ? `Pedido OMIE: ${os.pedido_omie}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document title={`O.S ${os.numero}`} author="Sinaltran">
      <Page size="A4" style={styles.page}>
        <View style={styles.titleBand}>
          <Text style={styles.titleText}>O.S DIÁRIO - EQUIPE TRECHO</Text>
        </View>

        <View style={styles.table}>
          <FieldRow label="DATA:" value={formatarDataBR(os.data)} />
          <FieldRow label="HORA SAÍDA:" value={horaCurta(os.hora_saida)} />
          <FieldRow label="HORA CHEGADA:" value={horaCurta(os.hora_chegada)} />
          <FieldRow label="CLIENTE:" value={clienteNome} />
          <FieldRow label="OBRA / Nº PEDIDO OMIE:" value={obraLinha} />
          <FieldRow label="CIDADE:" value={os.cidade ?? ""} />
          <FieldRow label="VEÍCULO:" value={veiculo} />
          <FieldRow label="ENCARREGADO:" value={os.encarregado?.nome_completo ?? ""} />
          <FieldRow label="MOTORISTA:" value={os.motorista?.nome_completo ?? ""} />
          <FieldRow
            label="Km Inicial:"
            value={os.km_inicial != null ? String(os.km_inicial) : ""}
          />
          <FieldRow
            label="Km Final:"
            value={os.km_final != null ? String(os.km_final) : ""}
          />

          {/* Equipe CLT */}
          <View style={styles.sectionBand}>
            <Text style={styles.sectionText}>EQUIPE CLT :</Text>
          </View>
          {os.equipe.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.labelCell}> </Text>
              <Text style={styles.valueCell}> </Text>
            </View>
          ) : (
            os.equipe.map((m, i) => (
              <View key={m.id} style={styles.equipeRow}>
                <Text style={styles.equipeNum}>{i + 1}-</Text>
                <Text style={styles.equipeNome}>{m.nome_completo}</Text>
              </View>
            ))
          )}

          {/* Diaristas */}
          <View style={styles.sectionBand}>
            <Text style={styles.sectionText}>DIARISTAS:</Text>
          </View>
          <View style={styles.rowLast}>
            <Text style={[styles.valueCell, { minHeight: 24 }]}>
              {os.diaristas ?? ""}
            </Text>
          </View>
        </View>

        {/* Observação */}
        <View style={[styles.table, { borderTopWidth: 1, marginTop: 12 }]}>
          <View style={styles.sectionBand}>
            <Text style={styles.sectionText}>OBSERVAÇÕES:</Text>
          </View>
          <Text style={styles.obsBox}>{os.observacoes ?? ""}</Text>
        </View>

        <Text style={{ marginTop: 10, fontSize: 7, color: "#666666" }}>
          {os.numero} · Status: {OS_STATUS_LABEL[os.status]} · Gerado em{" "}
          {new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </Text>
      </Page>
    </Document>
  );
}
