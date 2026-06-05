import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { OrderStatus, Product, ProductCategory, PublicUser, Raffle, RaffleNumberReservation, RaffleOrder, RaffleStatus, ReservationMode, ReservedNumberInfo, SoldNumberInfo, Ticket, Winner } from "./types";
import {
  configuredAdminEmail,
  getSupabaseAdmin,
  isSupabaseDuplicateError,
  isSupabaseMissingTableError,
  logSupabaseError,
  publicSupabaseErrorMessage,
  requireSupabaseAdmin,
  requireSupabaseAuthClient,
  uploadDataUrlToStorage,
} from "./supabase.server";

type RegisterInput = {
  name: string;
  email?: string;
  phone: string;
  cpf?: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type CreateRaffleInput = {
  title: string;
  description: string;
  pricePerNumber: number;
  totalNumbers: number;
  drawDate: string;
  image: string;
  images?: string[];
  pixKey: string;
  adminWhatsapp: string;
  reservationMode?: ReservationMode;
  status?: RaffleStatus;
};

type UpdateRaffleInput = CreateRaffleInput & {
  id: string;
};

type CreateProductInput = {
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  description: string;
  image: string;
};

type CreateWinnerInput = {
  title: string;
  description: string;
  winnerName: string;
  city: string;
  date: string;
  image: string;
  video?: string;
  status?: Winner["status"];
};

type CreateOrderInput = {
  raffleId: string;
  buyerName: string;
  buyerWhatsapp: string;
  buyerCpf?: string;
  numbers: number[];
};

const defaultPixKey = "71992929927";
const defaultPixProvider = "Mercado Pago";
const defaultPixHolder = "DA MAFIA IMPORTS";
const defaultAdminWhatsapp = "5522997701093";
const adminLoginPhone = "22997701093";
const adminLoginWhatsapp = "5522997701093";
const adminLoginPassword = "admin123";
const adminLoginEmail = configuredAdminEmail || "admin@damafiaimports.com";
const defaultReservationMode: ReservationMode = "auto_24h";
const reservationHoldMs = 24 * 60 * 60 * 1000;
const raffleAliases: Record<string, string> = { "r4-d7fabf": "r1" };
const categories: ProductCategory[] = ["Perfumes", "Jerseys", "Acessorios", "Sneakers", "Relogios", "Premium", "Acessorios"];
const sessionTokenSecret = process.env.DA_MAFIA_SESSION_SECRET || "da-mafia-session-token-v1";

function sanitizeText(value: unknown, maxLength = 160) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 15);
}

function compactBrazilPhone(phone: string) {
  return phone.startsWith("55") && phone.length > 11 ? phone.slice(2) : phone;
}

function phoneMatches(left: string, right: string) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (a.length < 8 || b.length < 8) return false;
  const compactA = compactBrazilPhone(a);
  const compactB = compactBrazilPhone(b);
  return a === b || compactA === compactB || compactA.endsWith(compactB) || compactB.endsWith(compactA);
}

function isAdminWhatsapp(value: unknown) {
  const phone = normalizePhone(value);
  return phoneMatches(phone, adminLoginPhone) || phoneMatches(phone, adminLoginWhatsapp) || phoneMatches(phone, defaultAdminWhatsapp);
}

function isAdminEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  return normalizedEmail === adminLoginEmail || Boolean(configuredAdminEmail && normalizedEmail === configuredAdminEmail);
}

function adminUserFromLogin(identifier: string): PublicUser {
  const phone = normalizePhone(identifier) || adminLoginWhatsapp;
  return {
    id: "user-admin",
    name: "Administrador DA MAFIA",
    email: adminLoginEmail,
    phone: phoneMatches(phone, adminLoginWhatsapp) ? adminLoginWhatsapp : phone,
    cpf: "",
    role: "admin",
  };
}

function normalizeCpf(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

function customerEmailFromPhone(phone: string) {
  return `cliente-${normalizePhone(phone)}@damafia.local`;
}

function normalizeProductCategory(category: unknown): ProductCategory {
  return categories.includes(category as ProductCategory) ? (category as ProductCategory) : "Acessorios";
}

function isReservationMode(mode: unknown): mode is ReservationMode {
  return mode === "manual_admin" || mode === "auto_24h";
}

function normalizeReservationMode(mode: unknown): ReservationMode {
  return isReservationMode(mode) ? mode : defaultReservationMode;
}

const reservationModeDescriptionPattern = /\s*\[\[DA_MAFIA_RESERVATION_MODE:(auto_24h|manual_admin)\]\]\s*$/;

function reservationModeFromDescription(descriptionValue: unknown): ReservationMode | undefined {
  const markerMode = String(descriptionValue ?? "").match(reservationModeDescriptionPattern)?.[1];
  return isReservationMode(markerMode) ? markerMode : undefined;
}

function parseRaffleDescription(descriptionValue: unknown, reservationModeValue?: unknown) {
  const rawDescription = String(descriptionValue ?? "");
  return {
    description: rawDescription.replace(reservationModeDescriptionPattern, "").trim(),
    reservationMode: normalizeReservationMode(reservationModeValue ?? reservationModeFromDescription(rawDescription)),
  };
}

function descriptionWithReservationMode(descriptionValue: unknown, reservationMode: ReservationMode) {
  const { description } = parseRaffleDescription(descriptionValue);
  return `${description}${description ? " " : ""}[[DA_MAFIA_RESERVATION_MODE:${reservationMode}]]`;
}

function publicBuyerName(name: unknown) {
  const cleanName = sanitizeText(name, 120);
  return cleanName || "Cliente não identificado";
}

function firstPublicBuyerName(...names: unknown[]) {
  for (const name of names) {
    const cleanName = sanitizeText(name, 120);
    if (cleanName) return cleanName;
  }
  return "Cliente não identificado";
}

function numberList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter((number) => Number.isFinite(number));
}

function participantName(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    return (value as { name?: unknown }).name;
  }
  return "";
}

function reservationModeFromRow(row: any): ReservationMode {
  if (Object.prototype.hasOwnProperty.call(row ?? {}, "reserved_until") && row.reserved_until === null) {
    return "manual_admin";
  }
  return normalizeReservationMode(
    row?.reservation_mode ??
    row?.raffles?.reservation_mode ??
    reservationModeFromDescription(row?.raffles?.description),
  );
}

function orderReservationModeFromRow(row: any): ReservationMode {
  const configuredMode =
    row?.reservation_mode ??
    row?.raffles?.reservation_mode ??
    reservationModeFromDescription(row?.raffles?.description);
  if (isReservationMode(configuredMode)) return configuredMode;
  if (Object.prototype.hasOwnProperty.call(row ?? {}, "reserved_until") && row.reserved_until === null) {
    return "manual_admin";
  }
  return defaultReservationMode;
}

function normalizeNumbers(numbers: number[], totalNumbers: number) {
  const uniqueNumbers = [...new Set(numbers.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!uniqueNumbers.length) throw new Error("Selecione pelo menos um número.");
  const invalid = uniqueNumbers.find((number) => !Number.isInteger(number) || number < 0 || number >= totalNumbers);
  if (invalid !== undefined) throw new Error(`Número ${String(invalid).padStart(2, "0")} inválido.`);
  return uniqueNumbers;
}

function mapRaffle(row: any): Raffle {
  const imageUrls = Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean) : [];
  const parsedDescription = parseRaffleDescription(row.description, row.reservation_mode);
  return {
    id: row.id,
    title: row.title,
    description: parsedDescription.description,
    pricePerNumber: Number(row.price_per_ticket ?? 0),
    totalNumbers: Number(row.total_numbers ?? 0),
    soldNumbers: Number(row.sold_numbers ?? 0),
    status: row.status ?? "ativa",
    drawDate: row.draw_date ?? "",
    image: row.image_url ?? imageUrls[0] ?? "gold",
    images: imageUrls.length ? imageUrls : row.image_url ? [row.image_url] : [],
    pixKey: row.pix_key ?? defaultPixKey,
    adminWhatsapp: row.admin_whatsapp ?? defaultAdminWhatsapp,
    reservationMode: parsedDescription.reservationMode,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: normalizeProductCategory(row.category),
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    description: row.description ?? "",
    image: row.image_url ?? "/assets/da-mafia/product-perfume-noir.svg",
  };
}

