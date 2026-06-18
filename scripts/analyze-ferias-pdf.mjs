// Analisa o PDF de "Acompanhamento de vencimento de férias" (22/05/2026)
// contra o banco: identifica colaboradores que existem, faltam ou divergem.
//
// Uso:  DATABASE_URL='...' node scripts/analyze-ferias-pdf.mjs

import pg from "pg";

// Dados extraídos do PDF "FÉRIAS SINALTRAN.pdf" (22/05/2026)
// Cada item representa UM período aquisitivo daquele colaborador.
const PDF_PERIODOS = [
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

const colaboradoresUnicos = [...new Set(PDF_PERIODOS.map((p) => p.mat))];
console.log(`PDF: ${PDF_PERIODOS.length} períodos aquisitivos · ${colaboradoresUnicos.length} colaboradores`);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// 1) Buscar colaboradores cadastrados
const { rows: colabs } = await client.query(`
  select id, matricula, nome_completo, status, data_admissao
    from public.colaboradores
   order by case when matricula ~ '^[0-9]+$' then matricula::int else 99999 end
`);

const byMat = new Map(colabs.filter((c) => c.matricula).map((c) => [c.matricula, c]));
const byNome = new Map(colabs.map((c) => [c.nome_completo.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), c]));

console.log(`\nBanco: ${colabs.length} colaboradores cadastrados`);

// 2) Cruzar PDF × Banco
const naoEncontrados = [];
const encontradosPorMat = [];
const encontradosPorNome = [];

for (const mat of colaboradoresUnicos) {
  const periodo = PDF_PERIODOS.find((p) => p.mat === mat);
  const col = byMat.get(mat);
  if (col) {
    encontradosPorMat.push({ mat, nome: periodo.nome, col });
  } else {
    const nomeNorm = periodo.nome.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const porNome = byNome.get(nomeNorm);
    if (porNome) {
      encontradosPorNome.push({ mat, nome: periodo.nome, col: porNome });
    } else {
      naoEncontrados.push({ mat, nome: periodo.nome });
    }
  }
}

console.log(`\n✓ Encontrados por matrícula: ${encontradosPorMat.length}`);
for (const e of encontradosPorMat) {
  console.log(`    [${e.mat.padStart(3)}] ${e.nome.padEnd(50)} → ${e.col.nome_completo} (${e.col.status})`);
}

console.log(`\n≈ Encontrados por NOME (matrícula do banco diferente do PDF): ${encontradosPorNome.length}`);
for (const e of encontradosPorNome) {
  console.log(`    PDF[${e.mat}] vs DB[${e.col.matricula ?? "—"}] · ${e.nome}`);
}

console.log(`\n✗ Não encontrados no banco: ${naoEncontrados.length}`);
for (const e of naoEncontrados) {
  console.log(`    [${e.mat.padStart(3)}] ${e.nome}`);
}

// 3) Verificar que ferias já existem
const { rows: feriasExist } = await client.query(`
  select colaborador_id, count(*) as n
    from public.colaborador_ferias
   group by colaborador_id
`);
console.log(`\nFérias já cadastradas no banco: ${feriasExist.reduce((s, r) => s + Number(r.n), 0)} registros para ${feriasExist.length} colaboradores`);

// 4) Mostrar prazos críticos (dentro de 6 meses do "hoje" 2026-06-18)
const hoje = new Date("2026-06-18");
const seisMeses = new Date(hoje);
seisMeses.setMonth(seisMeses.getMonth() + 6);

const criticos = PDF_PERIODOS.filter((p) => p.prazo_dobro)
  .map((p) => ({ ...p, prazo_d: new Date(p.prazo_dobro) }))
  .filter((p) => p.prazo_d <= seisMeses)
  .sort((a, b) => a.prazo_d - b.prazo_d);

console.log(`\n⚠️  Prazos críticos (gerarão dobra em ≤ 6 meses, antes de ${seisMeses.toISOString().slice(0, 10)}): ${criticos.length}`);
for (const c of criticos) {
  const diasAteDobro = Math.round((c.prazo_d - hoje) / 86400000);
  console.log(`    [${c.mat.padStart(3)}] ${c.nome.padEnd(45)} · ${c.dias_direito} dias · prazo ${c.prazo_dobro} (em ${diasAteDobro} dias)`);
}

await client.end();
