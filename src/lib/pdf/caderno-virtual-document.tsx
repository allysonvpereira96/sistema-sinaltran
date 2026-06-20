import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  OCORRENCIA_TIPO_LABEL,
  type OcorrenciaTipo,
} from "@/lib/mocks/colaboradores";
import type { OcorrenciaCaderno } from "@/lib/actions/caderno-virtual";
import { LOGO_SINALTRAN } from "@/lib/pdf/logo-sinaltran";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Paleta — mesma do orçamento (consistência visual)
const AMARELO = "#EAB308";
const AMARELO_SOFT = "#FBE8A6";
const BORDA = "#B8B8B8";
const CINZA = "#555555";

// Tom de cada tipo (cores impressas legíveis em P&B também)
const TIPO_BG: Record<OcorrenciaTipo, string> = {
  falta: "#FEE2E2",
  atraso: "#FEF3C7",
  atestado: "#E0F2FE",
  advertencia: "#FFEDD5",
  suspensao: "#FECDD3",
  elogio: "#D1FAE5",
  observacao: "#F1F5F9",
  outro: "#F1F5F9",
  aumento_salario: "#D1FAE5",
  troca_funcao: "#EDE9FE",
  banco_horas: "#E0E7FF",
  viagem: "#CCFBF1",
};
const TIPO_FG: Record<OcorrenciaTipo, string> = {
  falta: "#9F1239",
  atraso: "#92400E",
  atestado: "#0369A1",
  advertencia: "#9A3412",
  suspensao: "#9F1239",
  elogio: "#065F46",
  observacao: "#334155",
  outro: "#334155",
  aumento_salario: "#065F46",
  troca_funcao: "#5B21B6",
  banco_horas: "#3730A3",
  viagem: "#0F766E",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 22,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headerInfo: { flexGrow: 1, paddingTop: 2 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 14, marginBottom: 2 },
  subtitle: { fontSize: 9, color: CINZA, marginBottom: 6 },
  filterLine: { fontSize: 8, color: CINZA, marginBottom: 1.5 },
  logoBox: { width: 140, alignItems: "flex-end" },
  logo: { width: 132, height: 36 },

  // KPIs
  kpiRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 0.7,
    borderColor: BORDA,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  kpiLabel: {
    fontSize: 7,
    color: CINZA,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  kpiValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginTop: 2,
  },

  // Tabela
  table: { borderWidth: 0.7, borderColor: BORDA, marginTop: 2 },
  rowHeader: {
    flexDirection: "row",
    backgroundColor: AMARELO,
  },
  row: { flexDirection: "row" },
  rowAlt: { flexDirection: "row", backgroundColor: "#F6F6F6" },
  cell: {
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: BORDA,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDA,
  },
  cellHeaderTxt: { fontFamily: "Helvetica-Bold", fontSize: 7.5 },

  // Faixa de data (separadora)
  dateBand: {
    flexDirection: "row",
    backgroundColor: AMARELO_SOFT,
  },
  dateBandText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 4,
    flexGrow: 1,
  },

  // Badge de tipo (inline na célula)
  tipoBadge: {
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 2,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
  },

  // Colunas
  cData: { width: 52 },
  cColab: { width: 120 },
  cMat: { width: 36, textAlign: "center" },
  cCargo: { width: 80 },
  cTipo: { width: 72 },
  cDias: { width: 30, textAlign: "center" },
  cDesc: { flexGrow: 1, flexBasis: 0 },

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

  empty: {
    paddingVertical: 30,
    textAlign: "center",
    color: CINZA,
    fontSize: 10,
  },
});

