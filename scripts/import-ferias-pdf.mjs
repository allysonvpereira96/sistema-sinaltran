// Importa períodos aquisitivos de férias do PDF da contabilidade (22/05/2026)
// para a tabela `colaborador_periodos_aquisitivos`.
//
// 1) Atualiza matrículas dos colaboradores casados por NOME (115, 124)
// 2) UPSERT dos períodos aquisitivos (idempotente — unique por colab+ini+fim)
// 3) Lista os que faltam cadastrar (ALAN, FELIPE)
//
// Uso:  DATABASE_URL='...' node scripts/import-ferias-pdf.mjs

import pg from "pg";

const PDF = [
  { mat: "71",  nome: "ALISON ANTONIO DA SILVA DE OLIVEIRA",  dias_direito: 19.00, aq_ini: "2024-11-13", aq_fim: "2025-11-12", conc_ini: "2025-11-13", conc_fim: "2026-11-12", prazo_dobro: "2026-10-22" },
  { mat: "71",  nome: "ALISON ANTONIO DA SILVA DE OLIVEIRA",  dias_direito: 17.50, aq_ini: "2025-11-13", aq_fim: "2026-11-12", conc_ini: "2026-11-13", conc_fim: "2027-10-30", prazo_dobro: null },
  { mat: "34",  nome: "CELSO HENRIQUE VIEIRA CHAVES",          dias_direito: 19.00, aq_ini: "2024-12-22", aq_fim: "2025-12-21", conc_ini: "2025-12-22", conc_fim: "2026-12-21", prazo_dobro: "2026-12-03" },
  { mat: "34",  nome: "CELSO HENRIQUE VIEIRA CHAVES",          dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "44",  nome: "ALEX DE CARVALHO PEREIRA",              dias_direito: 19.00, aq_ini: "2024-12-22", aq_fim: "2025-12-21", conc_ini: "2025-12-22", conc_fim: "2026-12-21", prazo_dobro: "2026-12-03" },
  { mat: "44",  nome: "ALEX DE CARVALHO PEREIRA",              dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "77",  nome: "MATEUS SANTOS DO NASCIMENTO",            dias_direito: 14.00, aq_ini: "2025-02-24", aq_fim: "2025-12-21", conc_ini: "2025-12-22", conc_fim: "2026-12-21", prazo_dobro: "2026-12-08" },
  { mat: "77",  nome: "MATEUS SANTOS DO NASCIMENTO",            dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "80",  nome: "TATIELI SANTOS DA SILVA",                dias_direito:  1.50, aq_ini: "2025-03-10", aq_fim: "2025-12-21", conc_ini: "2025-12-22", conc_fim: "2027-03-08", prazo_dobro: "2027-03-08" },
  { mat: "80",  nome: "TATIELI SANTOS DA SILVA",                dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "83",  nome: "CASSIO FELIPE PEREIRA MARIA",            dias_direito: 11.50, aq_ini: "2025-03-26", aq_fim: "2025-12-21", conc_ini: "2025-12-22", conc_fim: "2026-12-20", prazo_dobro: "2026-12-10" },
  { mat: "83",  nome: "CASSIO FELIPE PEREIRA MARIA",            dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "84",  nome: "LEANDRO LUIS RAMOS DE QUADROS",          dias_direito: 11.50, aq_ini: "2025-04-01", aq_fim: "2025-12-21", conc_ini: "2025-12-22", conc_fim: "2026-12-20", prazo_dobro: "2026-12-10" },
  { mat: "84",  nome: "LEANDRO LUIS RAMOS DE QUADROS",          dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "93",  nome: "JEDERSON SCCOTT DE ALMEIDA",             dias_direito:  6.50, aq_ini: "2025-05-26", aq_fim: "2025-12-21", conc_ini: "2025-12-22", conc_fim: "2026-12-20", prazo_dobro: "2026-12-15" },
  { mat: "93",  nome: "JEDERSON SCCOTT DE ALMEIDA",             dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "96",  nome: "LIDIANE PINHEIRO GONCALVES",             dias_direito:  6.50, aq_ini: "2025-06-02", aq_fim: "2025-12-21", conc_ini: "2025-12-22", conc_fim: "2026-12-20", prazo_dobro: "2026-12-15" },
  { mat: "96",  nome: "LIDIANE PINHEIRO GONCALVES",             dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "19",  nome: "PAULO JANILTON AVILA DUARTE",            dias_direito: 19.00, aq_ini: "2024-12-29", aq_fim: "2025-12-28", conc_ini: "2025-12-29", conc_fim: "2026-12-28", prazo_dobro: "2026-12-10" },
  { mat: "19",  nome: "PAULO JANILTON AVILA DUARTE",            dias_direito: 12.50, aq_ini: "2025-12-29", aq_fim: "2026-12-28", conc_ini: "2026-12-29", conc_fim: "2027-12-10", prazo_dobro: null },
  { mat: "47",  nome: "LEODATO ANTONIO GARCIA DE OLIVEIRA",     dias_direito: 19.00, aq_ini: "2025-01-02", aq_fim: "2026-01-01", conc_ini: "2026-01-02", conc_fim: "2027-01-01", prazo_dobro: "2026-12-14" },
  { mat: "47",  nome: "LEODATO ANTONIO GARCIA DE OLIVEIRA",     dias_direito: 12.50, aq_ini: "2026-01-02", aq_fim: "2027-01-01", conc_ini: "2027-01-02", conc_fim: "2027-12-14", prazo_dobro: null },
  { mat: "101", nome: "FABIO MARCELLO GONCALVES",               dias_direito: 22.50, aq_ini: "2025-08-28", aq_fim: "2026-08-27", conc_ini: "2026-08-28", conc_fim: "2027-08-19", prazo_dobro: null },
  { mat: "105", nome: "KAUE NOGUEIRA PINTO",                    dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "106", nome: "WAGNER PRESTES ESCOUTO",                 dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "108", nome: "ERICK CORREA DAL MOLIN",                 dias_direito: 12.50, aq_ini: "2025-12-22", aq_fim: "2026-12-21", conc_ini: "2026-12-22", conc_fim: "2027-12-03", prazo_dobro: null },
  { mat: "111", nome: "RAFAEL STOCCO",                          dias_direito: 10.00, aq_ini: "2026-01-27", aq_fim: "2027-01-26", conc_ini: "2027-01-27", conc_fim: "2028-01-06", prazo_dobro: null },
  { mat: "115", nome: "JORGE LUIS ANTUNES",                     dias_direito: 10.00, aq_ini: "2026-01-29", aq_fim: "2027-01-28", conc_ini: "2027-01-29", conc_fim: "2028-01-08", prazo_dobro: null },
  { mat: "118", nome: "ELIAS DOS REIS",                         dias_direito:  5.00, aq_ini: "2026-03-27", aq_fim: "2027-03-26", conc_ini: "2027-03-27", conc_fim: "2028-03-01", prazo_dobro: null },
  { mat: "123", nome: "JOSE DE SOUZA MARTINS",                  dias_direito:  5.00, aq_ini: "2026-03-27", aq_fim: "2027-03-26", conc_ini: "2027-03-27", conc_fim: "2028-03-01", prazo_dobro: null },
  { mat: "124", nome: "SUELLEN LADWIG DA SILVA VIEIRA",         dias_direito:  5.00, aq_ini: "2026-04-01", aq_fim: "2027-03-31", conc_ini: "2027-04-01", conc_fim: "2028-03-06", prazo_dobro: null },
  { mat: "125", nome: "KLEBER DA SILVA SILVEIRA",               dias_direito:  5.00, aq_ini: "2026-04-07", aq_fim: "2027-04-06", conc_ini: "2027-04-07", conc_fim: "2028-03-12", prazo_dobro: null },
  { mat: "126", nome: "LUCAS NECKEL",                           dias_direito:  5.00, aq_ini: "2026-04-09", aq_fim: "2027-04-08", conc_ini: "2027-04-09", conc_fim: "2028-03-14", prazo_dobro: null },
  { mat: "127", nome: "ALAN DE JESUS SANTOS",                   dias_direito:  5.00, aq_ini: "2026-04-13", aq_fim: "2027-04-12", conc_ini: "2027-04-13", conc_fim: "2028-03-18", prazo_dobro: null },
  { mat: "128", nome: "BRUNO BARBOSA DAMASCENO",                dias_direito:  5.00, aq_ini: "2026-04-15", aq_fim: "2027-04-14", conc_ini: "2027-04-15", conc_fim: "2028-03-20", prazo_dobro: null },
  { mat: "129", nome: "JOÃO PABLLO CIRQUEIRA DE OLIVEIRA",      dias_direito:  5.00, aq_ini: "2026-04-15", aq_fim: "2027-04-14", conc_ini: "2027-04-15", conc_fim: "2028-03-20", prazo_dobro: null },
  { mat: "130", nome: "ANGELICA DA SILVA HENCKE",               dias_direito:  5.00, aq_ini: "2026-04-17", aq_fim: "2027-04-16", conc_ini: "2027-04-17", conc_fim: "2028-03-22", prazo_dobro: null },
  { mat: "131", nome: "FELIPE DOS REIS HENZ",                   dias_direito:  2.50, aq_ini: "2026-05-08", aq_fim: "2027-05-07", conc_ini: "2027-05-08", conc_fim: "2028-04-09", prazo_dobro: null },
  { mat: "132", nome: "MATHEUS RODRIGO SUBTIL DA COSTA",        dias_direito:  0.00, aq_ini: "2026-05-20", aq_fim: "2027-05-19", conc_ini: "2027-05-20", conc_fim: "2028-04-19", prazo_dobro: null },
  { mat: "133", nome: "ROBSON APARECIDO DA SILVA",              dias_direito:  0.00, aq_ini: "2026-05-20", aq_fim: "2027-05-19", conc_ini: "2027-05-20", conc_fim: "2028-04-19", prazo_dobro: null },
  { mat: "134", nome: "GABRIEL RICARDO SILVA DE SOUZA",         dias_direito:  0.00, aq_ini: "2026-05-22", aq_fim: "2027-05-21", conc_ini: "2027-05-22", conc_fim: "2028-04-21", prazo_dobro: null },
];

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// 1) Carregar colaboradores cadastrados
const { rows: colabs } = await client.query(`select id, matricula, nome_completo from public.colaboradores`);
const byMat = new Map();
const byNome = new Map();
for (const c of colabs) {
  if (c.matricula) byMat.set(c.matricula, c);
  const norm = c.nome_completo.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  byNome.set(norm, c);
}

