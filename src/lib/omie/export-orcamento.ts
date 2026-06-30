// ============================================================================
// Gera as planilhas de importação do Omie a partir de um orçamento unificado.
//   1 arquivo por bloco existente:
//     · servicos  → template Ordem de Serviço  (Omie_Ordens_Servico)
//     · produtos  → template Pedido de Venda    (estoque Sinaltran)
//     · sinalshop → template Pedido de Venda    (estoque Sinalshop)
//   Preenche os templates oficiais (src/lib/omie/templates) via fillXlsx.
// ============================================================================
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fillXlsx, type RowsMap } from "./xlsx-fill";
import { listServicosFiscais, type ServicoFiscal } from "@/lib/actions/servicos";
import type {
  OrcamentoDetalhe,
  OrcamentoBlocoComItens,
  OrcamentoItemRow,
} from "@/lib/types/orcamento";

// Valores padrão da Sinaltran no Omie (não vêm do orçamento).
const CFG = {
  // Conta Corrente é lookup do Omie (conta cadastrada no Omie de vocês).
  contaCorrente: "Banco do Brasil",
  // Categoria do Pedido = categoria do Omie por tipo (placas → vertical, tinta →
  // horizontal). "Categoria do Item" não é preenchida — o Omie deriva do produto.
  produtos: { categoria: "SINALIZAÇÃO VERTICAL", estoque: "Sinaltran" },
  sinalshop: { categoria: "SINALIZAÇÃO HORIZONTAL", estoque: "Sinalshop" },
};
// "Número de Parcelas" no Omie é uma LISTA (descrição do parcelamento), não um
// número. Valor padrão; vira campo editável por orçamento na tela de criação.
const NUM_PARCELAS = "1 Parcela";

// Perfil fiscal usado quando o item não casa com nenhum serviço do catálogo
// (o mais comum dos serviços Sinaltran). Município vem do próprio item.
const SERVICO_PADRAO = {
  categoria: "SERVIÇO DE SINALIZAÇÃO VIÁRIA HORIZONTAL",
  codigo_municipio: null as string | null,
  codigo_lc116: "7.02",
  codigo_nbs: null as string | null,
  aliquota_iss: 4,
  retem_iss: true,
  aliquota_inss: 11,
  retem_inss: true,
  tributacao: "TRIBUTADA INTEGRALMENTE COM ISSRF",
};

const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

// Palavra-chave da descrição → código do serviço do catálogo (ordem importa:
// "MANUTENÇÃO HORIZONTAL" antes de "HORIZONTAL", etc.).
const REGRAS: [RegExp, string][] = [
  [/MANUTEN/, "SRV00012"],
  [/SEMAF/, "SRV00011"],
  [/RETORREFLET/, "SRV00008"],
  [/DEFENSA/, "SRV00005"],
  [/EPOXI/, "SRV00004"],
  [/[OÓ]PTICA|TACH/, "SRV00003"],
  [/VERTICAL|PLACA/, "SRV00002"],
  [/HORIZONTAL|PINTURA|FAIXA|EIXO/, "SRV00001"],
  [/MOBILIZA/, "SRV00009"],
  [/LOCA[CÇ]AO/, "SRV00010"],
  [/DIARIA|EQUIPE/, "SRV00013"],
  [/INDUSTRIA|APARELHO|MONTAGEM/, "SRV00007"],
  [/PROJETO/, "SRV00006"],
];

/** Resolve o serviço fiscal de um item (por servico_id; senão pela descrição). */
function resolverServico(
  item: OrcamentoItemRow,
  servicos: ServicoFiscal[],
): ServicoFiscal | null {
  if (item.servico_id) {
    const s = servicos.find((x) => x.id === item.servico_id);
    if (s) return s;
  }
  const d = norm(item.descricao);
  for (const [re, codigo] of REGRAS) {
    if (re.test(d)) {
      const s = servicos.find((x) => x.codigo === codigo);
      if (s) return s;
    }
  }
  return null;
}

const simNao = (b: boolean) => (b ? "Sim" : "Não");

const TPL_DIR = join(process.cwd(), "src", "lib", "omie", "templates");

/** "2026-07-17" | Date → "17/07/2026" */
function dataBR(d: string | null): string {
  if (!d) return "";
  const m = String(d).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const m2 = String(d).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m2 ? `${m2[1]}/${m2[2]}/${m2[3]}` : "";
}

export type ArquivoOmie = { filename: string; buffer: Buffer };