function formatarDataBR(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

function diaDaSemana(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return dias[d.getUTCDay()];
}

type CadernoDocumentProps = {
  ano: number;
  mes: number; // 1..12
  ocorrencias: OcorrenciaCaderno[];
  filtros: {
    tipo: string;
    centroCustoNome: string | null;
  };
};

export function CadernoVirtualDocument({
  ano,
  mes,
  ocorrencias,
  filtros,
}: CadernoDocumentProps) {
  // KPIs
  const totalRegistros = ocorrencias.length;
  const faltas = ocorrencias.filter((o) => o.tipo === "falta").length;
  const atestados = ocorrencias.filter((o) => o.tipo === "atestado").length;
  const advertencias = ocorrencias.filter(
    (o) => o.tipo === "advertencia" || o.tipo === "suspensao",
  ).length;

  // Ordenar por data crescente e agrupar
  const ordenadas = ocorrencias.slice().sort((a, b) => {
    if (a.data === b.data) return a.colaborador_nome.localeCompare(b.colaborador_nome);
    return a.data < b.data ? -1 : 1;
  });

  // Agrupar por data → cada bloco vira uma "seção" no PDF
  type Bloco = { data: string; itens: OcorrenciaCaderno[] };
  const blocos: Bloco[] = [];
  for (const o of ordenadas) {
    let b = blocos.find((x) => x.data === o.data);
    if (!b) {
      b = { data: o.data, itens: [] };
      blocos.push(b);
    }
    b.itens.push(o);
  }

  const tipoLabelFiltro =
    filtros.tipo && filtros.tipo !== "todos"
      ? OCORRENCIA_TIPO_LABEL[filtros.tipo as OcorrenciaTipo]
      : "Todos os tipos";

  return (
    <Document
      title={`Caderno Virtual ${MESES[mes - 1]}/${ano}`}
      author="Sinaltran"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Caderno Virtual</Text>
            <Text style={styles.subtitle}>
              Registro diário de ocorrências dos colaboradores · {MESES[mes - 1]} {ano}
            </Text>
            <Text style={styles.filterLine}>Tipo: {tipoLabelFiltro}</Text>
            {filtros.centroCustoNome ? (
              <Text style={styles.filterLine}>
                Centro de custo: {filtros.centroCustoNome}
              </Text>
            ) : null}
            <Text style={styles.filterLine}>
              Gerado em: {new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </Text>
          </View>
          <View style={styles.logoBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={LOGO_SINALTRAN} style={styles.logo} />
          </View>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Registros no mês</Text>
            <Text style={styles.kpiValue}>{totalRegistros}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Faltas</Text>
            <Text style={[styles.kpiValue, { color: TIPO_FG.falta }]}>{faltas}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Atestados</Text>
            <Text style={[styles.kpiValue, { color: TIPO_FG.atestado }]}>
              {atestados}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Advertências / Suspensões</Text>
            <Text style={[styles.kpiValue, { color: TIPO_FG.advertencia }]}>
              {advertencias}
            </Text>
          </View>
        </View>

        {/* Tabela */}
        {blocos.length === 0 ? (
          <View style={styles.empty}>
            <Text>Nenhuma ocorrência registrada no período.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.rowHeader}>
              <Text style={[styles.cell, styles.cData, styles.cellHeaderTxt]}>
                Data
              </Text>
              <Text style={[styles.cell, styles.cColab, styles.cellHeaderTxt]}>
                Colaborador
              </Text>
              <Text style={[styles.cell, styles.cMat, styles.cellHeaderTxt]}>
                Mat.
              </Text>
              <Text style={[styles.cell, styles.cCargo, styles.cellHeaderTxt]}>
                Cargo
              </Text>
              <Text style={[styles.cell, styles.cTipo, styles.cellHeaderTxt]}>
                Tipo
              </Text>
              <Text style={[styles.cell, styles.cDias, styles.cellHeaderTxt]}>
                Dias
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.cDesc,
                  styles.cellHeaderTxt,
                  { borderRightWidth: 0 },
                ]}
              >
                Descrição / Observações
              </Text>
            </View>

            {blocos.map((bloco) => (
              <View key={bloco.data}>
                {/* Faixa da data */}
                <View style={styles.dateBand} wrap={false}>
                  <Text style={styles.dateBandText}>
                    {formatarDataBR(bloco.data)} — {diaDaSemana(bloco.data)} ·{" "}
                    {bloco.itens.length}{" "}
                    {bloco.itens.length === 1 ? "registro" : "registros"}
                  </Text>
                </View>

                {bloco.itens.map((o, idx) => (
                  <View
                    key={o.id}
                    style={idx % 2 === 1 ? styles.rowAlt : styles.row}
                    wrap={false}
                  >
                    <Text style={[styles.cell, styles.cData]}>
                      {o.data_fim && o.dias_atestado && o.dias_atestado > 1
                        ? `${formatarDataBR(o.data)}\na ${formatarDataBR(o.data_fim)}`
                        : formatarDataBR(o.data)}
                    </Text>
                    <Text style={[styles.cell, styles.cColab]}>
                      {o.colaborador_nome}
                    </Text>
                    <Text style={[styles.cell, styles.cMat]}>
                      {o.colaborador_matricula ?? "—"}
                    </Text>
                    <Text style={[styles.cell, styles.cCargo]}>
                      {o.colaborador_cargo ?? "—"}
                    </Text>
                    <View style={[styles.cell, styles.cTipo]}>
                      <Text
                        style={[
                          styles.tipoBadge,
                          {
                            backgroundColor: TIPO_BG[o.tipo],
                            color: TIPO_FG[o.tipo],
                          },
                        ]}
                      >
                        {OCORRENCIA_TIPO_LABEL[o.tipo]}
                      </Text>
                    </View>
                    <Text style={[styles.cell, styles.cDias]}>
                      {o.dias_atestado ? `${o.dias_atestado}d` : "—"}
                    </Text>
                    <View style={[styles.cell, styles.cDesc, { borderRightWidth: 0 }]}>
                      <Text>{o.descricao}</Text>
                      {o.observacoes ? (
                        <Text style={{ marginTop: 2, color: CINZA, fontSize: 7 }}>
                          Obs.: {o.observacoes}
                        </Text>
                      ) : null}
                      {o.anexo_nome ? (
                        <Text
                          style={{
                            marginTop: 2,
                            color: TIPO_FG.atestado,
                            fontSize: 7,
                            fontFamily: "Helvetica-Bold",
                          }}
                        >
                          Anexo: {o.anexo_nome}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Sinaltran · Caderno Virtual</Text>
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
