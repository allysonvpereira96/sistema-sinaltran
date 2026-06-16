// Importa a planilha "Sistema Controle DP" para o Supabase via Data API.
//
// Uso:
//   SUPABASE_URL='https://<ref>.supabase.co' SUPABASE_SECRET_KEY='sb_secret_... | service_role JWT' \
//   node scripts/import-dp.mjs "Sistema Controle DP_corrigido.xlsx"
//
// Importa: colaboradores (Cadastro) + ASO + Experiência + Férias.
// Usa o ID da planilha para ligar as abas-filhas ao colaborador criado.
// NÃO é idempotente: rode uma vez num banco vazio (CPF é unique).

import xlsx from "xlsx";

const FILE = process.argv[2] || "Sistema Controle DP_corrigido.xlsx";
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL || !KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const txt = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" || s.toUpperCase() === "N/D" ? null : s;
};
const digits = (v) => {
  const s = txt(v);
  return s ? s.replace(/\D/g, "") || null : null;
};

/** Converte célula de data (serial Excel ou string M/D/AA) para ISO YYYY-MM-DD. */
function toISO(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = xlsx.SSF.parse_date_code(v);
    if (!d || !d.y) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [, mo, da, yr] = m;
    if (yr.length === 2) yr = Number(yr) < 50 ? `20${yr}` : `19${yr}`;
    return `${yr}-${mo.padStart(2, "0")}-${da.padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return s.slice(0, 10);
  return null;
}

async function post(table, rows, { onConflict } = {}) {
  if (!rows.length) return [];
  const qs = onConflict ? `?on_conflict=${onConflict}` : "";
  const prefer = onConflict
    ? "return=representation,resolution=merge-duplicates"
    : "return=representation";
  const res = await fetch(`${URL}/rest/v1/${table}${qs}`, {
    method: "POST",
    headers: { ...H, Prefer: prefer },
    body: JSON.stringify(rows),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error(`  ✗ erro inserindo em ${table}:`, res.status, JSON.stringify(body).slice(0, 300));
    throw new Error(`insert ${table} falhou`);
  }
  return body;
}

async function getOne(table, query) {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}&limit=1`, { headers: H });
  const body = await res.json();
  return Array.isArray(body) && body[0] ? body[0] : null;
}

