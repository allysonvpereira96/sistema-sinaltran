// ============================================================================
// Importa orçamentos do Omie (PDFs) para o modelo unificado em blocos.
//
// Estrutura esperada: uma PASTA por obra/serviço, com até 3 PDFs dentro:
//   ordem_de_servico_<n> ...   → bloco "servicos"   (Sinaltran)
//   pedido_de_venda_<n> ...    → bloco "produtos"   (Sinaltran)
//   orcamento_<n> ...          → bloco "sinalshop"  (Sinalshop)
//
// Uso:
//   npm i --no-save pdfjs-dist@4
//   # dry-run (só lê e imprime, não toca no banco):
//   node scripts/import-orcamentos-omie.mjs "<pasta-raiz-ou-da-obra>"
//   # gravar no banco:
//   DATABASE_URL='...' node scripts/import-orcamentos-omie.mjs "<pasta>" --commit
//
// Idempotente: re-rodar pula orçamentos já importados (origem=omie_import +
// mesmo obra_nome); use --force para apagar e reimportar.
// ============================================================================

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, extname } from "node:path";

const ROOT = process.argv[2];
const COMMIT = process.argv.includes("--commit");
const FORCE = process.argv.includes("--force");
if (!ROOT) {
  console.error('Uso: node scripts/import-orcamentos-omie.mjs "<pasta>" [--commit] [--force]');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const onlyDigits = (s) => (s ?? "").replace(/\D/g, "");
const norm = (s) =>
  (s ?? "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

/** "1.234,56" → 1234.56 */
function num(s) {
  if (s == null) return 0;
  const t = String(s).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}
/** "17/07/2026" → "2026-07-17" */
function dataBR(s) {
  const m = String(s ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const EMPRESA_POR_CNPJ = {
  "05336209000144": { nome: "Sinaltran", tipoProduto: "produtos" },
  "41981789000196": { nome: "Sinalshop", tipoProduto: "sinalshop" },
};

// ── Extração de linhas (reconstruídas por coordenada Y) ──────────────────────
async function extractLines(file) {
  const data = new Uint8Array(readFileSync(file));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const linhas = new Map();
    for (const it of tc.items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5]);
      if (!linhas.has(y)) linhas.set(y, []);
      linhas.get(y).push({ x: it.transform[4], s: it.str });
    }
    for (const y of [...linhas.keys()].sort((a, b) => b - a)) {
      const txt = linhas.get(y).sort((a, b) => a.x - b.x).map((o) => o.s).join(" ")
        .replace(/\s+/g, " ").trim();
      if (txt) out.push(txt);
    }
  }
  return out;
}

// ── Cabeçalho comum ──────────────────────────────────────────────────────────
function parseHeader(lines) {
  const find = (re) => { for (const l of lines) { const m = l.match(re); if (m) return m; } return null; };

  const empresaCnpj = onlyDigits(find(/CNPJ:\s*([\d./-]+)/)?.[1]);
  const numero = find(/(?:Pedido de Venda|Ordem de Serviço|Orçamento)\s*N[ºo°]\s*(\d+)/i)?.[1] ?? null;

  // Cliente: acha o "CNPJ:" do cliente (1º depois de "Informações do Cliente")
  //          e a razão social = linha logo ACIMA dele (o layout da OS intercala
  //          o endereço do emissor, então não dá pra usar idxCli+1).
  const idxCli = lines.findIndex((l) => /Informações do Cliente/i.test(l));
  let clienteNome = null, clienteCnpj = null;
  if (idxCli >= 0) {
    let idxCnpj = -1;
    for (let i = idxCli + 1; i < lines.length; i++) {
      const m = lines[i].match(/CNPJ:\s*([\d./-]+)/);
      if (m) { clienteCnpj = onlyDigits(m[1]); idxCnpj = i; break; }
    }
    const prev = idxCnpj > idxCli + 1 ? lines[idxCnpj - 1] : lines[idxCli + 1];
    clienteNome = prev && !/Informações do Cliente/i.test(prev) ? prev : null;
  }

  const dataDocumento = dataBR(find(/inclu[ií]do em:\s*([\d/]+)/i)?.[1]);
  const previsao = dataBR(find(/Previsão de Faturamento:\s*([\d/]+)/i)?.[1]);
  const vendedor = find(/Vendedor:\s*(.+)/i)?.[1]?.trim() ?? null;

  // Observações: linhas entre "Vendedor:" e "Gerado em"
  let obs = [];
  const idxV = lines.findIndex((l) => /Vendedor:/i.test(l));
  if (idxV >= 0) {
    for (let i = idxV + 1; i < lines.length; i++) {
      if (/Gerado em|Página \d+ de/i.test(lines[i])) break;
      obs.push(lines[i]);
    }
  }

  return {
    empresaCnpj, numero, clienteNome, clienteCnpj,
    dataDocumento, previsao, vendedor,
    observacoes: obs.join(" ").trim() || null,
  };
}

// ── Itens de PRODUTO (Pedido de Venda / Orçamento Sinalshop) ─────────────────
const RE_PROD = /^(\d{1,6})\s+(.+?)\s+(\d[\d.]*,\d{2,4})\s+([A-Za-zÀ-ÿ\d/]{1,12})\s+([\d.]+,\d{2,6})\s+([\d.]+,\d{2})$/;
const RE_NCM = /^\d{4}\.\d{2}(\.\d{2})?(\.\d{2})?$/;

function parseItensProduto(lines) {
  const ini = lines.findIndex((l) => /Código\s+Descrição\s+NCM/i.test(l));
  const fim = lines.findIndex((l) => /Subtotal:/i.test(l));
  if (ini < 0) return [];
  const seg = lines.slice(ini + 1, fim < 0 ? undefined : fim);
  const itens = [];
  for (const l of seg) {
    const m = l.match(RE_PROD);
    if (m) {
      let desc = m[2].trim();
      let ncm = null;
      // NCM pode estar grudado no fim da descrição.
      const partes = desc.split(/\s+/);
      const ult = partes[partes.length - 1];
      if (RE_NCM.test(ult)) { ncm = ult; desc = partes.slice(0, -1).join(" "); }
      itens.push({
        codigo_omie: m[1], descricao: desc, ncm,
        quantidade: num(m[3]), unidade: m[4],
        valor_unitario: num(m[5]), valor_total: num(m[6]),
      });
    } else if (RE_NCM.test(l) && itens.length) {
      if (!itens[itens.length - 1].ncm) itens[itens.length - 1].ncm = l;
    } else if (itens.length) {
      itens[itens.length - 1].descricao += " " + l.trim();
    }
  }
  return itens;
}

// ── Itens de SERVIÇO (Ordem de Serviço) ──────────────────────────────────────
const RE_SERV = /^(.+?)\s+(\d[\d.]*,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})$/;

