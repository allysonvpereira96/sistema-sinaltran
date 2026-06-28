// ============================================================================
// Atualiza o catálogo de serviços (public.servicos) a partir do export do Omie
// SINALTRAN_Servicos.xlsx — para que o cadastro do sistema espelhe o do Omie
// (ISS, INSS, retenções, LC116, código do município, tributação).
//
// Uso:
//   npm i --no-save xlsx
//   DATABASE_URL='...' node scripts/import-servicos-omie.mjs "<SINALTRAN_Servicos.xlsx>"
//
// Upsert por `codigo` (SRV0000N). Re-rodar é seguro (idempotente).
// ============================================================================
import pg from "pg";
import xlsx from "xlsx";

const file = process.argv[2];
if (!file) { console.error('Uso: DATABASE_URL=... node scripts/import-servicos-omie.mjs "<arquivo.xlsx>"'); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL não definida."); process.exit(1); }

const S = (v) => (v == null ? null : String(v).trim() || null);
const pct = (v) => {
  const n = Number(String(v ?? "").replace("%", "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
};
const bool = (v) => /^s/i.test(String(v ?? "").trim()); // "SIM"→true, "Não"/"NÃO"→false

const wb = xlsx.readFile(file);
const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
console.log(`Lendo ${rows.length} serviços de ${file.split(/[\\/]/).pop()}`);

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

let atualizados = 0, inseridos = 0;
for (const r of rows) {
  const codigo = S(r["Código do Serviço"]);
  if (!codigo) continue;
  const dados = {
    descricao: S(r["Descrição"]),
    descricao_completa: S(r["Descrição Completa"]),
    categoria: S(r["Categoria"]),
    codigo_municipio: S(r["Código do Serviço no Município"]),
    codigo_lc116: S(r["Código LC 116"]),
    codigo_nbs: S(r["Código NBS"]),
    aliquota_iss: pct(r["Alíquota ISS"]),
    retem_iss: bool(r["Retém ISS"]),
    aliquota_inss: pct(r["Alíquota INSS"]),
    retem_inss: bool(r["Retém INSS"]),
    tributacao: S(r["Tributação do Serviço"]),
  };
  const res = await db.query(
    `insert into public.servicos
       (codigo, descricao, descricao_completa, categoria, codigo_municipio, codigo_lc116,
        codigo_nbs, aliquota_iss, retem_iss, aliquota_inss, retem_inss, tributacao, ativo)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
     on conflict (codigo) do update set
       descricao = excluded.descricao,
       descricao_completa = excluded.descricao_completa,
       categoria = excluded.categoria,
       codigo_municipio = excluded.codigo_municipio,
       codigo_lc116 = excluded.codigo_lc116,
       codigo_nbs = excluded.codigo_nbs,
       aliquota_iss = excluded.aliquota_iss,
       retem_iss = excluded.retem_iss,
       aliquota_inss = excluded.aliquota_inss,
       retem_inss = excluded.retem_inss,
       tributacao = excluded.tributacao
     returning (xmax = 0) as inserted`,
    [codigo, dados.descricao, dados.descricao_completa, dados.categoria, dados.codigo_municipio,
     dados.codigo_lc116, dados.codigo_nbs, dados.aliquota_iss, dados.retem_iss,
     dados.aliquota_inss, dados.retem_inss, dados.tributacao],
  );
  if (res.rows[0].inserted) inseridos++; else atualizados++;
  console.log(`  ✓ ${codigo} ${dados.descricao} · ISS ${dados.aliquota_iss}%/${dados.retem_iss ? "S" : "N"} · INSS ${dados.aliquota_inss}%/${dados.retem_inss ? "S" : "N"} · ${dados.tributacao}`);
}
await db.end();
console.log(`\n✅ ${atualizados} atualizado(s), ${inseridos} inserido(s).`);
