import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ImportMetaWithEnv = ImportMeta & {
  env?: Record<string, string | undefined>;
};

const viteEnv = ((import.meta as ImportMetaWithEnv).env ?? {}) as Record<
  string,
  string | undefined
>;

function cleanEnvValue(value: string | undefined) {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function localEnvValue(name: string) {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    const line = readFileSync(path, "utf-8")
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${name}=`));
    if (!line) continue;

    return cleanEnvValue(line.slice(line.indexOf("=") + 1));
  }

  return "";
}

function envValue(name: string) {
  return cleanEnvValue(process.env[name] ?? viteEnv[name]) || localEnvValue(name);
}

function normalizeSupabaseUrl(value: string) {
  return value.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

const supabaseUrl = normalizeSupabaseUrl(
  envValue("VITE_SUPABASE_URL") || envValue("SUPABASE_URL"),
);
const supabaseAnonKey = envValue("VITE_SUPABASE_ANON_KEY") || envValue("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = envValue("SUPABASE_SERVICE_ROLE_KEY");

export const configuredAdminEmail = envValue("VITE_ADMIN_SUPABASE_EMAIL")
  .toLowerCase()
  .trim();

export const storageBucket =
  envValue("SUPABASE_STORAGE_BUCKET") || "da-mafia-assets";

let adminClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

const databaseUnavailableMessage =
  "Sistema temporariamente indisponivel. Tente novamente em instantes.";

function missingSupabaseEnvNames() {
  return [
    supabaseUrl ? "" : "VITE_SUPABASE_URL ou SUPABASE_URL",
    supabaseAnonKey ? "" : "VITE_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY",
  ].filter(Boolean);
}

function supabaseNotConfiguredMessage() {
  const missing = missingSupabaseEnvNames();
  if (missing.length) {
    console.error(`[Supabase] configuracao incompleta: ${missing.join(", ")}`);
  }
  return databaseUnavailableMessage;
}

export const supabaseServiceRoleNotConfiguredMessage =
  "Sistema temporariamente indisponivel para salvar dados. Tente novamente em instantes.";

export function isSupabaseServerConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function hasSupabaseWriteAccess() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

export function getSupabaseAuthClient() {
  if (!isSupabaseServerConfigured()) return null;

  if (!authClient) {
    authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return authClient;
}

export function requireSupabaseAuthClient() {
  const client = getSupabaseAuthClient();
  if (!client) throw new Error(supabaseNotConfiguredMessage());
  return client;
}

export function requireSupabaseAdmin() {
  if (!isSupabaseServerConfigured()) throw new Error(supabaseNotConfiguredMessage());
  const client = getSupabaseAdmin();
  if (!client) throw new Error(supabaseServiceRoleNotConfiguredMessage);
  return client;
}

function supabaseErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error ?? "");
}

function supabaseErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return "";
}

export function isSupabasePermissionError(error: unknown) {
  const message = supabaseErrorMessage(error).toLowerCase();
  const code = supabaseErrorCode(error);
  return (
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not authorized")
  );
}

export function isSupabaseDuplicateError(error: unknown) {
  return supabaseErrorCode(error) === "23505";
}

export function isSupabaseMissingTableError(error: unknown) {
  const message = supabaseErrorMessage(error).toLowerCase();
  const code = supabaseErrorCode(error);
  return (
    code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

export function logSupabaseError(operation: string, error: unknown) {
  console.error(`[Supabase] ${operation}`, error);
}

export function publicSupabaseErrorMessage(error: unknown, fallback = "Erro ao salvar no banco.") {
  if (isSupabaseMissingTableError(error)) {
    return databaseUnavailableMessage;
  }
  if (isSupabasePermissionError(error)) {
    return databaseUnavailableMessage;
  }
  return fallback;
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  return "bin";
}

export async function uploadDataUrlToStorage(value: string, folder: string) {
  if (!value?.startsWith("data:")) return value;

  const supabase = requireSupabaseAdmin();

  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return value;

  const [, mimeType, encoded] = match;
  const bytes = Buffer.from(encoded, "base64");
  const path = `${folder}/${randomUUID()}.${extensionFromMime(mimeType)}`;

  const { error } = await supabase.storage.from(storageBucket).upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    logSupabaseError("storage upload", error);
    throw new Error("Nao foi possivel enviar a foto. Tente novamente em instantes.");
  }

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
  return data.publicUrl;
}