function parseItensServico(lines) {
  const ini = lines.findIndex((l) => /Descrição do Serviço\s+Quantidade/i.test(l));
  const fim = lines.findIndex((l) => /^Total:/i.test(l));
  if (ini < 0) return [];
  const seg = lines.slice(ini + 1, fim < 0 ? undefined : fim);
  const itens = [];
  for (const l of seg) {
    const m = l.match(RE_SERV);
    if (m) {
      itens.push({
        codigo_omie: null, descricao: m[1].trim(), ncm: null,
        quantidade: num(m[2]), unidade: "UN",
        valor_unitario: num(m[3]), valor_total: num(m[4]),
      });
    } else if (itens.length) {
      itens[itens.length - 1].descricao += " " + l.trim();
    }
  }
  // Extrai "(Cód. 70202)" da descrição → codigo_omie
  for (const it of itens) {
    const m = it.descricao.match(/\(C[óo]d\.?\s*(\d+)\)/i);
    if (m) it.codigo_omie = m[1];
  }
  return itens;
}

// ── Rodapé (totais) ──────────────────────────────────────────────────────────
// O Omie às vezes quebra "Rótulo:" e o valor em linhas separadas (e o valor
// pode vir ACIMA do rótulo). Busca na mesma linha; senão na linha vizinha.
function valorRotulado(lines, label) {
  const reSame = new RegExp(label + "\\s*:?\\s*([\\d.]+,\\d{2})", "i");
  const reOnly = new RegExp("^" + label + "\\s*:?\\s*$", "i");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(reSame);
    if (m) return num(m[1]);
    if (reOnly.test(lines[i].trim())) {
      for (const j of [i - 1, i + 1]) {
        const mm = lines[j]?.match(/^([\d.]+,\d{2})$/);
        if (mm) return num(mm[1]);
      }
    }
  }
  return 0;
}
function valorTotalGeral(lines) {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/Subtotal/i.test(l) || /Total do ISS/i.test(l)) continue;
    const m = l.match(/\bTotal:\s*([\d.]+,\d{2})/i);
    if (m) return num(m[1]);
    if (/^Total:?\s*$/i.test(l)) {
      for (const j of [i - 1, i + 1]) {
        const mm = lines[j]?.match(/^([\d.]+,\d{2})$/);
        if (mm) return num(mm[1]);
      }
    }
  }
  return 0;
}
function parseTotais(lines, isServico) {
  if (isServico) {
    const total = valorTotalGeral(lines);
    const iss = valorRotulado(lines, "Total do ISS");
    return { valor_subtotal: total, valor_ipi: 0, valor_icms_st: 0, valor_iss: iss, valor_total: total };
  }
  return {
    valor_subtotal: valorRotulado(lines, "Subtotal"),
    valor_ipi: valorRotulado(lines, "IPI"),
    valor_icms_st: valorRotulado(lines, "ICMS ST"),
    valor_iss: 0,
    valor_total: valorTotalGeral(lines),
  };
}