function normaliza(s) {
  return s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

// 2) Atualizar matrículas dos casados por nome (PDF: 115, 124)
const updatesMatricula = [];
for (const p of PDF) {
  if (byMat.has(p.mat)) continue;
  const col = byNome.get(normaliza(p.nome));
  if (!col) continue;
  // Casa por nome mas matrícula divergente — atualizar
  if (col.matricula !== p.mat) {
    updatesMatricula.push({ id: col.id, matricula_antiga: col.matricula, matricula_nova: p.mat, nome: col.nome_completo });
  }
}

if (updatesMatricula.length > 0) {
  console.log("\n📝 Atualizando matrículas (casados por nome):");
  for (const u of updatesMatricula) {
    console.log(`   ${u.nome}: ${u.matricula_antiga} → ${u.matricula_nova}`);
    await client.query(`update public.colaboradores set matricula = $1 where id = $2`, [u.matricula_nova, u.id]);
  }
}

// 3) Recarregar mapa por matrícula
const { rows: colabs2 } = await client.query(`select id, matricula, nome_completo from public.colaboradores`);
const byMat2 = new Map(colabs2.filter((c) => c.matricula).map((c) => [c.matricula, c]));

// 4) Importar períodos aquisitivos (UPSERT pela unique (colaborador, aq_ini, aq_fim))
let inseridos = 0;
let atualizados = 0;
let skip = 0;
const naoCadastrados = [];

for (const p of PDF) {
  const col = byMat2.get(p.mat);
  if (!col) {
    naoCadastrados.push(p);
    skip++;
    continue;
  }
  const r = await client.query(
    `insert into public.colaborador_periodos_aquisitivos (
       colaborador_id, aquisitivo_inicio, aquisitivo_fim,
       dias_direito, concessivo_inicio, concessivo_fim, prazo_dobro
     ) values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (colaborador_id, aquisitivo_inicio, aquisitivo_fim)
     do update set
       dias_direito = excluded.dias_direito,
       concessivo_inicio = excluded.concessivo_inicio,
       concessivo_fim = excluded.concessivo_fim,
       prazo_dobro = excluded.prazo_dobro,
       updated_at = now()
     returning (xmax = 0) as inserido`,
    [col.id, p.aq_ini, p.aq_fim, p.dias_direito, p.conc_ini, p.conc_fim, p.prazo_dobro],
  );
  if (r.rows[0]?.inserido) inseridos++;
  else atualizados++;
}

console.log(`\n✅ Importação concluída`);
console.log(`   Inseridos: ${inseridos}`);
console.log(`   Atualizados: ${atualizados}`);
console.log(`   Ignorados (colaborador não cadastrado): ${skip}`);

if (naoCadastrados.length > 0) {
  console.log(`\n⚠️  Não foi possível importar (colaborador não cadastrado):`);
  const distintos = [...new Map(naoCadastrados.map((p) => [p.mat, p])).values()];
  for (const p of distintos) {
    console.log(`     [${p.mat}] ${p.nome}`);
  }
}

await client.end();
