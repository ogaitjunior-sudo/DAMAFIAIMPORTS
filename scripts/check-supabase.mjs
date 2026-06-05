import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = { ...process.env };

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    env[name] ??= value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function normalizeSupabaseUrl(value) {
  return String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

const supabaseUrl = normalizeSupabaseUrl(env.VITE_SUPABASE_URL || env.SUPABASE_URL);
const anonKey = String(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "").trim();
const serviceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const storageBucket = String(env.SUPABASE_STORAGE_BUCKET || "da-mafia-assets").trim();

const required = [
  ["VITE_SUPABASE_URL ou SUPABASE_URL", supabaseUrl],
  ["VITE_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY", anonKey],
];

let failed = false;

console.log("Variaveis Supabase:");
for (const [name, value] of required) {
  if (!value) {
    failed = true;
    console.log(`- ${name}: ausente`);
  } else {
    console.log(`- ${name}: OK (${value.length} caracteres)`);
  }
}

console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? `OK (${serviceRoleKey.length} caracteres)` : "ausente"}`);
console.log(`- SUPABASE_STORAGE_BUCKET: ${storageBucket}`);
console.log(`- tipo da chave publica: ${anonKey.startsWith("sb_publishable_") ? "publishable" : anonKey.startsWith("eyJ") ? "jwt" : "desconhecida"}`);
console.log(`- tipo da chave admin: ${serviceRoleKey.startsWith("sb_secret_") ? "secret" : serviceRoleKey.startsWith("eyJ") ? "jwt" : serviceRoleKey ? "desconhecida" : "ausente"}`);

if (failed) {
  process.exitCode = 1;
  process.exit();
}

const publicClient = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const adminClient = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

async function checkTables(label, client, tables, required = true) {
  console.log(`\nTabelas Supabase (${label}):`);
  for (const table of tables) {
    const { error } = await client.from(table).select("*").limit(1);
    if (error) {
      if (required) failed = true;
      console.log(`- ${table}: ERRO - ${error.message}`);
    } else {
      console.log(`- ${table}: OK`);
    }
  }
}

async function checkColumns(label, client, table, columns) {
  console.log(`\nColunas Supabase (${label}.${table}):`);
  for (const column of columns) {
    const { error } = await client.from(table).select(column).limit(1);
    if (error) {
      failed = true;
      console.log(`- ${column}: ERRO - ${error.message}`);
    } else {
      console.log(`- ${column}: OK`);
    }
  }
}

await checkTables("leitura publica/anon", publicClient, ["raffles", "products", "winners"]);

if (adminClient) {
  await checkTables("admin/service", adminClient, [
    "profiles",
    "users",
    "sessions",
    "raffles",
    "orders",
    "raffle_number_reservations",
    "tickets",
    "products",
    "winners",
  ]);
  await checkColumns("admin/service", adminClient, "raffles", ["reservation_mode"]);
  await checkColumns("admin/service", adminClient, "orders", ["reserved_until"]);
  await checkColumns("admin/service", adminClient, "raffle_number_reservations", [
    "raffle_id",
    "numbers",
    "status",
    "user_name",
    "whatsapp",
    "reserved_until",
    "confirmed_at",
  ]);
} else {
  console.log("\nTabelas Supabase (admin/service): pulado, SUPABASE_SERVICE_ROLE_KEY ausente.");
}

console.log("\nStorage Supabase:");
const { error: bucketError } = await (adminClient ?? publicClient).storage.getBucket(storageBucket);
if (bucketError) {
  failed = true;
  console.log(`- bucket ${storageBucket}: ERRO - ${bucketError.message}`);
} else {
  console.log(`- bucket ${storageBucket}: OK`);
}

if (failed) {
  console.log("\nAcao necessaria: rode supabase/schema.sql no SQL Editor do Supabase.");
  process.exitCode = 1;
} else {
  console.log("\nSupabase configurado e schema encontrado.");
}