function mapWinner(row: any): Winner {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    winnerName: row.winner_name ?? "",
    city: row.city ?? "",
    date: row.date ?? "",
    image: row.image_url ?? "/assets/winners/winner-01.jpg",
    video: row.video_url ?? "",
    status: row.status === "destaque" ? "destaque" : "confirmado",
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapOrder(row: any): RaffleOrder {
  const reservationMode = orderReservationModeFromRow(row);
  const pendingReservedUntil =
    reservationMode === "auto_24h" && row.status === "pending" && row.created_at
      ? new Date(new Date(row.created_at).getTime() + reservationHoldMs).toISOString()
      : null;

  return {
    id: row.id,
    raffleId: row.raffle_id,
    buyerName: row.buyer_name ?? "",
    buyerWhatsapp: row.buyer_whatsapp ?? "",
    buyerCpf: row.buyer_cpf ?? "",
    selectedNumbers: Array.isArray(row.selected_numbers) ? row.selected_numbers.map(Number) : [],
    totalAmount: Number(row.total_amount ?? 0),
    status: row.status ?? "pending",
    createdAt: row.created_at ?? new Date().toISOString(),
    paidAt: row.paid_at ?? null,
    ticketId: row.ticket_id ?? null,
    pixCopyPaste: row.pix_copy_paste ?? "",
    reservedUntil: row.reserved_until ?? pendingReservedUntil,
    reservationMode,
    source: "order",
  };
}

function normalizeReservationStatus(status: unknown): RaffleNumberReservation["status"] {
  if (status === "pending_payment") return "reserved";
  if (status === "canceled") return "cancelled";
  if (
    status === "available" ||
    status === "selected" ||
    status === "reserved" ||
    status === "confirmed" ||
    status === "cancelled" ||
    status === "expired"
  ) {
    return status;
  }
  return "reserved";
}

function mapReservation(row: any): RaffleNumberReservation {
  return {
    id: row.id,
    raffleId: row.raffle_id,
    userName: row.user_name ?? "",
    whatsapp: row.whatsapp ?? "",
    numbers: Array.isArray(row.numbers) ? row.numbers.map(Number) : [],
    total: Number(row.total ?? 0),
    status: normalizeReservationStatus(row.status),
    paymentProof: row.payment_proof ?? null,
    reservedUntil: row.reserved_until ?? null,
    reservationMode: reservationModeFromRow(row),
    createdAt: row.created_at ?? new Date().toISOString(),
    confirmedAt: row.confirmed_at ?? null,
  };
}

function reservationToOrder(row: any, raffleTitle?: string): RaffleOrder & { raffle?: string } {
  const reservation = mapReservation(row);
  return {
    id: reservation.id,
    raffleId: reservation.raffleId,
    buyerName: reservation.userName,
    buyerWhatsapp: reservation.whatsapp,
    buyerCpf: "",
    selectedNumbers: reservation.numbers,
    totalAmount: reservation.total,
    status: reservation.status,
    createdAt: reservation.createdAt,
    paidAt: reservation.confirmedAt ?? null,
    ticketId: null,
    pixCopyPaste: "",
    reservedUntil: reservation.reservedUntil,
    reservationMode: reservation.reservationMode,
    confirmedAt: reservation.confirmedAt ?? null,
    paymentProof: reservation.paymentProof ?? null,
    source: "reservation",
    raffle: raffleTitle,
  };
}

function publicUser(row: any): PublicUser {
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    cpf: row.cpf ?? "",
    role: row.role === "admin" ? "admin" : "customer",
  };
}

function isPublicUser(value: unknown): value is PublicUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<PublicUser>;
  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    typeof user.phone === "string" &&
    typeof user.cpf === "string" &&
    (user.role === "customer" || user.role === "admin")
  );
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", sessionTokenSecret).update(payload).digest("base64url");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function throwSupabaseError(operation: string, error: unknown, fallback = "Erro ao salvar no banco. Tente novamente.") {
  logSupabaseError(operation, error);
  throw new Error(publicSupabaseErrorMessage(error, fallback));
}

function backendErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error ?? "");
}

function isMissingSchemaColumn(error: unknown, column: string) {
  const message = backendErrorMessage(error).toLowerCase();
  const expectedColumn = column.toLowerCase();
  return (
    message.includes(expectedColumn) &&
    (message.includes("schema cache") || message.includes("could not find") || message.includes("does not exist"))
  );
}

function publicReadClient() {
  return getSupabaseAdmin() ?? requireSupabaseAuthClient();
}

function reservationErrorMessage(error: unknown, fallback = "Não foi possível reservar estes números.") {
  const message = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message ?? "")
    : String(error ?? "");
  const cleanMessage = message.replace(/^ERROR:\s*/i, "").trim();
  if (
    cleanMessage.includes("Rifa indispon") ||
    cleanMessage.includes("Selecione") ||
    cleanMessage.includes("Número") ||
    cleanMessage.includes("número") ||
    cleanMessage.includes("númer") ||
    cleanMessage.includes("reserva") ||
    cleanMessage.includes("pagos") ||
    cleanMessage.includes("vendidos") ||
    cleanMessage.includes("pendente") ||
    cleanMessage.includes("expirou")
  ) {
    return cleanMessage;
  }
  return publicSupabaseErrorMessage(error, fallback);
}

function isLegacyZeroBasedReservationValidationError(error: unknown, selectedNumbers: number[]) {
  if (!selectedNumbers.includes(0)) return false;
  const message = backendErrorMessage(error).toLowerCase();
  return (message.includes("00") || message.includes(" 0 ")) && message.includes("inv");
}