// ── Classifica um PDF em bloco ───────────────────────────────────────────────
function classificar(fileName, header) {
  const n = norm(fileName);
  const emp = EMPRESA_POR_CNPJ[header.empresaCnpj];
  if (n.startsWith("ORDEM_DE_SERVICO") || /SERVICOS/.test(n))
    return { tipo: "servicos", omie_doc_tipo: "ordem_servico", isServico: true };
  if (n.startsWith("PEDIDO_DE_VENDA"))
    return { tipo: emp?.tipoProduto ?? "produtos", omie_doc_tipo: "pedido_venda", isServico: false };
  if (n.startsWith("ORCAMENTO"))
    return { tipo: emp?.tipoProduto ?? "sinalshop", omie_doc_tipo: "orcamento", isServico: false };
  // fallback pelo emissor
  return emp?.nome === "Sinalshop"
    ? { tipo: "sinalshop", omie_doc_tipo: "orcamento", isServico: false }
    : { tipo: "produtos", omie_doc_tipo: "pedido_venda", isServico: false };
}

// ── Processa uma pasta de obra ───────────────────────────────────────────────
async function processarObra(dir) {
  const pdfs = readdirSync(dir).filter((f) => extname(f).toLowerCase() === ".pdf");
  if (!pdfs.length) return null;
  const obraNome = basename(dir);
  const blocos = [];
  for (const f of pdfs) {
    const lines = await extractLines(join(dir, f));
    const header = parseHeader(lines);
    const cls = classificar(f, header);
    const itens = cls.isServico ? parseItensServico(lines) : parseItensProduto(lines);
    const totais = parseTotais(lines, cls.isServico);
    blocos.push({ arquivo: f, ...cls, header, itens, totais });
  }
  return { obraNome, blocos };
}

// ── Relatório / validação ────────────────────────────────────────────────────
function relatar(obra) {
  console.log(`\n📁 ${obra.obraNome}`);
  let totalObra = 0;
  for (const b of obra.blocos) {
    const somaItens = b.itens.reduce((s, i) => s + i.valor_total, 0);
    const okItens = Math.abs(somaItens - b.totais.valor_subtotal) < 0.05;
    totalObra += b.totais.valor_total;
    console.log(
      `  ┌ [${b.tipo.toUpperCase()}] ${b.omie_doc_tipo} Nº ${b.header.numero}` +
      ` · ${b.itens.length} itens · subtotal ${b.totais.valor_subtotal.toFixed(2)}` +
      ` (Σitens ${somaItens.toFixed(2)} ${okItens ? "✓" : "✗ DIVERGE"})` +
      ` · total ${b.totais.valor_total.toFixed(2)}`,
    );
    console.log(`  │  cliente: ${b.header.clienteNome} (${b.header.clienteCnpj}) · emissor ${b.header.empresaCnpj}`);
    for (const i of b.itens) {
      console.log(
        `  │   - ${(i.codigo_omie ?? "—").padEnd(6)} ${i.descricao.slice(0, 60).padEnd(60)}` +
        ` ${String(i.quantidade).padStart(7)} ${i.unidade.padEnd(5)} x ${i.valor_unitario.toFixed(2).padStart(10)} = ${i.valor_total.toFixed(2).padStart(11)}`,
      );
    }
    console.log("  └");
  }
  console.log(`  TOTAL DA OBRA: R$ ${totalObra.toFixed(2)}`);
  return totalObra;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function listarObras(root) {
  // Se a própria pasta tem PDFs, é uma obra; senão, cada subpasta é uma obra.
  const temPdfDireto = readdirSync(root).some((f) => extname(f).toLowerCase() === ".pdf");
  if (temPdfDireto) return [root];
  return readdirSync(root)
    .map((d) => join(root, d))
    .filter((p) => statSync(p).isDirectory());
}

const obras = listarObras(ROOT);
console.log(`🔎 ${obras.length} pasta(s) de obra encontrada(s). Modo: ${COMMIT ? "COMMIT" : "DRY-RUN"}`);

const parsed = [];
for (const dir of obras) {
  const obra = await processarObra(dir);
  if (obra) { relatar(obra); parsed.push(obra); }
}

if (!COMMIT) {
  console.log(`\n✅ Dry-run concluído: ${parsed.length} obra(s) lida(s). Nada gravado.`);
  console.log("   Para gravar: adicione --commit e defina DATABASE_URL.");
  process.exit(0);
}

// ── Gravação no banco ────────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error("\n❌ --commit exige DATABASE_URL definida.");
  process.exit(1);
}
const pg = (await import("pg")).default;
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

