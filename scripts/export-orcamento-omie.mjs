// ============================================================================
// Exporta um orçamento unificado para as planilhas de importação do Omie.
//   Sai 1 arquivo por bloco existente:
//     · servicos  → template Ordem de Serviço  (Omie_Ordens_Servico)
//     · produtos  → template Pedido de Venda    (estoque Sinaltran)
//     · sinalshop → template Pedido de Venda    (estoque Sinalshop)
//
// Uso:
//   DATABASE_URL=... node scripts/export-orcamento-omie.mjs "<numero-ou-obra>" [pastaSaida]
//   ex: ... "ORC-2026-003"      ou      ... "DOBIL (ARARICÁ)"
// ============================================================================

import pg from "pg";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fillXlsx } from "../src/lib/omie/xlsx-fill.mjs";

const ALVO = process.argv[2];
const OUT = process.argv[3] || "omie-export";
if (!ALVO) { console.error('Uso: DATABASE_URL=... node scripts/export-orcamento-omie.mjs "<numero-ou-obra>" [saida]'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL não definida."); process.exit(1); }

const ROOT = dirname(fileURLToPath(import.meta.url));
const TPL = {
  ordem_servico: join(ROOT, "../src/lib/omie/templates/ordens_servico.xlsx"),
  pedido_venda: join(ROOT, "../src/lib/omie/templates/pedido_venda.xlsx"),
};

// Valores padrão da Sinaltran no Omie (que não vêm do orçamento).
const CFG = {
  contaCorrente: "Itaú Unibanco",
  servicos: { categoria: "Receita de Serviços", tributacao: "Tributada Integralmente com ISS", lc116: "7.02" },
  produtos: { categoria: "Receita de Vendas", estoque: "Sinaltran" },
  sinalshop: { categoria: "Receita de Vendas", estoque: "Sinalshop" },
};
const PARCELAS = 1; // importados = boleto único; futura tela de criação terá o campo.

const sanitize = (s) => String(s).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
function dataBR(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d + "T00:00:00");
  if (isNaN(dt)) return "";
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

// ── Carrega o orçamento do banco ─────────────────────────────────────────────
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

const orc = (await db.query(
  `select o.id, o.numero, o.obra_nome, c.razao_social, c.cnpj_cpf
     from public.orcamentos o left join public.clientes c on c.id = o.cliente_id
    where o.numero = $1 or o.obra_nome = $1 limit 1`, [ALVO],
)).rows[0];
if (!orc) { console.error(`Orçamento não encontrado: ${ALVO}`); process.exit(1); }

const blocos = (await db.query(
  `select * from public.orcamento_blocos where orcamento_id = $1 order by tipo`, [orc.id],
)).rows;
for (const b of blocos) {
  b.itens = (await db.query(
    `select * from public.orcamento_itens where bloco_id = $1 order by ordem`, [b.id],
  )).rows;
}
await db.end();

const cliente = orc.razao_social || orc.cnpj_cpf || "";
mkdirSync(OUT, { recursive: true });
console.log(`📤 ${orc.numero} · ${orc.obra_nome} · cliente: ${cliente || "—"}`);

// ── Preenche um bloco de SERVIÇOS no template de Ordem de Serviço ────────────
async function exportServicos(bloco) {
  const previsao = dataBR(bloco.previsao_faturamento || bloco.data_documento);
  const rows = {};
  let r = 6;
  bloco.itens.forEach((it, idx) => {
    rows[r] = {
      B: orc.numero,                              // Código de Integração (agrupa a OS)
      C: cliente,                                 // Cliente *
      D: previsao,                                // Previsão de Faturamento *
      E: PARCELAS,                                // Número de Parcelas *
      F: bloco.vendedor || "",                    // Vendedor
      H: CFG.servicos.categoria,                  // Categoria *
      I: CFG.contaCorrente,                       // Conta Corrente *
      X: idx === 0 ? bloco.observacoes || "" : "",// Observações (só na 1ª linha)
      AC: CFG.servicos.tributacao,                // Tributação do Serviço *
      AD: it.codigo_omie || "",                   // Código do Serviço Município *
      AE: CFG.servicos.lc116,                     // Código LC116 *
      AG: Number(it.quantidade),                  // Quantidade *
      AH: Number(it.valor_unit_mao_obra),         // Valor Unitário *
      AK: it.descricao,                           // Descrição do Serviço
      BB: cliente,                                // Destinatário *
    };
    r++;
  });
  const buf = await fillXlsx(readFileSync(TPL.ordem_servico), "Omie_Ordens_Servico", rows);
  const file = join(OUT, `${sanitize(orc.numero)}_OS_servicos.xlsx`);
  writeFileSync(file, buf);
  return { file, linhas: bloco.itens.length };
}

// ── Preenche um bloco de PRODUTO/SINALSHOP no template de Pedido de Venda ─────
async function exportPedido(bloco) {
  const cfg = bloco.tipo === "sinalshop" ? CFG.sinalshop : CFG.produtos;
  const rows = {
    7: {
      D: cliente,                                       // Cliente *
      E: dataBR(bloco.previsao_faturamento || bloco.data_documento), // Previsão *
      F: cfg.categoria,                                 // Categoria *
      G: PARCELAS,                                      // Número de Parcelas *
      H: bloco.vendedor || "",                          // Vendedor
      J: CFG.contaCorrente,                             // Conta Corrente *
      N: bloco.observacoes || "",                       // Observações do Pedido
    },
  };
  let r = 22, n = 0;
  for (const it of bloco.itens) {
    rows[r] = {
      B: ++n,                                            // # Item
      D: it.codigo_omie || it.descricao,                // Produto (código ou descrição)
      E: cfg.estoque,                                    // Local de Estoque *
      F: Number(it.quantidade),                          // Quantidade *
      G: Number(it.valor_unit_material),                 // Preço Unitário de Venda *
    };
    r++;
  }
  const buf = await fillXlsx(readFileSync(TPL.pedido_venda), "Omie_Pedido_Venda", rows);
  const file = join(OUT, `${sanitize(orc.numero)}_PV_${bloco.tipo}_${bloco.omie_numero ?? ""}.xlsx`);
  writeFileSync(file, buf);
  return { file, linhas: bloco.itens.length };
}

for (const b of blocos) {
  const res = b.tipo === "servicos" ? await exportServicos(b) : await exportPedido(b);
  console.log(`  ✓ [${b.tipo}] ${res.linhas} item(ns) → ${res.file}`);
}
console.log(`\n✅ ${blocos.length} arquivo(s) gerado(s) em ${OUT}/`);
