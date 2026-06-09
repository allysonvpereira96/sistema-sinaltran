// Verifica o estado do schema após o setup.
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const tables = await client.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
  order by table_name
`);
console.log(`\n📋 Tabelas em public (${tables.rowCount}):`);
tables.rows.forEach((r) => console.log(`  • ${r.table_name}`));

const types = await client.query(`
  select typname from pg_type
  where typnamespace = (select oid from pg_namespace where nspname = 'public')
    and typtype = 'e'
  order by typname
`);
console.log(`\n🎨 Enums (${types.rowCount}):`);
types.rows.forEach((r) => console.log(`  • ${r.typname}`));

const profiles = await client.query(
  `select id, email, role from public.profiles`,
);
console.log(`\n👤 Profiles (${profiles.rowCount}):`);
profiles.rows.forEach((r) =>
  console.log(`  • ${r.email} → role ${r.role} (${r.id})`),
);

const cats = await client.query(
  `select count(*) from public.categorias_financeiras`,
);
console.log(`💰 Categorias financeiras (seed): ${cats.rows[0].count}`);
const tipos = await client.query(`select count(*) from public.tipos_mao_obra`);
console.log(`👷 Tipos de mão de obra (seed): ${tipos.rows[0].count}`);

await client.end();
