// Importa produtos (materiais) de sinalização a partir da planilha mestre.
//
// Uso:
//   npm i --no-save xlsx
//   DATABASE_URL='...' node scripts/import-produtos.mjs "PLANILHA CADASTRO DE PRODUTOS SINALTRAN ATUALIZADA.xlsx"
//
// - Aplica a migration 20260616000005 (colunas de produto) — idempotente.
// - Importa só famílias de sinalização (vertical, horizontal, óptica,
//   semafórica, obra, defensa, tinta de demarcação, epóxi), normalizando
//   variações/erros de digitação.
// - Upsert por `codigo` (COD ITEM). Preços entram 0 (preencher pela tela);
//   re-importar atualiza só os campos descritivos, preservando preços.

import pg from "pg";
import xlsx from "xlsx";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error('Uso: DATABASE_URL=... node scripts/import-produtos.mjs "<arquivo.xlsx>"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Erro: DATABASE_URL não definida.");
  process.exit(1);
}

const norm = (s) =>
  (s ?? "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

const NA = (v) => {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s+/g, " ");
  return s || null;
};
const cap = (s, n) => (s && s.length > n ? s.substring(0, n) : s);

// Famílias de sinalização (inclusão por palavra-chave normalizada).
const incluiFamilia = (f) => {
  const n = norm(f);
  return ["SINAL", "DEFENSA", "TINTA", "EPOXI"].some((k) => n.includes(k));
};

// Normaliza a família para um rótulo canônico (corrige typos).
function canonFamilia(f) {
  const n = norm(f);
  if (n.includes("VERTI")) return "Sinalização vertical";
  if (n.includes("HORIZ") || n.includes("HOROZ")) return "Sinalização horizontal";
  if (n.includes("OPTIC") || n.includes("OPTIC")) return "Sinalização óptica";
  if (n.includes("SEMAF")) return "Sinalização semafórica";
  if (n.includes("OBRA")) return "Sinalização de obra";
  if (n.includes("DEFENSA")) return "Defensa metálica";
  if (n.includes("EPOXI")) return "Sinalização epóxi";
  if (n.includes("TINTA")) return "Tinta de demarcação";
  return NA(f);
}

// ---------------------------------------------------------------------------
console.log(`📖 Lendo ${file}…`);
const wb = xlsx.readFile(file);
const sheet = wb.Sheets["Listagem_Mestre"] ?? wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils
  .sheet_to_json(sheet, { defval: null, raw: false })
  .filter((r) => r["COD ITEM"] && r["DESCRIÇÃO ITEM PARA CADASTRO"]);

const produtos = [];
const seen = new Set();
for (const r of rows) {
  if (!incluiFamilia(r["FAMILIA"])) continue;
  const codigo = NA(r["COD ITEM"]);
  if (!codigo || seen.has(codigo)) continue;
  seen.add(codigo);
  produtos.push({
    codigo: cap(codigo, 60),
    descricao: cap(NA(r["DESCRIÇÃO ITEM PARA CADASTRO"]), 1000),
    categoria: "outro",
    familia: cap(canonFamilia(r["FAMILIA"]), 120),
    ncm: cap(NA(r["NCM"]), 20),
    classificacao: cap(NA(r["CLASSIFICAÇÃO PRODUTO"]), 120),
    unidade_medida: cap(NA(r["UNID PADRÃO SINALTRAN"]) ?? "UN", 12),
    unidade_fornecedor: cap(NA(r["UNID PADRÃO FORNECEDOR"]), 30),
    peso: cap(NA(r["PESO"]), 40),
    fornecedores: cap(NA(r["FORNECEDORES"]), 300),
  });
}
console.log(`   → ${produtos.length} produtos de sinalização a importar`);

// ---------------------------------------------------------------------------
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  // 1) Garante o schema (migration idempotente)
  const migration = readFileSync(
    new URL("../supabase/migrations/20260616000005_materiais_produtos.sql", import.meta.url),
    "utf8",
  );
  await client.query(migration);
  console.log("✓ schema garantido (colunas de produto)");

  // 2) Upsert em batches
  const cols = [
    "codigo",
    "descricao",
    "categoria",
    "familia",
    "ncm",
    "classificacao",
    "unidade_medida",
    "unidade_fornecedor",
    "peso",
    "fornecedores",
  ];
  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < produtos.length; i += BATCH) {
    const slice = produtos.slice(i, i + BATCH);
    const values = [];
    const placeholders = slice.map((row) => {
      const ph = [];
      for (const c of cols) {
        values.push(row[c] ?? null);
        ph.push(`$${values.length}`);
      }
      return `(${ph.join(", ")})`;
    });
    const sql = `
      insert into public.materiais (${cols.join(", ")})
      values ${placeholders.join(", ")}
      on conflict (codigo) do update set
        descricao = excluded.descricao,
        familia = excluded.familia,
        ncm = excluded.ncm,
        classificacao = excluded.classificacao,
        unidade_medida = excluded.unidade_medida,
        unidade_fornecedor = excluded.unidade_fornecedor,
        peso = excluded.peso,
        fornecedores = excluded.fornecedores
    `;
    const res = await client.query(sql, values);
    total += res.rowCount;
    process.stdout.write(`\r   materiais: ${Math.min(i + BATCH, produtos.length)}/${produtos.length}`);
  }
  process.stdout.write("\n");
  const c = await client.query("select count(*)::int n from public.materiais");
  console.log(`✅ Importação concluída — ${c.rows[0].n} materiais no total.`);
} catch (err) {
  console.error("\n❌ Erro:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