function makePixCopyPaste(raffle: Raffle, orderId: string, amount: number) {
  return [
    "PIX DA MAFIA IMPORTS",
    `Instituição: ${defaultPixProvider}`,
    `Titular: ${defaultPixHolder}`,
    `Chave: ${raffle.pixKey}`,
    `Valor: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    `Rifa: ${raffle.title}`,
    `Pedido: ${orderId}`,
  ].join(" | ");
}

async function uploadMany(images: string[], folder: string) {
  const urls: string[] = [];
  for (const image of images.filter(Boolean).slice(0, 12)) {
    urls.push(await uploadDataUrlToStorage(image, folder));
  }
  return urls;
}

async function findProfileByIdentifier(identifier: string) {
  const supabase = requireSupabaseAdmin();
  const normalized = normalizePhone(identifier);
  const lower = identifier.trim().toLowerCase();
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throwSupabaseError("profiles select by identifier", error, "Erro ao consultar usuario.");
  return (data ?? []).find((profile) => {
    return profile.email?.toLowerCase() === lower || (!!normalized && phoneMatches(profile.phone ?? "", normalized));
  }) ?? null;
}

async function findProfileByIdentifierSafe(identifier: string) {
  try {
    return await findProfileByIdentifier(identifier);
  } catch (error) {
    logSupabaseError("profiles select by identifier safe", error);
    return null;
  }
}

function loginEmailCandidates(identifier: string, profile?: { email?: string | null } | null) {
  const normalizedPhone = normalizePhone(identifier);
  const lower = identifier.trim().toLowerCase();
  const candidates = [
    profile?.email,
    lower.includes("@") ? lower : "",
    normalizedPhone && isAdminWhatsapp(normalizedPhone) ? adminLoginEmail : "",
    normalizedPhone ? customerEmailFromPhone(normalizedPhone) : "",
  ];
  return [...new Set(candidates.map((value) => sanitizeText(value, 180).toLowerCase()).filter(Boolean))];
}

function fallbackUserFromLogin(identifier: string, email: string, authUserId?: string): PublicUser {
  const phone = normalizePhone(identifier);
  const isAdmin = isAdminEmail(email) || isAdminWhatsapp(identifier);
  return {
    id: authUserId ? `auth-${authUserId}` : `login-${phone || email}`,
    name: isAdmin ? "Administrador DA MAFIA" : "Cliente DA MAFIA",
    email,
    phone: phone || (isAdmin ? adminLoginWhatsapp : ""),
    cpf: "",
    role: isAdmin ? "admin" : "customer",
  };
}

async function findRaffleByPublicId(id: string) {
  const supabase = publicReadClient();
  const { data } = await supabase.from("raffles").select("*").eq("id", id).maybeSingle();
  if (data) return mapRaffle(data);
  const alias = raffleAliases[id];
  if (!alias) return null;
  const { data: aliased } = await supabase.from("raffles").select("*").eq("id", alias).maybeSingle();
  return aliased ? mapRaffle(aliased) : null;
}

async function expireReservations() {
  const { error } = await requireSupabaseAdmin().rpc("expire_raffle_reservations");
  if (error && isSupabaseMissingTableError(error)) return;
  if (error) throwSupabaseError("reservations expire rpc", error, "Erro ao atualizar reservas expiradas.");
}

async function pendingReservationsForRaffle(raffleId: string) {
  const reservationNumbers = (await activeReservationsForRaffle(raffleId)).map((reservation) => reservation.number);
  const pendingOrderNumbers = (await activeOrderReservationsForRaffle(raffleId)).map((reservation) => reservation.number);
  return [...new Set([...(reservationNumbers ?? []), ...pendingOrderNumbers])].sort((a, b) => a - b);
}

async function activeReservationsForRaffle(raffleId: string): Promise<ReservedNumberInfo[]> {
  await expireReservations();
  const result = await requireSupabaseAdmin()
    .from("raffle_number_reservations")
    .select("numbers,user_name,reserved_until,status,raffles(reservation_mode,description)")
    .eq("raffle_id", raffleId)
    .in("status", ["reserved", "pending_payment"]);
  const fallbackResult = result.error && isMissingSchemaColumn(result.error, "reservation_mode")
    ? await requireSupabaseAdmin()
      .from("raffle_number_reservations")
      .select("numbers,user_name,reserved_until,status,raffles(description)")
      .eq("raffle_id", raffleId)
      .in("status", ["reserved", "pending_payment"])
    : result;
  const { data, error } = fallbackResult;

  if (error && isSupabaseMissingTableError(error)) return [];
  if (error) throwSupabaseError("reservations pending numbers select", error, "Erro ao consultar reservas.");

  const now = Date.now();
  return (data ?? [])
    .filter((reservation) => {
      if (normalizeReservationStatus(reservation.status) !== "reserved") return false;
      if (!reservation.reserved_until) return true;
      return new Date(reservation.reserved_until).getTime() > now;
    })
    .flatMap((reservation) => {
      const numbers = Array.isArray(reservation.numbers) ? reservation.numbers.map(Number) : [];
      const reservationMode = reservationModeFromRow(reservation);
      return numbers.map((number) => ({
        number,
        buyerName: publicBuyerName(reservation.user_name),
        reservedUntil: reservation.reserved_until ?? null,
        reservationMode,
      }));
    });
}

async function activeOrderReservationsForRaffle(raffleId: string): Promise<ReservedNumberInfo[]> {
  const reservationCutoff = new Date(Date.now() - reservationHoldMs).toISOString();
  const now = Date.now();
  const { data, error } = await requireSupabaseAdmin()
    .from("orders")
    .select("selected_numbers,buyer_name,created_at,reserved_until,raffles(reservation_mode,description)")
    .eq("raffle_id", raffleId)
    .eq("status", "pending");
  if (
    error &&
    (isSupabaseMissingTableError(error) ||
      isMissingSchemaColumn(error, "reserved_until") ||
      isMissingSchemaColumn(error, "reservation_mode"))
  ) {
    const raffle = await findRaffleByPublicId(raffleId);
    const reservationMode = raffle?.reservationMode ?? defaultReservationMode;
    let legacyQuery = requireSupabaseAdmin()
      .from("orders")
      .select("selected_numbers,buyer_name,created_at")
      .eq("raffle_id", raffleId)
      .eq("status", "pending");
    if (reservationMode === "auto_24h") {
      legacyQuery = legacyQuery.gte("created_at", reservationCutoff);
    }
    const legacy = await legacyQuery;
    if (legacy.error) throwSupabaseError("orders pending numbers select", legacy.error, "Erro ao consultar reservas.");
    return (legacy.data ?? []).flatMap((order) => {
      const numbers = Array.isArray(order.selected_numbers) ? order.selected_numbers.map(Number) : [];
      return numbers.map((number) => ({
        number,
        buyerName: publicBuyerName(order.buyer_name),
        reservedUntil: reservationMode === "auto_24h" && order.created_at
          ? new Date(new Date(order.created_at).getTime() + reservationHoldMs).toISOString()
          : null,
        reservationMode,
      }));
    });
  }
  if (error) throwSupabaseError("orders pending numbers select", error, "Erro ao consultar reservas.");
  return (data ?? [])
    .filter((order) => {
      const mode = orderReservationModeFromRow(order);
      if (mode === "manual_admin") return true;
      if (order.reserved_until) return new Date(order.reserved_until).getTime() > now;
      return new Date(order.created_at).getTime() >= new Date(reservationCutoff).getTime();
    })
    .flatMap((order) => {
      const numbers = Array.isArray(order.selected_numbers) ? order.selected_numbers.map(Number) : [];
      const reservationMode = orderReservationModeFromRow(order);
      const reservedUntil = order.reserved_until
        ?? (reservationMode === "auto_24h" && order.created_at ? new Date(new Date(order.created_at).getTime() + reservationHoldMs).toISOString() : null);
      return numbers.map((number) => ({
        number,
        buyerName: publicBuyerName(order.buyer_name),
        reservedUntil,
        reservationMode,
      }));
    });
}

async function paidNumbersForRaffle(raffleId: string) {
  return (await soldNumberDetailsForRaffle(raffleId)).map((sale) => sale.number);
}

async function fetchPaidTicketRows(raffleId: string) {
  const supabase = requireSupabaseAdmin();
  const full = await supabase.from("tickets").select("numbers,participant,paid_at,created_at").eq("raffle_id", raffleId).eq("paid", true);
  if (!full.error) return full.data ?? [];
  if (!isSupabaseMissingTableError(full.error)) {
    throwSupabaseError("tickets paid numbers select", full.error, "Erro ao consultar numeros pagos.");
  }

  const fallback = await supabase.from("tickets").select("numbers,participant,created_at").eq("raffle_id", raffleId).eq("paid", true);
  if (!fallback.error) return fallback.data ?? [];
  if (!isSupabaseMissingTableError(fallback.error)) {
    throwSupabaseError("tickets paid numbers select", fallback.error, "Erro ao consultar numeros pagos.");
  }

  const minimal = await supabase.from("tickets").select("numbers,created_at").eq("raffle_id", raffleId).eq("paid", true);
  if (!minimal.error) return minimal.data ?? [];
  if (isSupabaseMissingTableError(minimal.error)) return [];
  throwSupabaseError("tickets paid numbers select", minimal.error, "Erro ao consultar numeros pagos.");
}

async function fetchConfirmedReservationRows(raffleId: string) {
  const supabase = requireSupabaseAdmin();
  const full = await supabase.from("raffle_number_reservations").select("numbers,user_name,confirmed_at,created_at").eq("raffle_id", raffleId).eq("status", "confirmed");
  if (!full.error) return full.data ?? [];
  if (!isSupabaseMissingTableError(full.error)) {
    throwSupabaseError("reservations confirmed numbers select", full.error, "Erro ao consultar numeros confirmados.");
  }

  const fallback = await supabase.from("raffle_number_reservations").select("numbers,user_name,created_at").eq("raffle_id", raffleId).eq("status", "confirmed");
  if (!fallback.error) return fallback.data ?? [];
  if (!isSupabaseMissingTableError(fallback.error)) {
    throwSupabaseError("reservations confirmed numbers select", fallback.error, "Erro ao consultar numeros confirmados.");
  }

  const minimal = await supabase.from("raffle_number_reservations").select("numbers,created_at").eq("raffle_id", raffleId).eq("status", "confirmed");
  if (!minimal.error) return minimal.data ?? [];
  if (isSupabaseMissingTableError(minimal.error)) return [];
  throwSupabaseError("reservations confirmed numbers select", minimal.error, "Erro ao consultar numeros confirmados.");
}

async function fetchPaidOrderRows(raffleId: string) {
  const supabase = requireSupabaseAdmin();
  const full = await supabase.from("orders").select("selected_numbers,buyer_name,paid_at,created_at").eq("raffle_id", raffleId).eq("status", "paid");
  if (!full.error) return full.data ?? [];
  if (!isSupabaseMissingTableError(full.error)) {
    throwSupabaseError("orders paid numbers select", full.error, "Erro ao consultar numeros pagos.");
  }

  const fallback = await supabase.from("orders").select("selected_numbers,buyer_name,created_at").eq("raffle_id", raffleId).eq("status", "paid");
  if (!fallback.error) return fallback.data ?? [];
  if (!isSupabaseMissingTableError(fallback.error)) {
    throwSupabaseError("orders paid numbers select", fallback.error, "Erro ao consultar numeros pagos.");
  }

  const minimal = await supabase.from("orders").select("selected_numbers,created_at").eq("raffle_id", raffleId).eq("status", "paid");
  if (!minimal.error) return minimal.data ?? [];
  if (isSupabaseMissingTableError(minimal.error)) return [];
  throwSupabaseError("orders paid numbers select", minimal.error, "Erro ao consultar numeros pagos.");
}

async function soldNumberDetailsForRaffle(raffleId: string): Promise<SoldNumberInfo[]> {
  await expireReservations();
  const [tickets, reservations, orders] = await Promise.all([
    fetchPaidTicketRows(raffleId),
    fetchConfirmedReservationRows(raffleId),
    fetchPaidOrderRows(raffleId),
  ]);

  const details: SoldNumberInfo[] = [
    ...reservations.flatMap((reservation) => {
      const numbers = numberList(reservation.numbers);
      return numbers.map((number) => ({
        number,
        buyerName: firstPublicBuyerName("user_name" in reservation ? reservation.user_name : ""),
        confirmedAt: reservation.confirmed_at ?? reservation.created_at ?? null,
      }));
    }),
    ...orders.flatMap((order) => {
      const numbers = numberList(order.selected_numbers);
      return numbers.map((number) => ({
        number,
        buyerName: firstPublicBuyerName("buyer_name" in order ? order.buyer_name : ""),
        confirmedAt: order.paid_at ?? order.created_at ?? null,
      }));
    }),
    ...tickets.flatMap((ticket) => {
      const numbers = numberList(ticket.numbers);
      return numbers.map((number) => ({
        number,
        buyerName: firstPublicBuyerName("participant" in ticket ? participantName(ticket.participant) : ""),
        confirmedAt: ticket.paid_at ?? ticket.created_at ?? null,
      }));
    }),
  ];

  const seen = new Set<number>();
  return details.filter((sale) => {
    if (seen.has(sale.number)) return false;
    seen.add(sale.number);
    return true;
  }).sort((a, b) => a.number - b.number);
}

async function syncSoldNumbers(raffleId: string) {
  const supabase = requireSupabaseAdmin();
  const soldNumbers = await paidNumbersForRaffle(raffleId);
  const { error } = await supabase.from("raffles").update({ sold_numbers: soldNumbers.length }).eq("id", raffleId);
  if (error) throwSupabaseError("raffles sold_numbers update", error);
  return soldNumbers.length;
}

export async function listRaffles() {
  const { data, error } = await publicReadClient().from("raffles").select("*").order("created_at", { ascending: false });
  if (error) throwSupabaseError("raffles select", error, "Erro ao carregar rifas.");
  return (data ?? []).map(mapRaffle);
}

export async function listProducts() {
  const { data, error } = await publicReadClient().from("products").select("*").order("created_at", { ascending: false });
  if (error) throwSupabaseError("products select", error, "Erro ao carregar produtos.");
  return (data ?? []).map(mapProduct);
}

export async function listWinners() {
  const { data, error } = await publicReadClient().from("winners").select("*").order("date", { ascending: false });
  if (error) throwSupabaseError("winners select", error, "Erro ao carregar vencedores.");
  return (data ?? []).map(mapWinner);
}

export async function getRaffle(id: string) {
  return findRaffleByPublicId(id);
}

export async function getRaffleSoldNumbers(id: string) {
  const raffle = await findRaffleByPublicId(id);
  return raffle ? paidNumbersForRaffle(raffle.id) : [];
}

export async function getRaffleSoldNumberDetails(id: string) {
  const raffle = await findRaffleByPublicId(id);
  return raffle ? soldNumberDetailsForRaffle(raffle.id) : [];
}

export async function getRaffleReservedNumbers(id: string) {
  const raffle = await findRaffleByPublicId(id);
  return raffle ? pendingReservationsForRaffle(raffle.id) : [];
}

export async function getRaffleReservedNumberDetails(id: string) {
  const raffle = await findRaffleByPublicId(id);
  if (!raffle) return [];
  const details = [
    ...(await activeReservationsForRaffle(raffle.id)),
    ...(await activeOrderReservationsForRaffle(raffle.id)),
  ];
  const seen = new Set<number>();
  return details.filter((reservation) => {
    if (seen.has(reservation.number)) return false;
    seen.add(reservation.number);
    return true;
  });
}

export async function getRaffleRecentOrders(id: string) {
  const raffle = await findRaffleByPublicId(id);
  if (!raffle) return [];
  const { data, error } = await requireSupabaseAdmin()
    .from("orders")
    .select("id,buyer_name,selected_numbers,total_amount,paid_at,created_at")
    .eq("raffle_id", raffle.id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(4);
  if (error) throwSupabaseError("recent orders select", error, "Erro ao carregar pedidos recentes.");
  return (data ?? []).map((order) => ({
    id: order.id,
    buyerName: order.buyer_name,
    selectedNumbers: order.selected_numbers ?? [],
    totalAmount: Number(order.total_amount ?? 0),
    paidAt: order.paid_at,
    createdAt: order.created_at,
  }));
}

export async function listMyNumbersByWhatsapp(whatsapp: string) {
  const phone = normalizePhone(whatsapp);
  if (phone.length < 10) throw new Error("Informe um WhatsApp válido.");
  const supabase = requireSupabaseAdmin();
  const { data: orders, error } = await supabase.from("orders").select("*,raffles(*)").order("created_at", { ascending: false });
  if (error) throwSupabaseError("orders select by whatsapp", error, "Erro ao carregar seus numeros.");

  return (orders ?? [])
    .filter((order) => phoneMatches(order.buyer_whatsapp ?? "", phone))
    .map((order) => {
      const raffle = mapRaffle(order.raffles);
      return {
        id: order.id,
        raffleId: raffle.id,
        raffleTitle: raffle.title,
        raffleImage: raffle.image,
        raffleDrawDate: raffle.drawDate,
        adminWhatsapp: raffle.adminWhatsapp,
        buyerName: order.buyer_name,
        buyerWhatsapp: order.buyer_whatsapp,
        numbers: order.selected_numbers ?? [],
        totalAmount: Number(order.total_amount ?? 0),
        status: order.status,
        createdAt: order.created_at,
        paidAt: order.paid_at ?? null,
        validationCode: order.validation_code ?? null,
        pixCopyPaste: order.pix_copy_paste ?? "",
      };
    });
}

export async function validateTicket(code: string, identity?: string) {
  const normalizedCode = code.trim().toUpperCase();
  const { data: ticket, error } = await requireSupabaseAdmin()
    .from("tickets")
    .select("*,raffles(*)")
    .ilike("code", normalizedCode)
    .maybeSingle();
  if (error) throwSupabaseError("ticket validate select", error, "Erro ao validar bilhete.");
  if (!ticket) return null;

  const participant = ticket.participant ?? {};
  const normalizedIdentity = identity?.trim().toLowerCase();
  if (normalizedIdentity) {
    const matches = [
      String(participant.email ?? "").toLowerCase(),
      normalizePhone(participant.phone),
      normalizeCpf(participant.cpf),
    ].includes(normalizedIdentity) || phoneMatches(String(participant.phone ?? ""), normalizedIdentity);
    if (!matches) return null;
  }

  return {
    participant: participant.name ?? "",
    email: participant.email ?? "",
    phone: participant.phone ?? "",
    cpf: participant.cpf ?? "",
    raffle: ticket.raffles?.title ?? "Rifa",
    numbers: ticket.numbers ?? [],
    paid: Boolean(ticket.paid),
    status: ticket.paid ? "PAGO" : "PENDENTE",
    date: new Date(ticket.paid_at ?? ticket.created_at).toLocaleDateString("pt-BR"),
    code: ticket.code,
  };
}

export async function registerUser(input: RegisterInput) {
  const phone = normalizePhone(input.phone);
  if (phone.length < 10) throw new Error("Informe um WhatsApp válido.");
  const name = sanitizeText(input.name, 120);
  if (!name) throw new Error("Informe o nome completo.");
  const existing = await findProfileByIdentifier(phone);
  if (existing) throw new Error("Este WhatsApp já está cadastrado.");

  const supabase = requireSupabaseAdmin();
  const role = isAdminWhatsapp(phone) ? "admin" : "customer";
  const email = role === "admin" ? adminLoginEmail : sanitizeText(input.email ?? "", 160).toLowerCase() || customerEmailFromPhone(phone);
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name, phone },
  });
  if (authError) {
    logSupabaseError("auth admin create user", authError);
    if (isSupabaseDuplicateError(authError)) throw new Error("Este WhatsApp já está cadastrado.");
    throw new Error(publicSupabaseErrorMessage(authError, "Erro ao salvar no banco."));
  }
  if (!authData.user) throw new Error("Erro ao salvar no banco.");

  const profile = {
    id: `user-${randomBytes(8).toString("hex")}`,
    auth_user_id: authData.user.id,
    name,
    email,
    phone,
    cpf: normalizeCpf(input.cpf),
    role,
  };
  const { data, error } = await supabase.from("profiles").insert(profile).select("*").single();
  if (error) {
    logSupabaseError("profiles insert", error);
    await supabase.auth.admin.deleteUser(authData.user.id).catch((deleteError) => {
      logSupabaseError("auth rollback delete user", deleteError);
    });
    if (isSupabaseDuplicateError(error)) throw new Error("Este WhatsApp já está cadastrado.");
    throw new Error(publicSupabaseErrorMessage(error, "Erro ao salvar no banco."));
  }

  const { error: mirrorError } = await supabase.from("users").upsert({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    cpf: profile.cpf,
    role: profile.role,
  });
  if (mirrorError) logSupabaseError("users mirror upsert", mirrorError);
  return publicUser(data);
}

export async function loginUser(input: LoginInput) {
  if (isAdminWhatsapp(input.email) && input.password === adminLoginPassword) {
    return { user: adminUserFromLogin(input.email) };
  }

  const profile = await findProfileByIdentifierSafe(input.email);
  const candidates = loginEmailCandidates(input.email, profile);
  if (!candidates.length) throw new Error("Usuario nao encontrado.");

  const authClient = requireSupabaseAuthClient();
  let authenticatedEmail = "";
  let authUserId = "";
  let lastError: unknown = null;

  for (const email of candidates) {
    const { data, error } = await authClient.auth.signInWithPassword({ email, password: input.password });
    if (!error) {
      authenticatedEmail = email;
      authUserId = data.user?.id ?? "";
      break;
    }
    lastError = error;
  }

  if (!authenticatedEmail) {
    logSupabaseError("auth sign in", lastError);
    throw new Error("WhatsApp ou senha incorretos.");
  }

  const authenticatedProfile = profile
    ?? await findProfileByIdentifierSafe(input.email)
    ?? await findProfileByIdentifierSafe(authenticatedEmail);

  return { user: authenticatedProfile ? publicUser(authenticatedProfile) : fallbackUserFromLogin(input.email, authenticatedEmail, authUserId) };
}

export async function getUserBySession(sessionId?: string) {
  if (!sessionId) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data: session, error } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error || !session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await deleteSession(sessionId);
    return null;
  }
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user_id).maybeSingle();
  return profile ? publicUser(profile) : null;
}

export async function deleteSession(sessionId?: string) {
  if (!sessionId) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("sessions").delete().eq("id", sessionId);
}

export function createUserSessionToken(user: PublicUser, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const payload = Buffer.from(
    JSON.stringify({
      user,
      expiresAt: new Date(Date.now() + maxAgeSeconds * 1000).toISOString(),
    }),
    "utf-8",
  ).toString("base64url");
  const signature = signSessionPayload(payload);
  return `v1.${payload}.${signature}`;
}

export function getUserBySessionToken(token?: string) {
  if (!token) return null;

  const [version, payload, signature] = token.split(".");
  if (version !== "v1" || !payload || !signature) return null;
  if (!safeCompare(signature, signSessionPayload(payload))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as {
      user?: unknown;
      expiresAt?: unknown;
    };
    if (typeof parsed.expiresAt !== "string" || new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return isPublicUser(parsed.user) ? parsed.user : null;
  } catch {
    return null;
  }
}

export async function createOrder(input: CreateOrderInput) {
  console.info("[Rifa Pix] createOrder recebido", {
    raffleId: input.raffleId,
    buyerName: sanitizeText(input.buyerName, 120),
    buyerWhatsapp: normalizePhone(input.buyerWhatsapp),
    numbers: input.numbers,
  });

  const raffle = await findRaffleByPublicId(input.raffleId);
  if (!raffle || raffle.status !== "ativa") throw new Error("Rifa indisponível.");

  const selectedNumbers = normalizeNumbers(input.numbers, raffle.totalNumbers);
  const buyerName = sanitizeText(input.buyerName, 120);
  const buyerWhatsapp = normalizePhone(input.buyerWhatsapp);
  const buyerCpf = normalizeCpf(input.buyerCpf);
  if (buyerName.trim().split(/\s+/).filter(Boolean).length < 2) throw new Error("Informe o nome completo.");
  if (buyerWhatsapp.length < 10) throw new Error("Informe um WhatsApp válido.");

  const [paidNumbers, reservedNumbers] = await Promise.all([
    paidNumbersForRaffle(raffle.id),
    pendingReservationsForRaffle(raffle.id),
  ]);
  const blockedNumbers = new Set([...paidNumbers, ...reservedNumbers]);
  const blocked = selectedNumbers.find((number) => blockedNumbers.has(number));
  if (blocked !== undefined) {
    throw new Error(`Número ${String(blocked).padStart(2, "0")} indisponível. Escolha outro número.`);
  }

  const orderId = `order-${randomBytes(8).toString("hex")}`;
  const reservedUntil = raffle.reservationMode === "auto_24h"
    ? new Date(Date.now() + reservationHoldMs).toISOString()
    : null;
  const totalAmount = selectedNumbers.length * raffle.pricePerNumber;
  const pixCopyPaste = makePixCopyPaste(raffle, orderId, totalAmount);
  const supabase = requireSupabaseAdmin();
  const { data: reservationData, error: reservationError } = await supabase
    .rpc("create_raffle_number_reservation", {
      p_id: orderId,
      p_raffle_id: raffle.id,
      p_user_name: buyerName,
      p_whatsapp: buyerWhatsapp,
      p_numbers: selectedNumbers,
      p_total: totalAmount,
      p_payment_proof: null,
    })
    .single();

  console.info("[Rifa Pix] resposta Supabase create_raffle_number_reservation", {
    orderId,
    error: reservationError,
    data: reservationData,
  });

  if (!reservationError) {
    console.info("[Rifa Pix] reserva criada via tabela de reservas", { orderId, reservedUntil, reservationMode: raffle.reservationMode });
    return { order: { ...reservationToOrder(reservationData), buyerCpf, pixCopyPaste }, raffle };
  }

  if (reservationError) {
    logSupabaseError("reservations insert rpc", reservationError);
    const canUseOrdersFallback =
      isSupabaseMissingTableError(reservationError) ||
      isLegacyZeroBasedReservationValidationError(reservationError, selectedNumbers);
    if (!canUseOrdersFallback) {
      console.error("[Rifa Pix] reserva falhou", reservationError);
      throw new Error(reservationErrorMessage(reservationError));
    }
  }

  const orderInsertLegacy = {
    id: orderId,
    raffle_id: raffle.id,
    buyer_name: buyerName,
    buyer_whatsapp: buyerWhatsapp,
    buyer_cpf: buyerCpf,
    selected_numbers: selectedNumbers,
    total_amount: totalAmount,
    status: "pending",
    pix_copy_paste: pixCopyPaste,
  };
  const orderInsertWithReservedUntil = {
    ...orderInsertLegacy,
    reserved_until: reservedUntil,
  };
  const orderFallback = await supabase.from("orders").insert(orderInsertWithReservedUntil).select("*").single();
  const missingReservedUntilColumn =
    orderFallback.error &&
    isMissingSchemaColumn(orderFallback.error, "reserved_until");
  const orderResult = missingReservedUntilColumn
    ? await supabase.from("orders").insert(orderInsertLegacy).select("*").single()
    : orderFallback;

  console.info("[Rifa Pix] resposta Supabase orders fallback", {
    orderId,
    error: orderResult.error,
    data: orderResult.data,
    usedLegacyOrdersTable: missingReservedUntilColumn,
  });

  if (orderResult.error) {
    logSupabaseError("orders reservation fallback insert", orderResult.error);
    console.error("[Rifa Pix] reserva falhou", orderResult.error);
    throw new Error(publicSupabaseErrorMessage(orderResult.error, "Não foi possível gerar o Pix. Tente novamente."));
  }

  console.info("[Rifa Pix] reserva criada via orders pending", { orderId, reservedUntil, reservationMode: raffle.reservationMode });
  return { order: { ...mapOrder(orderResult.data), reservedUntil, reservationMode: raffle.reservationMode, pixCopyPaste }, raffle };
}

export async function createTicket(userId: string, raffleId: string, numbers: number[]) {
  const { data: profile, error } = await requireSupabaseAdmin().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throwSupabaseError("profiles select participant", error, "Erro ao consultar participante.");
  if (!profile) throw new Error("Participante não encontrado.");
  const result = await createOrder({ raffleId, buyerName: profile.name, buyerWhatsapp: profile.phone, buyerCpf: profile.cpf, numbers });
  return { order: result.order, raffle: result.raffle };
}

async function findReservationById(id: string) {
  await expireReservations();
  const { data, error } = await requireSupabaseAdmin().from("raffle_number_reservations").select("*").eq("id", id).maybeSingle();
  if (error && isSupabaseMissingTableError(error)) return null;
  if (error) throwSupabaseError("reservations select by id", error, "Erro ao consultar reserva.");
  return data ? mapReservation(data) : null;
}

async function confirmReservationOrder(orderId: string) {
  const supabase = requireSupabaseAdmin();
  const { data: confirmedRow, error } = await supabase.rpc("confirm_raffle_number_reservation", { p_id: orderId }).single();
  if (error) {
    logSupabaseError("reservations confirm rpc", error);
    throw new Error(reservationErrorMessage(error, "Não foi possível confirmar a reserva."));
  }

  const reservation = mapReservation(confirmedRow);
  const raffle = await findRaffleByPublicId(reservation.raffleId);
  if (!raffle) throw new Error("Rifa não encontrada.");

  const now = reservation.confirmedAt ?? new Date().toISOString();
  const ticketId = `ticket-${randomBytes(8).toString("hex")}`;
  const code = `DMF-${now.slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const pixCopyPaste = makePixCopyPaste(raffle, reservation.id, reservation.total);

  const { data: paidOrder, error: orderError } = await supabase
    .from("orders")
    .upsert({
      id: reservation.id,
      raffle_id: reservation.raffleId,
      buyer_name: reservation.userName,
      buyer_whatsapp: reservation.whatsapp,
      buyer_cpf: "",
      selected_numbers: reservation.numbers,
      total_amount: reservation.total,
      status: "paid",
      paid_at: now,
      ticket_id: null,
      pix_copy_paste: pixCopyPaste,
      validation_code: code,
    })
    .select("*")
    .single();
  if (orderError) throwSupabaseError("orders upsert reservation paid", orderError);

  const { data: existingTicket, error: existingTicketError } = await supabase.from("tickets").select("*").eq("order_id", reservation.id).maybeSingle();
  if (existingTicketError) throwSupabaseError("tickets select by reservation", existingTicketError, "Erro ao consultar bilhete.");
  if (existingTicket) {
    await syncSoldNumbers(raffle.id);
    return {
      order: mapOrder({ ...paidOrder, ticket_id: existingTicket.id }),
      ticket: {
        id: existingTicket.id,
        code: existingTicket.code,
        userId: existingTicket.user_id,
        raffleId: existingTicket.raffle_id,
        participant: existingTicket.participant,
        numbers: existingTicket.numbers,
        paid: existingTicket.paid,
        createdAt: existingTicket.created_at,
        paidAt: existingTicket.paid_at,
        orderId: existingTicket.order_id,
      } as Ticket,
      raffle: raffle.title,
    };
  }

  const participantProfile = await findProfileByIdentifier(reservation.whatsapp);
  const ticketInsert = {
    id: ticketId,
    code,
    user_id: participantProfile?.id ?? null,
    raffle_id: raffle.id,
    participant: { name: reservation.userName, email: "", phone: reservation.whatsapp, cpf: "" },
    numbers: reservation.numbers,
    paid: true,
    paid_at: now,
    order_id: reservation.id,
    status: "paid",
  };
  const { data: ticketData, error: ticketError } = await supabase.from("tickets").insert(ticketInsert).select("*").single();
  if (ticketError) throwSupabaseError("tickets insert reservation", ticketError);
  const { data: updatedOrder, error: paidError } = await supabase
    .from("orders")
    .update({ status: "paid", paid_at: now, ticket_id: ticketId, validation_code: code })
    .eq("id", reservation.id)
    .select("*")
    .single();
  if (paidError) throwSupabaseError("orders paid reservation update", paidError);
  await syncSoldNumbers(raffle.id);

  const ticket: Ticket = {
    id: ticketData.id,
    code: ticketData.code,
    userId: ticketData.user_id,
    raffleId: ticketData.raffle_id,
    participant: ticketData.participant,
    numbers: ticketData.numbers,
    paid: ticketData.paid,
    createdAt: ticketData.created_at,
    paidAt: ticketData.paid_at,
    orderId: ticketData.order_id,
  };
  return { order: mapOrder(updatedOrder), ticket, raffle: raffle.title };
}

export async function confirmOrder(orderId: string) {
  const reservation = await findReservationById(orderId);
  if (reservation) return confirmReservationOrder(orderId);

  const supabase = requireSupabaseAdmin();
  const { data: orderRow, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throwSupabaseError("orders select confirm", error, "Erro ao consultar pedido.");
  if (!orderRow) throw new Error("Pedido não encontrado.");
  const order = mapOrder(orderRow);
  if (order.status !== "pending") throw new Error("Este pedido não está pendente.");
  const raffle = await findRaffleByPublicId(order.raffleId);
  if (!raffle) throw new Error("Rifa não encontrada.");

  const paidNumbers = new Set(await paidNumbersForRaffle(raffle.id));
  const blocked = order.selectedNumbers.find((number) => paidNumbers.has(number));
  if (blocked !== undefined) throw new Error(`Número ${String(blocked).padStart(2, "0")} já está pago.`);

  const now = new Date().toISOString();
  const ticketId = `ticket-${randomBytes(8).toString("hex")}`;
  const code = orderRow.validation_code ?? `DMF-${now.slice(0, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const participantProfile = await findProfileByIdentifier(order.buyerWhatsapp);
  const ticketInsert = {
    id: ticketId,
    code,
    user_id: participantProfile?.id ?? null,
    raffle_id: raffle.id,
    participant: { name: order.buyerName, email: "", phone: order.buyerWhatsapp, cpf: order.buyerCpf },
    numbers: order.selectedNumbers,
    paid: true,
    paid_at: now,
    order_id: order.id,
    status: "paid",
  };
  const { data: ticketData, error: ticketError } = await supabase.from("tickets").insert(ticketInsert).select("*").single();
  if (ticketError) throwSupabaseError("tickets insert", ticketError);
  const { data: paidOrder, error: paidError } = await supabase
    .from("orders")
    .update({ status: "paid", paid_at: now, ticket_id: ticketId })
    .eq("id", order.id)
    .select("*")
    .single();
  if (paidError) throwSupabaseError("orders paid update", paidError);
  await syncSoldNumbers(raffle.id);

  const ticket: Ticket = {
    id: ticketData.id,
    code: ticketData.code,
    userId: ticketData.user_id,
    raffleId: ticketData.raffle_id,
    participant: ticketData.participant,
    numbers: ticketData.numbers,
    paid: ticketData.paid,
    createdAt: ticketData.created_at,
    paidAt: ticketData.paid_at,
    orderId: ticketData.order_id,
  };
  return { order: mapOrder(paidOrder), ticket, raffle: raffle.title };
}

export async function cancelOrder(orderId: string) {
  const reservation = await findReservationById(orderId);
  if (reservation) {
    const { data, error } = await requireSupabaseAdmin().rpc("cancel_raffle_number_reservation", { p_id: orderId }).single();
    if (error) {
      logSupabaseError("reservations cancel rpc", error);
      throw new Error(reservationErrorMessage(error, "Não foi possível cancelar a reserva."));
    }
    return reservationToOrder(data);
  }

  const { data, error } = await requireSupabaseAdmin().from("orders").update({ status: "canceled" }).eq("id", orderId).neq("status", "paid").select("*").single();
  if (error) {
    logSupabaseError("orders cancel update", error);
    throw new Error(publicSupabaseErrorMessage(error, "Pedido não encontrado ou já pago."));
  }
  return mapOrder(data);
}

export async function adminDashboard() {
  const supabase = requireSupabaseAdmin();
  await expireReservations();
  const [users, raffles, products, winners, orders, reservations, tickets] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("raffles").select("*"),
    supabase.from("products").select("*"),
    supabase.from("winners").select("*"),
    supabase.from("orders").select("*,raffles(title,description,reservation_mode)").order("created_at", { ascending: false }),
    supabase.from("raffle_number_reservations").select("*,raffles(title,description,reservation_mode)").order("created_at", { ascending: false }),
    supabase.from("tickets").select("*,raffles(title)").order("created_at", { ascending: false }),
  ]);
  const safeOrders = orders.error && isMissingSchemaColumn(orders.error, "reservation_mode")
    ? await supabase.from("orders").select("*,raffles(title,description)").order("created_at", { ascending: false })
    : orders;
  const safeReservations = reservations.error && isSupabaseMissingTableError(reservations.error)
    ? { ...reservations, data: [], error: null }
    : reservations;
  for (const result of [users, raffles, products, winners, safeOrders, safeReservations, tickets]) {
    if (result.error) throwSupabaseError("admin dashboard select", result.error, "Erro ao carregar painel admin.");
  }

  const mappedReservations = (safeReservations.data ?? []).map((reservation) => reservationToOrder(reservation, reservation.raffles?.title ?? "Rifa"));
  const reservationIds = new Set(mappedReservations.map((reservation) => reservation.id));
  const mappedOrders = [
    ...mappedReservations,
    ...(safeOrders.data ?? [])
      .filter((order) => !reservationIds.has(order.id))
      .map((order) => ({ ...mapOrder(order), raffle: order.raffles?.title ?? "Rifa" })),
  ];
  const mappedTickets = (tickets.data ?? []).map((ticket) => ({
    id: ticket.id,
    code: ticket.code,
    raffleId: ticket.raffle_id,
    numbers: ticket.numbers ?? [],
    paid: ticket.paid,
    createdAt: ticket.created_at,
    paidAt: ticket.paid_at,
    orderId: ticket.order_id,
    participant: ticket.participant?.name ?? "Cliente",
    participantEmail: ticket.participant?.email ?? "",
    participantPhone: ticket.participant?.phone ?? "",
    participantCpf: ticket.participant?.cpf ?? "",
    raffle: ticket.raffles?.title ?? "Rifa",
  }));
  const revenue = mappedOrders.filter((order) => order.status === "paid").reduce((sum, order) => sum + order.totalAmount, 0);
  const paidNumbers = mappedTickets.filter((ticket) => ticket.paid).reduce((sum, ticket) => sum + ticket.numbers.length, 0);
  const reservedNumbers = mappedReservations
    .filter((reservation) => reservation.status === "reserved")
    .reduce((sum, reservation) => sum + reservation.selectedNumbers.length, 0);
  const totalNumbers = (raffles.data ?? []).reduce((sum, raffle) => sum + Number(raffle.total_numbers ?? 0), 0);

  return {
    users: (users.data ?? []).map(publicUser),
    raffles: (raffles.data ?? []).map(mapRaffle),
    products: (products.data ?? []).map(mapProduct),
    winners: (winners.data ?? []).map(mapWinner),
    orders: mappedOrders,
    reservations: mappedReservations,
    tickets: mappedTickets,
    stats: {
      revenue,
      activeRaffles: (raffles.data ?? []).filter((raffle) => raffle.status === "ativa").length,
      users: users.data?.length ?? 0,
      tickets: mappedTickets.length,
      pendingOrders: mappedOrders.filter((order) => order.status === "pending" || order.status === "reserved").length,
      paidNumbers,
      reservedNumbers,
      freeNumbers: Math.max(0, totalNumbers - paidNumbers - reservedNumbers),
    },
  };
}

export async function createRaffle(input: CreateRaffleInput) {
  const sourceImages = (Array.isArray(input.images) && input.images.length ? input.images : [input.image]).filter(Boolean);
  const images = await uploadMany(sourceImages, "raffles");
  const reservationMode = normalizeReservationMode(input.reservationMode);
  const raffle = {
    id: `r${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
    title: sanitizeText(input.title, 140),
    description: sanitizeText(input.description, 600),
    price_per_ticket: Number(input.pricePerNumber),
    total_numbers: Number(input.totalNumbers),
    sold_numbers: 0,
    status: input.status ?? "ativa",
    draw_date: input.drawDate,
    image_url: images[0] || input.image || "gold",
    image_urls: images.length ? images : [input.image].filter(Boolean),
    pix_key: sanitizeText(input.pixKey || defaultPixKey, 140),
    admin_whatsapp: normalizePhone(input.adminWhatsapp || defaultAdminWhatsapp),
    reservation_mode: reservationMode,
  };
  const supabase = requireSupabaseAdmin();
  const result = await supabase.from("raffles").insert(raffle).select("*").single();
  if (!result.error) return mapRaffle(result.data);

  if (isMissingSchemaColumn(result.error, "reservation_mode")) {
    logSupabaseError("raffles insert reservation_mode missing", result.error);
    const { reservation_mode: _reservationMode, ...legacyRaffleBase } = raffle;
    const legacyRaffle = {
      ...legacyRaffleBase,
      description: descriptionWithReservationMode(legacyRaffleBase.description, reservationMode),
    };
    const legacyResult = await supabase.from("raffles").insert(legacyRaffle).select("*").single();
    if (legacyResult.error) throwSupabaseError("raffles insert legacy schema", legacyResult.error);
    return mapRaffle({ ...legacyResult.data, reservation_mode: reservationMode });
  }

  throwSupabaseError("raffles insert", result.error);
}

export async function updateRaffle(input: UpdateRaffleInput) {
  const sourceImages = (Array.isArray(input.images) && input.images.length ? input.images : [input.image]).filter(Boolean);
  const images = await uploadMany(sourceImages, "raffles");
  const reservationMode = normalizeReservationMode(input.reservationMode);
  const raffle = {
    title: sanitizeText(input.title, 140),
    description: sanitizeText(input.description, 600),
    price_per_ticket: Number(input.pricePerNumber),
    total_numbers: Number(input.totalNumbers),
    status: input.status ?? "ativa",
    draw_date: input.drawDate,
    image_url: images[0] || input.image || "gold",
    image_urls: images.length ? images : [input.image].filter(Boolean),
    pix_key: sanitizeText(input.pixKey || defaultPixKey, 140),
    admin_whatsapp: normalizePhone(input.adminWhatsapp || defaultAdminWhatsapp),
    reservation_mode: reservationMode,
  };
  const supabase = requireSupabaseAdmin();
  const result = await supabase
    .from("raffles")
    .update(raffle)
    .eq("id", sanitizeText(input.id, 80))
    .select("*")
    .single();
  if (!result.error) return mapRaffle(result.data);

  if (isMissingSchemaColumn(result.error, "reservation_mode")) {
    logSupabaseError("raffles update reservation_mode missing", result.error);
    const { reservation_mode: _reservationMode, ...legacyRaffleBase } = raffle;
    const legacyRaffle = {
      ...legacyRaffleBase,
      description: descriptionWithReservationMode(legacyRaffleBase.description, reservationMode),
    };
    const legacyResult = await supabase
      .from("raffles")
      .update(legacyRaffle)
      .eq("id", sanitizeText(input.id, 80))
      .select("*")
      .single();
    if (legacyResult.error) throwSupabaseError("raffles update legacy schema", legacyResult.error);
    return mapRaffle({ ...legacyResult.data, reservation_mode: reservationMode });
  }

  throwSupabaseError("raffles update", result.error);
}

export async function createProduct(input: CreateProductInput) {
  const imageUrl = await uploadDataUrlToStorage(input.image || "/assets/da-mafia/product-perfume-noir.svg", "products");
  const product = {
    id: `p${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
    name: sanitizeText(input.name, 140),
    category: normalizeProductCategory(input.category),
    price: Number(input.price),
    stock: Math.max(0, Math.floor(Number(input.stock))),
    description: sanitizeText(input.description, 600),
    image_url: imageUrl,
  };
  const { data, error } = await requireSupabaseAdmin().from("products").insert(product).select("*").single();
  if (error) throwSupabaseError("products insert", error);
  return mapProduct(data);
}

export async function createWinner(input: CreateWinnerInput) {
  const [imageUrl, videoUrl] = await Promise.all([
    uploadDataUrlToStorage(input.image, "winners"),
    input.video ? uploadDataUrlToStorage(input.video, "winners") : Promise.resolve(""),
  ]);
  const supabase = requireSupabaseAdmin();
  if (input.status === "destaque") {
    const { error: destaqueError } = await supabase.from("winners").update({ status: "confirmado" }).eq("status", "destaque");
    if (destaqueError) throwSupabaseError("winners destaque update", destaqueError);
  }
  const winner = {
    id: `w${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`,
    title: sanitizeText(input.title, 140),
    description: sanitizeText(input.description, 600),
    winner_name: sanitizeText(input.winnerName, 120),
    city: sanitizeText(input.city || "Salvador, BA", 120),
    date: sanitizeText(input.date, 20),
    image_url: imageUrl,
    video_url: videoUrl,
    status: input.status === "destaque" ? "destaque" : "confirmado",
  };
  const { data, error } = await supabase.from("winners").insert(winner).select("*").single();
  if (error) throwSupabaseError("winners insert", error);
  return mapWinner(data);
}

export async function deleteWinner(id: string) {
  const { error } = await requireSupabaseAdmin().from("winners").delete().eq("id", sanitizeText(id, 80));
  if (error) throwSupabaseError("winners delete", error);
  return { ok: true, id };
}

export async function deleteProduct(id: string) {
  const productId = sanitizeText(id, 80);
  const { error } = await requireSupabaseAdmin().from("products").delete().eq("id", productId);
  if (error) throwSupabaseError("products delete", error);
  return { ok: true, id: productId };
}

export async function updateRaffleStatus(id: string, status: RaffleStatus) {
  const { data, error } = await requireSupabaseAdmin().from("raffles").update({ status }).eq("id", id).select("*").single();
  if (error) throwSupabaseError("raffles status update", error);
  return mapRaffle(data);
}

export async function deleteRaffle(id: string) {
  const raffleId = sanitizeText(id, 80);
  const idsToDelete = new Set([raffleId]);
  if (raffleAliases[raffleId]) idsToDelete.add(raffleAliases[raffleId]);
  Object.entries(raffleAliases).forEach(([publicId, targetId]) => {
    if (targetId === raffleId) idsToDelete.add(publicId);
  });
  const supabase = requireSupabaseAdmin();
  for (const targetId of idsToDelete) {
    const { error: ticketsError } = await supabase.from("tickets").delete().eq("raffle_id", targetId);
    if (ticketsError) throwSupabaseError("tickets delete by raffle", ticketsError);
    const { error: reservationsError } = await supabase.from("raffle_number_reservations").delete().eq("raffle_id", targetId);
    if (reservationsError && !isSupabaseMissingTableError(reservationsError)) throwSupabaseError("reservations delete by raffle", reservationsError);
    const { error: ordersError } = await supabase.from("orders").delete().eq("raffle_id", targetId);
    if (ordersError) throwSupabaseError("orders delete by raffle", ordersError);
    const { error: raffleError } = await supabase.from("raffles").delete().eq("id", targetId);
    if (raffleError) throwSupabaseError("raffles delete", raffleError);
  }
  return { ok: true, id: raffleId };
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (status === "paid") return (await confirmOrder(id)).order;
  if (status === "canceled") return cancelOrder(id);
  throw new Error("Status de pedido inválido.");
}

