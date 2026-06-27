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
import type { OrcamentoDetalhe, OrcamentoBlocoComItens } from "@/lib/types/orcamento";

// Valores padrão da Sinaltran no Omie (não vêm do orçamento).
const CFG = {
  contaCorrente: "Itaú Unibanco",
  servicos: {
    categoria: "Receita de Serviços",
    tributacao: "Tributada Integralmente com ISS",
    lc116: "7.02",
  },
  produtos: { categoria: "Receita de Vendas", estoque: "Sinaltran" },
  sinalshop: { categoria: "Receita de Vendas", estoque: "Sinalshop" },
};
const PARCELAS = 1; // padrão p/ orçamentos importados (futura tela de criação terá o campo)

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
): Promise<ArquivoOmie> {
  const previsao = dataBR(bloco.previsao_faturamento || bloco.data_documento);
  const rows: RowsMap = {};
  bloco.itens.forEach((it, idx) => {
    rows[6 + idx] = {
      B: orc.numero, // Código de Integração (agrupa a OS)
      C: cliente, // Cliente *
      D: previsao, // Previsão de Faturamento *
      E: PARCELAS, // Número de Parcelas *
      F: bloco.vendedor || "", // Vendedor
      H: CFG.servicos.categoria, // Categoria *
      I: CFG.contaCorrente, // Conta Corrente *
      X: idx === 0 ? bloco.observacoes || "" : "", // Observações (1ª linha)
      AC: CFG.servicos.tributacao, // Tributação do Serviço *
      AD: it.codigo_omie || "", // Código do Serviço Município *
      AE: CFG.servicos.lc116, // Código LC116 *
      AG: Number(it.quantidade), // Quantidade *
      AH: Number(it.valor_unit_mao_obra), // Valor Unitário *
      AK: it.descricao, // Descrição do Serviço
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
      G: PARCELAS, // Número de Parcelas *
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
export async function gerarArquivosOmie(orc: OrcamentoDetalhe): Promise<ArquivoOmie[]> {
  const cliente = orc.cliente?.razao_social ?? orc.cliente?.cnpj_cpf ?? "";
  const arquivos: ArquivoOmie[] = [];
  for (const bloco of orc.blocos ?? []) {
    if (!bloco.itens?.length) continue;
    arquivos.push(
      bloco.tipo === "servicos"
        ? await gerarServicos(orc, bloco, cliente)
        : await gerarPedido(orc, bloco, cliente),
    );
  }
  return arquivos;
}
