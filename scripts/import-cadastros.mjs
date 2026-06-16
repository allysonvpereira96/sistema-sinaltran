// Importa cadastros (clientes/fornecedores) a partir de um arquivo XLSX.
//
// Uso:
//   npm i --no-save xlsx
//   DATABASE_URL='...' node scripts/import-cadastros.mjs <caminho-do-xlsx>
//
// Formato esperado do XLSX (primeira aba, primeira linha = header):
//   Tags | CNPJ/CPF | Razão Social | Nome Fantasia | Contato | Bairro | Cidade | Estado | Telefone | E-mail | WebSite | Inscrição Estadual
//
// Tags reconhecidas (substrings):
//   "Cliente"      → insere em clientes
//   "Fornecedor"   → insere em fornecedores
//   (uma linha pode disparar ambas — ex: "Cliente, Fornecedor")
//
// Linhas com tag "N/D", apenas "Transportadora" ou apenas "Funcionário"
// são ignoradas (não temos tabela). Documentos "N/D" viram null.
//
// O UPSERT usa cnpj_cpf normalizado (apenas dígitos) como chave de conflito.
// Linhas sem CNPJ/CPF são inseridas sempre (não há como deduplicar).

import pg from "pg";
import xlsx from "xlsx";

const file = process.argv[2];
if (!file) {
  console.error("Uso: DATABASE_URL=... node scripts/import-cadastros.mjs <arquivo.xlsx>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Erro: variável de ambiente DATABASE_URL não definida.");
  process.exit(1);
}

const NA = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toUpperCase() === "N/D" || s === "-") return null;
  return s;
};

const onlyDigits = (v) => {
  const s = NA(v);
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  return d || null;
};

const cap = (s, max) => (s && s.length > max ? s.substring(0, max) : s);

function classifyTags(tagStr) {
  const s = (tagStr || "").toLowerCase();
  const isCliente = s.includes("cliente");
  const isFornecedor = s.includes("fornecedor");
  return { isCliente, isFornecedor };
}

function detectTipoPessoa(cnpjCpf) {
  if (!cnpjCpf) return "juridica";
  if (cnpjCpf.length === 11) return "fisica";
  if (cnpjCpf.length === 14) return "juridica";
  return "juridica";
}

// ---------------------------------------------------------------------------
// 1) Ler XLSX
// ---------------------------------------------------------------------------
console.log(`📖 Lendo ${file}…`);
const wb = xlsx.readFile(file);
const sheet = wb.Sheets[wb.SheetNames[0]];
const allRows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });

// Pular linha de header
const rows = allRows.slice(1);
console.log(`   ${rows.length} linhas brutas`);

// ---------------------------------------------------------------------------
// 2) Normalizar e separar clientes / fornecedores
// ---------------------------------------------------------------------------
const clientes = [];
const fornecedores = [];

const seenCliCnpj = new Set();
const seenForCnpj = new Set();

for (const r of rows) {
  const tag = r["Clientes e Fornecedores"];
  const { isCliente, isFornecedor } = classifyTags(tag);
  if (!isCliente && !isFornecedor) continue;

  const cnpjCpf = onlyDigits(r["__EMPTY"]);
  const razao = NA(r["__EMPTY_1"]);
  const fantasia = NA(r["__EMPTY_2"]);
  const contato = NA(r["__EMPTY_3"]);
  const bairro = NA(r["__EMPTY_4"]);
  const cidade = NA(r["__EMPTY_5"]);
  const estado = NA(r["__EMPTY_6"]);
  const telefone = onlyDigits(r["__EMPTY_7"]);
  const email = NA(r["__EMPTY_8"]);
  // const website = NA(r["__EMPTY_9"]);
  // const ie = NA(r["__EMPTY_10"]);

  if (!razao) continue; // sem nome não dá pra inserir

  const obs = bairro ? `Bairro: ${bairro}` : null;

  if (isCliente) {
    // dedupe in-memory por CNPJ (a tabela tem unique index parcial)
    if (cnpjCpf) {
      if (seenCliCnpj.has(cnpjCpf)) continue;
      seenCliCnpj.add(cnpjCpf);
    }
    clientes.push({
      razao_social: cap(razao, 500),
      nome_fantasia: cap(fantasia, 500),
      cnpj_cpf: cnpjCpf,
      tipo_pessoa: detectTipoPessoa(cnpjCpf),
      email: cap(email, 200),
      telefone: cap(telefone, 30),
      responsavel: cap(contato, 200),
      cidade: cap(cidade, 100),
      estado: cap(estado, 2),
      observacoes: obs,
    });
  }
  if (isFornecedor) {
    if (cnpjCpf) {
      if (seenForCnpj.has(cnpjCpf)) continue;
      seenForCnpj.add(cnpjCpf);
    }
    fornecedores.push({
      nome: cap(razao, 500),
      nome_fantasia: cap(fantasia, 500),
      cnpj_cpf: cnpjCpf,
      email: cap(email, 200),
      telefone: cap(telefone, 30),
      cidade: cap(cidade, 100),
      estado: cap(estado, 2),
      observacoes: obs,
    });
  }
}

console.log(`   → ${clientes.length} clientes a importar`);
console.log(`   → ${fornecedores.length} fornecedores a importar`);

// ---------------------------------------------------------------------------
// 3) Conectar e inserir em batches
// ---------------------------------------------------------------------------
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

async function insertBatch(table, rows, columns) {
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const values = [];
    const placeholders = slice.map((row) => {
      const ph = columns.map(() => `$${values.length + 1}`);
      for (const col of columns) {
        values.push(row[col] ?? null);
        if (values.length > 0 && values.length % columns.length !== 0) {
          // skip — we just need to push one per column
        }
      }
      // values pushed once per col — rewrite cleaner:
      return `(${ph.join(", ")})`;
    });

    // Re-build values cleanly (the above push logic is right; simplifying)
    values.length = 0;
    const cleanPlaceholders = slice.map((row) => {
      const ph = [];
      for (const col of columns) {
        values.push(row[col] ?? null);
        ph.push(`$${values.length}`);
      }
      return `(${ph.join(", ")})`;
    });

    const sql = `
      insert into public.${table} (${columns.join(", ")})
      values ${cleanPlaceholders.join(", ")}
      on conflict (cnpj_cpf) where cnpj_cpf is not null and cnpj_cpf <> ''
      do update set
        ${columns
          .filter((c) => c !== "cnpj_cpf")
          .map((c) => `${c} = excluded.${c}`)
          .join(",\n        ")}
      returning id
    `;
    const res = await client.query(sql, values);
    inserted += res.rowCount;
    process.stdout.write(`\r   ${table}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
  return { inserted };
}

try {
  console.log("\n📥 Importando clientes…");
  const c = await insertBatch("clientes", clientes, [
    "razao_social",
    "nome_fantasia",
    "cnpj_cpf",
    "tipo_pessoa",
    "email",
    "telefone",
    "responsavel",
    "cidade",
    "estado",
    "observacoes",
  ]);
  console.log(`   ✓ ${c.inserted} clientes upserted`);

  console.log("\n📥 Importando fornecedores…");
  const f = await insertBatch("fornecedores", fornecedores, [
    "nome",
    "nome_fantasia",
    "cnpj_cpf",
    "email",
    "telefone",
    "cidade",
    "estado",
    "observacoes",
  ]);
  console.log(`   ✓ ${f.inserted} fornecedores upserted`);

  console.log("\n✅ Importação concluída.");
} catch (err) {
  console.error("\n❌ Erro na importação:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
