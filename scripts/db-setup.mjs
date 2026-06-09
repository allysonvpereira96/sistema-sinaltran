// Setup script — aplica supabase/setup.sql, cria usuário admin via
// Auth Admin API e promove para role='admin' no profile.
//
// Uso:
//   DATABASE_URL='...' SUPABASE_URL='...' SUPABASE_SECRET_KEY='...' \
//   ADMIN_EMAIL='...' ADMIN_PASSWORD='...' node scripts/db-setup.mjs
//
// Variáveis necessárias:
//   DATABASE_URL          → postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
//   SUPABASE_URL          → https://<ref>.supabase.co
//   SUPABASE_SECRET_KEY   → sb_secret_... (ou service_role legacy key)
//   ADMIN_EMAIL           → e-mail do admin
//   ADMIN_PASSWORD        → senha inicial do admin
//
// Idempotente em parte: as migrations em setup.sql NÃO são idempotentes
// (use só na primeira aplicação). A criação de usuário falha graciosamente
// se já existir, e a promoção a admin é idempotente.

import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
};

for (const [key, val] of Object.entries(env)) {
  if (!val) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}

const setupSqlPath = join(__dirname, "..", "supabase", "setup.sql");
const setupSql = readFileSync(setupSqlPath, "utf-8");

async function applyMigrations() {
  console.log("▶ Conectando ao Postgres…");
  const client = new pg.Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("  ✓ conectado");

  console.log("▶ Aplicando setup.sql (3 migrations consolidadas)…");
  await client.query(setupSql);
  console.log("  ✓ schema aplicado");

  return client;
}

async function createAdminUser() {
  console.log("▶ Criando usuário admin via Auth Admin API…");
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      email_confirm: true,
    }),
  });

  const body = await res.json();

  if (res.ok) {
    console.log(`  ✓ usuário criado: ${body.email} (id ${body.id})`);
    return body;
  }

  // Trata caso "já existe" como sucesso
  if (
    body?.code === "email_exists" ||
    body?.msg?.includes("already") ||
    body?.error_code === "email_exists" ||
    res.status === 422
  ) {
    console.log("  ! usuário já existia — seguindo");
    return null;
  }

  console.error("  ✗ falha:", res.status, body);
  throw new Error(`Auth API erro ${res.status}`);
}

async function promoteToAdmin(client) {
  console.log("▶ Promovendo a role='admin'…");
  // Pequena espera pro trigger handle_new_user materializar a linha
  await new Promise((r) => setTimeout(r, 800));
  for (let i = 0; i < 5; i++) {
    const r = await client.query(
      `UPDATE public.profiles
       SET role = 'admin', updated_at = now()
       WHERE email = $1
       RETURNING id, email, role`,
      [env.ADMIN_EMAIL],
    );
    if (r.rowCount > 0) {
      console.log(`  ✓ promovido: ${JSON.stringify(r.rows[0])}`);
      return;
    }
    console.log(`  ! profile ainda não encontrado, tentativa ${i + 2}…`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Profile não foi encontrado após 5 tentativas");
}

async function main() {
  let client;
  try {
    client = await applyMigrations();
    await createAdminUser();
    await promoteToAdmin(client);
    console.log("\n🎉 Setup completo!");
  } finally {
    if (client) await client.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Setup falhou:", err.message);
  process.exit(1);
});
