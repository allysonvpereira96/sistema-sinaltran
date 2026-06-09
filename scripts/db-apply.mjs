// Aplica um arquivo SQL ao Postgres (uso pontual de fix-ups).
// Uso: DATABASE_URL='...' node scripts/db-apply.mjs <caminho-do-arquivo>
import pg from "pg";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/db-apply.mjs <arquivo.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf-8");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log(`▶ Aplicando ${file}…`);
await client.query(sql);
console.log("  ✓ aplicado");
await client.end();
