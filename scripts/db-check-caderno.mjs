// Verifica que a migration do Caderno Virtual foi aplicada:
//   · coluna `observacoes` em colaborador_ocorrencias
//   · índices colaborador_ocorrencias_data_idx e colaborador_ocorrencias_tipo_idx
//
// Uso:  DATABASE_URL='...' node scripts/db-check-caderno.mjs
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const colRes = await client.query(`
  select column_name, data_type, is_nullable
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'colaborador_ocorrencias'
   order by ordinal_position
`);
console.log("Colunas em colaborador_ocorrencias:");
for (const r of colRes.rows) {
  const flag = r.column_name === "observacoes" ? "  ← NOVA" : "";
  console.log(`  · ${r.column_name.padEnd(20)} ${r.data_type.padEnd(30)} nullable=${r.is_nullable}${flag}`);
}

const idxRes = await client.query(`
  select indexname
    from pg_indexes
   where schemaname = 'public'
     and tablename  = 'colaborador_ocorrencias'
   order by indexname
`);
console.log("\nÍndices:");
for (const r of idxRes.rows) {
  const flag = ["colaborador_ocorrencias_data_idx", "colaborador_ocorrencias_tipo_idx"].includes(r.indexname)
    ? "  ← NOVO"
    : "";
  console.log(`  · ${r.indexname}${flag}`);
}

await client.end();
