const technicalErrorNeedles = [
  "supabase",
  "vite_supabase",
  "supabase_url",
  "supabase_anon_key",
  "supabase_service_role_key",
  "variaveis ausentes",
  "variaveis de ambiente",
  "environment variable",
  "missing env",
  "row-level security",
  "permission denied",
  "rls",
  "sistema temporariamente indisponivel",
];

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

function normalizeErrorText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function publicErrorMessage(error: unknown, fallback: string) {
  const message = errorText(error).trim();
  if (!message) return fallback;

  const normalized = normalizeErrorText(message);
  if (technicalErrorNeedles.some((needle) => normalized.includes(needle))) {
    return fallback;
  }

  return message;
}
