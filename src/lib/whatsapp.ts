export const userWhatsappStorageKey = "user_whatsapp";

export function whatsappDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeBrazilianWhatsapp(value: string) {
  const digits = whatsappDigits(value);
  if (digits.startsWith("55") && digits.length > 11) return digits.slice(2, 13);
  return digits.slice(0, 11);
}

export function isValidBrazilianWhatsapp(value: string) {
  const digits = normalizeBrazilianWhatsapp(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatBrazilianWhatsapp(value: string) {
  const digits = normalizeBrazilianWhatsapp(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function readStoredWhatsapp() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(userWhatsappStorageKey) ?? "";
}

export function saveStoredWhatsapp(value: string) {
  if (typeof window === "undefined") return;
  const formatted = formatBrazilianWhatsapp(value);
  if (formatted) window.localStorage.setItem(userWhatsappStorageKey, formatted);
}
