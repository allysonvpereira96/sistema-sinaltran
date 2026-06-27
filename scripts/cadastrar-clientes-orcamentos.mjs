// ============================================================================
// Cadastra clientes faltantes a partir dos PDFs do Omie e vincula os
// orçamentos importados (origem=omie_import) que ficaram sem cliente_id.
//
// Usa o PDF de layout ROTULADO (pedido_de_venda_* ou orcamento_*), que traz
// Endereço/Bairro/Cidade/CEP/Telefone/Email com rótulos.
//
// Uso:
//   node scripts/cadastrar-clientes-orcamentos.mjs "<pasta-raiz>"            (dry-run)
//   DATABASE_URL=... node scripts/cadastrar-clientes-orcamentos.mjs "<raiz>" --commit
// ============================================================================

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

const ROOT = process.argv[2];
const COMMIT = process.argv.includes("--commit");
if (!ROOT) { console.error('Uso: node scripts/cadastrar-clientes-orcamentos.mjs "<raiz>" [--commit]'); process.exit(1); }

const onlyDigits = (s) => (s ?? "").replace(/\D/g, "");

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
      const t = linhas.get(y).sort((a, b) => a.x - b.x).map((o) => o.s).join(" ").replace(/\s+/g, " ").trim();
      if (t) out.push(t);
    }
  }
  return out;
}

const STOPS = "(?:CNPJ:|Inscri[çc][ãa]o Estadual:|Endere[çc]o:|Bairro:|Telefone:|Email:|Cidade:)";
const grab = (s, label) => {
  const m = s.match(new RegExp(label + "\\s*(.*?)\\s*(?=" + STOPS + "|$)", "i"));
  return m ? m[1].trim() || null : null;
};

function parseCliente(lines) {
  const idxCli = lines.findIndex((l) => /Informações do Cliente/i.test(l));
  const idxFim = lines.findIndex((l) => /Itens d[oa]|Lista dos Servi[çc]os/i.test(l));
  if (idxCli < 0) return null;
  const region = lines.slice(idxCli + 1, idxFim < 0 ? idxCli + 8 : idxFim);
  const ehLabel = (l) => new RegExp("^" + STOPS, "i").test(l);
  const razao = region.find((l) => l && !ehLabel(l)) ?? null;
  const joined = region.join(" ");
  const cnpj = onlyDigits((joined.match(/CNPJ:\s*([\d./-]+)/) || [])[1]);
  const cidadeBloco = grab(joined, "Cidade:") || "";
  const mc = cidadeBloco.match(/(.+?)\s*-\s*([A-Z]{2})\s*-\s*CEP:\s*([\d.-]+)/i);
  const tel = grab(joined, "Telefone:");
  const telLimpo = tel ? (tel.match(/\(?\d{2}\)?\s*\d?\s*\d{4,5}-?\d{4}/) || [tel])[0].trim() : null;
  return {
    razao_social: razao,
    cnpj_cpf: cnpj || null,
    inscricao_estadual: grab(joined, "Inscri[çc][ãa]o Estadual:"),
    endereco: grab(joined, "Endere[çc]o:"),
    bairro: grab(joined, "Bairro:"),
    telefone: telLimpo,
    email: grab(joined, "Email:"),
    cidade: mc ? mc[1].trim() : null,
    estado: mc ? mc[2].toUpperCase() : null,
    cep: mc ? mc[3] : null,
  };
}

function pdfRotulado(dir) {
  const pdfs = readdirSync(dir).filter((f) => extname(f).toLowerCase() === ".pdf");
  return pdfs.find((f) => /^pedido_de_venda_/i.test(f)) || pdfs.find((f) => /^orcamento_/i.test(f)) || null;
}

const obras = readdirSync(ROOT).map((d) => join(ROOT, d)).filter((p) => {
  try { return statSync(p).isDirectory(); } catch { return false; }
});

const db = COMMIT ? new (await import("pg")).default.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;
if (db) await db.connect();

let cadastrados = 0, vinculados = 0, jaExistia = 0;
for (const dir of obras) {
  const obraNome = basename(dir);
  // Só interessa obras cujo orçamento está sem cliente.
  if (db) {
    const { rows } = await db.query(
      `select id, cliente_id from public.orcamentos where origem='omie_import' and obra_nome=$1`, [obraNome],
    );
    if (!rows.length || rows.every((r) => r.cliente_id)) continue;
  }
  const f = pdfRotulado(dir);
  if (!f) { console.log(`  ⚠ ${obraNome}: sem PDF rotulado (só OS) — pular`); continue; }
  const cli = parseCliente(await extractLines(join(dir, f)));
  if (!cli?.cnpj_cpf || !cli?.razao_social) { console.log(`  ⚠ ${obraNome}: não extraiu cliente`); continue; }
  console.log(`\n📁 ${obraNome}`);
  console.log(`   ${cli.razao_social} · ${cli.cnpj_cpf} · ${cli.cidade ?? "?"}/${cli.estado ?? "?"} · ${cli.telefone ?? "-"} · ${cli.email ?? "-"}`);

  if (!db) continue;

  // Cliente já existe (por CNPJ)?
  let clienteId;
  const ex = await db.query(
    `select id from public.clientes where regexp_replace(coalesce(cnpj_cpf,''),'\\D','','g')=$1 limit 1`, [cli.cnpj_cpf],
  );
  if (ex.rows.length) { clienteId = ex.rows[0].id; jaExistia++; console.log("   ↷ já existia na base"); }
  else {
    const endereco = [cli.endereco, cli.bairro].filter(Boolean).join(", ") || null;
    const obs = ["Cadastrado via importação de orçamentos do Omie",
      cli.inscricao_estadual ? `IE: ${cli.inscricao_estadual}` : null].filter(Boolean).join(" · ");
    const ins = await db.query(
      `insert into public.clientes
         (razao_social, cnpj_cpf, tipo_pessoa, telefone, email, endereco, cidade, estado, cep, ativo, observacoes)
       values ($1,$2,'juridica',$3,$4,$5,$6,$7,$8,true,$9) returning id`,
      [cli.razao_social, cli.cnpj_cpf, cli.telefone, cli.email, endereco,
       cli.cidade, cli.estado, cli.cep, obs],
    );
    clienteId = ins.rows[0].id; cadastrados++; console.log("   ✓ cadastrado");
  }
  const upd = await db.query(
    `update public.orcamentos set cliente_id=$1 where origem='omie_import' and obra_nome=$2 and cliente_id is null`,
    [clienteId, obraNome],
  );
  vinculados += upd.rowCount;
  console.log(`   ✓ vinculado a ${upd.rowCount} orçamento(s)`);
}

if (db) await db.end();
console.log(`\n${COMMIT ? "✅ Commit" : "DRY-RUN"}: ${cadastrados} cadastrado(s), ${jaExistia} já existia(m), ${vinculados} orçamento(s) vinculado(s).`);
if (!COMMIT) console.log("   Para gravar: --commit + DATABASE_URL.");