async function gerarServicos(
  orc: OrcamentoDetalhe,
  bloco: OrcamentoBlocoComItens,
  cliente: string,
  servicos: ServicoFiscal[],
): Promise<ArquivoOmie> {
  const previsao = dataBR(bloco.previsao_faturamento || bloco.data_documento);
  const rows: RowsMap = {};
  bloco.itens.forEach((it, idx) => {
    const sv = resolverServico(it, servicos) ?? SERVICO_PADRAO;
    rows[6 + idx] = {
      B: orc.numero, // Código de Integração (agrupa a OS)
      C: cliente, // Cliente *
      D: previsao, // Previsão de Faturamento *
      E: NUM_PARCELAS, // Número de Parcelas *
      F: bloco.vendedor || "", // Vendedor
      H: sv.categoria || SERVICO_PADRAO.categoria, // Categoria * (do serviço)
      I: CFG.contaCorrente, // Conta Corrente *
      X: idx === 0 ? bloco.observacoes || "" : "", // Observações (1ª linha)
      AC: sv.tributacao || SERVICO_PADRAO.tributacao, // Tributação do Serviço *
      AD: sv.codigo_municipio || it.codigo_omie || "", // Cód. Serviço Município *
      AE: sv.codigo_lc116 || SERVICO_PADRAO.codigo_lc116, // Código LC116 *
      AF: sv.codigo_nbs || "", // Código NBS
      AG: Number(it.quantidade), // Quantidade *
      AH: Number(it.valor_unit_mao_obra), // Valor Unitário *
      AK: it.descricao, // Descrição do Serviço
      AM: sv.aliquota_iss, // % Alíquota do ISS
      AN: simNao(sv.retem_iss), // Reter ISS
      AO: 0, // % Alíquota do PIS
      AP: "Não", // Reter PIS
      AQ: 0, // % Alíquota do COFINS
      AR: "Não", // Reter COFINS
      AS: 0, // % Alíquota do CSLL
      AT: "Não", // Reter CSLL
      AU: 0, // % Alíquota do IR
      AV: "Não", // Reter IR
      AW: sv.aliquota_inss, // % Alíquota do INSS
      AX: simNao(sv.retem_inss), // Reter INSS
      AY: 0, // % Redução Base Cálc. INSS
      BB: cliente, // Destinatário *
    };
  });
  const tpl = await readFile(join(TPL_DIR, "ordens_servico.xlsx"));
  const buffer = await fillXlsx(tpl, "Omie_Ordens_Servico", rows);
  return { filename: `Orcamento-${orc.numero}-OS-servicos.xlsx`, buffer };
}

async function gerarPedido(
  orc: OrcamentoDetalhe,
  bloco: OrcamentoBlocoComItens,
  cliente: string,
): Promise<ArquivoOmie> {
  const cfg = bloco.tipo === "sinalshop" ? CFG.sinalshop : CFG.produtos;
  const rows: RowsMap = {
    7: {
      D: cliente, // Cliente *
      E: dataBR(bloco.previsao_faturamento || bloco.data_documento), // Previsão *
      F: cfg.categoria, // Categoria *
      G: NUM_PARCELAS, // Número de Parcelas *
      H: bloco.vendedor || "", // Vendedor
      J: CFG.contaCorrente, // Conta Corrente *
      N: bloco.observacoes || "", // Observações do Pedido
    },
  };
  bloco.itens.forEach((it, idx) => {
    rows[22 + idx] = {
      B: idx + 1, // # Item
      D: it.codigo_omie || it.descricao, // Produto (código ou descrição)
      E: cfg.estoque, // Local de Estoque *
      F: Number(it.quantidade), // Quantidade *
      G: Number(it.valor_unit_material), // Preço Unitário de Venda *
    };
  });
  const tpl = await readFile(join(TPL_DIR, "pedido_venda.xlsx"));
  const buffer = await fillXlsx(tpl, "Omie_Pedido_Venda", rows);
  return { filename: `Orcamento-${orc.numero}-PV-${bloco.tipo}.xlsx`, buffer };
}

/** Gera 1 arquivo Omie por bloco do orçamento. */
export async function gerarArquivosOmie(
  orc: OrcamentoDetalhe,
  servicosArg?: ServicoFiscal[],
): Promise<ArquivoOmie[]> {
  const cliente = orc.cliente?.razao_social ?? orc.cliente?.cnpj_cpf ?? "";
  const temServicos = (orc.blocos ?? []).some((b) => b.tipo === "servicos");
  const servicos = servicosArg ?? (temServicos ? await listServicosFiscais() : []);
  const arquivos: ArquivoOmie[] = [];
  for (const bloco of orc.blocos ?? []) {
    if (!bloco.itens?.length) continue;
    arquivos.push(
      bloco.tipo === "servicos"
        ? await gerarServicos(orc, bloco, cliente, servicos)
        : await gerarPedido(orc, bloco, cliente),
    );
  }
  return arquivos;
}