async function count(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=id`, {
    headers: { ...H, Prefer: "count=exact", Range: "0-0" },
  });
  const cr = res.headers.get("content-range") || "*/?";
  return cr.split("/")[1];
}

// ── 1) Ler planilha ──────────────────────────────────────────────────────────
console.log(`📖 Lendo ${FILE}…`);
const wb = xlsx.readFile(FILE, { raw: true });
const J = (name) => xlsx.utils.sheet_to_json(wb.Sheets[name], { defval: null, raw: true });

// ── 3) Colaboradores (Cadastro) — idempotente via upsert no CPF ───────────────
// Reaproveita registros já existentes (rerun seguro) e funde CPFs duplicados
// na própria planilha (ex.: KAUE aparece 2x). Linhas sem CPF: dedupe por matrícula.
const cad = J("Cadastro").filter((r) => txt(r["Nome do Colaborador"]));
console.log(`\n👤 ${cad.length} linhas no Cadastro (upsert por CPF)`);

const idMap = new Map(); // ID planilha → uuid Supabase
let semAdmissao = 0;

for (const r of cad) {
  const data_admissao = toISO(r["Data Admissão"]);
  if (!data_admissao) {
    semAdmissao++;
    console.warn(`  ! ${txt(r["Nome do Colaborador"])} sem data de admissão — pulando`);
    continue;
  }
  const cpf = digits(r["CPF"]);
  const matricula = txt(r["Matrícula"]);
  const payload = {
    nome_completo: txt(r["Nome do Colaborador"]),
    cpf,
    matricula,
    cargo: txt(r["Cargo"]) || "—",
    setor: txt(r["Setor"]),
    gestor: txt(r["Gestor"]),
    data_admissao,
    data_nascimento: toISO(r["Data Nascimento"]),
    status: "ativo",
    estado: "RS",
  };

  let row;
  if (cpf) {
    [row] = await post("colaboradores", [payload], { onConflict: "cpf" });
  } else {
    // sem CPF: tenta achar por matrícula antes de inserir
    const existing = matricula ? await getOne("colaboradores", `matricula=eq.${matricula}`) : null;
    row = existing || (await post("colaboradores", [payload]))[0];
  }
  idMap.set(String(r["ID"]), row.id);
}
console.log(`  ✓ ${idMap.size} IDs mapeados${semAdmissao ? ` (${semAdmissao} sem admissão pulados)` : ""}`);

// ── 4) ASO ───────────────────────────────────────────────────────────────────
const PERIODO = { ANUAL: 12, BIENAL: 24, SEMESTRAL: 6 };
const TIPO = { ADMISSIONAL: "admissional", "PERIÓDICO": "periodico", PERIODICO: "periodico", DEMISSIONAL: "demissional" };

const asoRows = J("ASO")
  .filter((r) => idMap.has(String(r["ID"])) && toISO(r["Último ASO"]))
  .map((r) => ({
    colaborador_id: idMap.get(String(r["ID"])),
    data_realizacao: toISO(r["Último ASO"]),
    periodicidade_meses: PERIODO[String(txt(r["PERÍODO"]) || "").toUpperCase()] || 12,
    tipo_exame: TIPO[String(txt(r["Tipo Exame"]) || "").toUpperCase()] || "periodico",
    responsavel: txt(r["Responsável"]),
    observacoes: txt(r["Observações"]),
  }));
const asoIns = await post("colaborador_aso", asoRows);
console.log(`🩺 ASO: ${asoIns.length} inseridos`);

// ── 5) Experiência ───────────────────────────────────────────────────────────
const expRows = J("Experiência")
  .filter((r) => idMap.has(String(r["ID"])) && (toISO(r["30 dias"]) || toISO(r["90 dias"])))
  .map((r) => ({
    colaborador_id: idMap.get(String(r["ID"])),
    marco_30: toISO(r["30 dias"]),
    marco_45: toISO(r["45 dias"]),
    marco_60: toISO(r["60 dias"]),
    marco_90: toISO(r["90 dias"]),
    avaliacao: txt(r["Avaliação"]),
    observacoes: txt(r["Observações"]),
  }));
const expIns = await post("colaborador_experiencia", expRows);
console.log(`📋 Experiência: ${expIns.length} inseridos`);

// ── 6) Férias (janela aquisitiva) ────────────────────────────────────────────
const hoje = new Date().toISOString().slice(0, 10);
const ferRows = J("Férias")
  .filter((r) => idMap.has(String(r["ID"])) && toISO(r["Início Período"]) && toISO(r["Fim Período"]))
  .map((r) => {
    const ini = toISO(r["Início Período"]);
    const fim = toISO(r["Fim Período"]);
    return {
      colaborador_id: idMap.get(String(r["ID"])),
      periodo_aquisitivo_inicio: ini,
      periodo_aquisitivo_fim: fim,
      data_inicio: ini,
      data_fim: fim,
      dias: 30,
      status: fim < hoje ? "concluida" : "agendada",
    };
  });
const ferIns = await post("colaborador_ferias", ferRows);
console.log(`🏖️  Férias: ${ferIns.length} inseridos`);

// ── Resumo ───────────────────────────────────────────────────────────────────
console.log("\n✅ Importação concluída:");
console.log(`   colaboradores            = ${await count("colaboradores")}`);
console.log(`   colaborador_aso          = ${await count("colaborador_aso")}`);
console.log(`   colaborador_experiencia  = ${await count("colaborador_experiencia")}`);
console.log(`   colaborador_ferias       = ${await count("colaborador_ferias")}`);