// user_id: usa o admin (orçamentos exigem user_id NOT NULL)
const { rows: admins } = await db.query(
  `select id from public.profiles where role = 'admin' order by created_at limit 1`,
);
const userId = admins[0]?.id;
if (!userId) { console.error("Sem usuário admin para atribuir user_id."); process.exit(1); }

const empresaIdPorCnpj = {};
{
  const { rows } = await db.query(`select id, cnpj from public.empresas`);
  for (const r of rows) empresaIdPorCnpj[onlyDigits(r.cnpj)] = r.id;
}

async function clienteIdPorCnpj(cnpj) {
  if (!cnpj) return null;
  const { rows } = await db.query(
    `select id from public.clientes where regexp_replace(coalesce(cnpj_cpf,''),'\\D','','g') = $1 limit 1`,
    [cnpj],
  );
  return rows[0]?.id ?? null;
}

async function proximoNumero() {
  const ano = new Date().getFullYear();
  const pref = `ORC-${ano}-`;
  const { rows } = await db.query(
    `select numero from public.orcamentos where numero like $1`, [`${pref}%`],
  );
  let max = 0;
  for (const r of rows) { const n = Number(String(r.numero).slice(pref.length)); if (n > max) max = n; }
  return `${pref}${String(max + 1).padStart(3, "0")}`;
}

let gravados = 0, pulados = 0;
for (const obra of parsed) {
  const cnpjCli = obra.blocos.find((b) => b.header.clienteCnpj)?.header.clienteCnpj ?? null;
  const cliente_id = await clienteIdPorCnpj(cnpjCli);
  if (!cliente_id) console.warn(`  ⚠ cliente CNPJ ${cnpjCli} não encontrado — gravando sem cliente_id`);

  // Idempotência
  const { rows: existe } = await db.query(
    `select id from public.orcamentos where origem='omie_import' and obra_nome=$1`, [obra.obraNome],
  );
  if (existe.length) {
    if (!FORCE) { console.log(`  ↷ pulado (já importado): ${obra.obraNome}`); pulados++; continue; }
    await db.query(`delete from public.orcamentos where id = $1`, [existe[0].id]); // cascateia blocos+itens
  }

  const valorTotal = obra.blocos.reduce((s, b) => s + b.totais.valor_total, 0);
  const numero = await proximoNumero();
  const empresaLead = empresaIdPorCnpj["05336209000144"] ?? null;
  const cab = obra.blocos[0]?.header ?? {};

  const { rows: orc } = await db.query(
    `insert into public.orcamentos
       (numero, empresa_id, cliente_id, responsavel, descricao, status,
        valor_total, origem, obra_nome, observacoes, user_id)
     values ($1,$2,$3,$4,$5,'aprovado',$6,'omie_import',$7,$8,$9)
     returning id`,
    [numero, empresaLead, cliente_id, cab.vendedor ?? null, obra.obraNome,
     valorTotal, obra.obraNome, cab.observacoes ?? null, userId],
  );
  const orcamentoId = orc[0].id;

  for (const b of obra.blocos) {
    const { rows: bl } = await db.query(
      `insert into public.orcamento_blocos
         (orcamento_id, tipo, empresa_id, omie_doc_tipo, omie_numero, vendedor,
          data_documento, previsao_faturamento, valor_subtotal, valor_ipi,
          valor_icms_st, valor_iss, valor_total, observacoes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       returning id`,
      [orcamentoId, b.tipo, empresaIdPorCnpj[b.header.empresaCnpj] ?? null,
       b.omie_doc_tipo, b.header.numero, b.header.vendedor, b.header.dataDocumento,
       b.header.previsao, b.totais.valor_subtotal, b.totais.valor_ipi,
       b.totais.valor_icms_st, b.totais.valor_iss, b.totais.valor_total, b.header.observacoes],
    );
    const blocoId = bl[0].id;
    let ordem = 0;
    for (const i of b.itens) {
      const mo = b.isServico;
      await db.query(
        `insert into public.orcamento_itens
           (orcamento_id, bloco_id, ordem, codigo_omie, ncm, descricao,
            unidade_medida, quantidade, valor_unit_mao_obra, valor_unit_material,
            valor_total_mao_obra, valor_total_material, valor_total)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [orcamentoId, blocoId, ++ordem, i.codigo_omie, i.ncm, i.descricao,
         i.unidade, i.quantidade,
         mo ? i.valor_unitario : 0, mo ? 0 : i.valor_unitario,
         mo ? i.valor_total : 0, mo ? 0 : i.valor_total, i.valor_total],
      );
    }
  }
  console.log(`  ✓ gravado: ${obra.obraNome} → ${numero} (R$ ${valorTotal.toFixed(2)})`);
  gravados++;
}

await db.end();
console.log(`\n✅ Commit concluído: ${gravados} gravado(s), ${pulados} pulado(s).`);
