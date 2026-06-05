import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { renameSync } from "node:fs";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import type { OrderStatus, ParticipantSnapshot, Product, ProductCategory, PublicUser, Raffle, RaffleOrder, RaffleStatus, ReservationMode, SoldNumberInfo, Ticket, Winner } from "./types";

type StoredUser = PublicUser & {
  passwordHash: string;
};

type Db = {
  users: StoredUser[];
  sessions: Array<{ id: string; userId: string; expiresAt: string }>;
  raffles: Raffle[];
  deletedRaffleIds: string[];
  products: Product[];
  deletedProductIds: string[];
  winners: Winner[];
  tickets: Ticket[];
  orders: RaffleOrder[];
};

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

const dbPath = process.env.DA_MAFIA_DB_PATH || join(process.cwd(), "data", "app-db.json");
const dbBackupPath = `${dbPath}.bak`;
const dbTempPath = `${dbPath}.tmp`;
const defaultPixKey = "71992929927";
const defaultPixProvider = "Mercado Pago";
const defaultPixHolder = "DA MAFIA IMPORTS";
const defaultAdminWhatsapp = "5522997701093";
const defaultReservationMode: ReservationMode = "auto_24h";
const productCategories: ProductCategory[] = ["Perfumes", "Jerseys", "Acessorios", "Sneakers", "Relogios", "Premium", "Acessórios"];
const sessionTokenSecret = process.env.DA_MAFIA_SESSION_SECRET || "da-mafia-session-token-v1";
let memoryDb: Db | null = null;

const raffleAliases: Record<string, string> = {
  "r4-d7fabf": "r1",
};

function publicUser(user: StoredUser): PublicUser {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function participantFromUser(user: PublicUser): ParticipantSnapshot {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    cpf: user.cpf,
  };
}

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

function phoneMatches(left: unknown, right: unknown) {
  const leftPhone = normalizePhone(left);
  const rightPhone = normalizePhone(right);
  if (leftPhone.length < 8 || rightPhone.length < 8) return false;

  const compactLeft = compactBrazilPhone(leftPhone);
  const compactRight = compactBrazilPhone(rightPhone);

  return leftPhone === rightPhone || compactLeft === compactRight || compactLeft.endsWith(compactRight) || compactRight.endsWith(compactLeft);
}

function normalizeCpf(value: unknown) {
  return String(value ?? "").replace(/[^\d.-]/g, "").trim().slice(0, 18);
}

function customerEmailFromPhone(phone: string) {
  return `${phone}@cliente.damafia.local`;
}

function normalizeProductCategory(value: unknown): ProductCategory {
  const category = String(value ?? "");
  return productCategories.includes(category as ProductCategory) ? (category as ProductCategory) : "Perfumes";
}

function normalizeReservationMode(value: unknown): ReservationMode {
  return value === "manual_admin" || value === "auto_24h" ? value : defaultReservationMode;
}

function publicBuyerName(value: unknown) {
  const name = sanitizeText(value, 120);
  return name || "Cliente não identificado";
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", sessionTokenSecret).update(payload).digest("base64url");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
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

function raffleBase(raffle: Omit<Raffle, "pixKey" | "adminWhatsapp" | "createdAt"> & Partial<Raffle>): Raffle {
  const images = Array.isArray(raffle.images) && raffle.images.length ? raffle.images : [raffle.image].filter(Boolean);

  return {
    ...raffle,
    images,
    status: raffle.status === "sorteada" ? "encerrada" : (raffle.status ?? "ativa"),
    pixKey: raffle.pixKey || defaultPixKey,
    adminWhatsapp: raffle.adminWhatsapp || defaultAdminWhatsapp,
    reservationMode: normalizeReservationMode(raffle.reservationMode),
    createdAt: raffle.createdAt || new Date().toISOString(),
  } as Raffle;
}

function seedDb(): Db {
  const adminId = "user-admin";
  const customerId = "user-demo";
  const createdAt = new Date().toISOString();

  return {
    users: [
      {
        id: adminId,
        name: "Admin DA MAFIA",
        email: "admin@damafiaimports.com",
        phone: "(22) 99770-1093",
        cpf: "000.000.000-00",
        role: "admin",
        passwordHash: hashPassword("admin123"),
      },
      {
        id: customerId,
        name: "Joao da Silva",
        email: "joao@example.com",
        phone: "(11) 98888-0001",
        cpf: "111.222.333-44",
        role: "customer",
        passwordHash: hashPassword("cliente123"),
      },
    ],
    sessions: [],
    raffles: [],
    deletedRaffleIds: [],
    products: [],
    deletedProductIds: [],
    winners: [],
    tickets: [],
    orders: [],
  };
}

function cloneDb(db: Db): Db {
  return JSON.parse(JSON.stringify(db)) as Db;
}

function parseDbFile(path: string) {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as Partial<Db>;
  } catch (error) {
    console.error(`Nao foi possivel ler o banco local em ${path}.`, error);
    return null;
  }
}

function readDb(): Db {
  if (memoryDb) return memoryDb;

  const mainExists = existsSync(dbPath);
  const mainDb = mainExists ? parseDbFile(dbPath) : null;
  const backupDb = !mainDb && existsSync(dbBackupPath) ? parseDbFile(dbBackupPath) : null;

  if (!mainDb && !backupDb) {
    if (mainExists || existsSync(dbBackupPath)) {
      throw new Error("Nao foi possivel abrir o banco local sem risco de perder rifas. Verifique data/app-db.json.");
    }

    const initial = seedDb();
    writeDb(initial, { required: false });
    memoryDb = initial;
    return initial;
  }

  const normalized = normalizeDb((mainDb ?? backupDb) as Partial<Db>);
  if (normalized.changed || !mainDb) writeDb(normalized.db, { required: false });
  memoryDb = normalized.db;
  return normalized.db;
}

function writeDb(db: Db, options: { required?: boolean } = {}) {
  const required = options.required ?? true;
  const payload = `${JSON.stringify(db, null, 2)}\n`;

  try {
    mkdirSync(dirname(dbPath), { recursive: true });
    writeFileSync(dbTempPath, payload);
    try {
      renameSync(dbTempPath, dbPath);
    } catch {
      writeFileSync(dbPath, payload);
    }
    try {
      writeFileSync(dbBackupPath, payload);
    } catch (backupError) {
      console.warn("Nao foi possivel atualizar o backup do banco local.", backupError);
    }
    memoryDb = db;
  } catch (error) {
    console.error("Nao foi possivel persistir o banco de dados local.", error);
    if (required) {
      throw new Error("Nao foi possivel salvar no banco de dados. A alteracao nao foi gravada com seguranca.");
    }
    memoryDb = db;
  }
}

function visibleRaffles(db: Db) {
  const deletedIds = new Set(db.deletedRaffleIds ?? []);
  return db.raffles.filter((raffle) => !deletedIds.has(raffle.id));
}

function visibleProducts(db: Db) {
  const deletedIds = new Set(db.deletedProductIds ?? []);
  return db.products.filter((product) => !deletedIds.has(product.id));
}

function normalizeDb(raw: Partial<Db>): { db: Db; changed: boolean } {
  let changed = false;
  const seeded = seedDb();
  const db: Db = {
    users: raw.users ?? seeded.users,
    sessions: raw.sessions ?? [],
    raffles: Array.isArray(raw.raffles) ? raw.raffles : seeded.raffles,
    deletedRaffleIds: raw.deletedRaffleIds ?? [],
    products: Array.isArray(raw.products) ? raw.products : [],
    deletedProductIds: raw.deletedProductIds ?? [],
    winners: raw.winners ?? seeded.winners,
    tickets: Array.isArray(raw.tickets) ? raw.tickets : [],
    orders: Array.isArray(raw.orders) ? raw.orders : [],
  };

  if (!raw.orders) changed = true;
  if (!raw.winners) changed = true;
  if (!raw.deletedRaffleIds) changed = true;
  if (!raw.deletedProductIds) changed = true;

  const deletedRaffleIds = new Set(db.deletedRaffleIds);
  if (deletedRaffleIds.size > 0) {
    const rafflesCount = db.raffles.length;
    const ticketsCount = db.tickets.length;
    const ordersCount = db.orders.length;

    db.raffles = db.raffles.filter((raffle) => !deletedRaffleIds.has(raffle.id));
    db.tickets = db.tickets.filter((ticket) => !deletedRaffleIds.has(ticket.raffleId));
    db.orders = db.orders.filter((order) => !deletedRaffleIds.has(order.raffleId));

    if (db.raffles.length !== rafflesCount || db.tickets.length !== ticketsCount || db.orders.length !== ordersCount) {
      changed = true;
    }
  }

  const deletedProductIds = new Set(db.deletedProductIds);
  if (deletedProductIds.size > 0) {
    const productsCount = db.products.length;
    db.products = db.products.filter((product) => !deletedProductIds.has(product.id));
    if (db.products.length !== productsCount) {
      changed = true;
    }
  }

  db.raffles = db.raffles.map((raffle) => {
    const normalized = raffleBase(raffle);
    if (
      normalized.pixKey !== raffle.pixKey ||
      normalized.adminWhatsapp !== raffle.adminWhatsapp ||
      normalized.reservationMode !== raffle.reservationMode ||
      normalized.createdAt !== raffle.createdAt ||
      normalized.status !== raffle.status
    ) {
      changed = true;
    }
    return normalized;
  });

  db.tickets = db.tickets.map((ticket) => {
    let normalized = ticket;
    if (!ticket.participant) {
      const user = db.users.find((item) => item.id === ticket.userId);
      normalized = {
        ...normalized,
        participant: participantFromUser(
          user
            ? publicUser(user)
            : {
                id: ticket.userId,
                name: "Participante",
                email: "",
                phone: "",
                cpf: "",
                role: "customer",
              },
        ),
      };
      changed = true;
    }
    if (ticket.paid && !ticket.paidAt) {
      normalized = { ...normalized, paidAt: ticket.createdAt };
      changed = true;
    }
    return normalized;
  });

  db.raffles.forEach((raffle) => {
    const paidCount = soldNumbersForRaffle(db, raffle).length;
    if (raffle.soldNumbers !== paidCount) {
      raffle.soldNumbers = paidCount;
      changed = true;
    }
  });

  return { db, changed };
}

function cleanupSessions(db: Db) {
  const now = Date.now();
  db.sessions = db.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
}

function paidTicketsForRaffle(db: Db, raffleId: string) {
  return db.tickets.filter((ticket) => ticket.raffleId === raffleId && ticket.paid);
}

function soldNumbersForRaffle(db: Db, raffle: Raffle) {
  return soldNumberDetailsForRaffle(db, raffle).map((sale) => sale.number);
}

function soldNumberDetailsForRaffle(db: Db, raffle: Raffle): SoldNumberInfo[] {
  const details: SoldNumberInfo[] = [
    ...db.orders
      .filter((order) => order.raffleId === raffle.id && order.status === "paid")
      .flatMap((order) => order.selectedNumbers.map((number) => ({
        number,
        buyerName: publicBuyerName(order.buyerName),
        confirmedAt: order.paidAt ?? order.createdAt,
      }))),
    ...paidTicketsForRaffle(db, raffle.id)
      .flatMap((ticket) => ticket.numbers.map((number) => ({
        number,
        buyerName: publicBuyerName(ticket.participant?.name),
        confirmedAt: ticket.paidAt ?? ticket.createdAt,
      }))),
  ];
  const seen = new Set<number>();
  return details.filter((sale) => {
    if (seen.has(sale.number)) return false;
    seen.add(sale.number);
    return true;
  }).sort((a, b) => a.number - b.number);
}

function activeReservedOrdersForRaffle(db: Db, raffle: Raffle) {
  const now = Date.now();
  return db.orders.filter((order) => {
    if (order.raffleId !== raffle.id) return false;
    if (order.status !== "pending" && order.status !== "reserved") return false;
    if (!order.reservedUntil) return true;
    return new Date(order.reservedUntil).getTime() > now;
  });
}

function reservedNumbersForRaffle(db: Db, raffle: Raffle) {
  const reserved = new Set(activeReservedOrdersForRaffle(db, raffle).flatMap((order) => order.selectedNumbers));
  return [...reserved].sort((a, b) => a - b);
}

function syncRaffleSoldNumbers(db: Db, raffleId: string) {
  const raffle = findRaffleByPublicId(db, raffleId);
  if (raffle) raffle.soldNumbers = soldNumbersForRaffle(db, raffle).length;
}

function findRaffleByPublicId(db: Db, id: string) {
  const raffles = visibleRaffles(db);
  const exact = raffles.find((raffle) => raffle.id === id);
  if (exact) return exact;

  const alias = raffleAliases[id];
  if (alias) {
    const aliased = raffles.find((raffle) => raffle.id === alias);
    if (aliased) return aliased;
  }

  return null;
}

function createValidationCode(db: Db) {
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  let code = "";

  do {
    const token = randomBytes(4).toString("hex").toUpperCase();
    code = `DMF-${today}-${token}`;
  } while (db.tickets.some((ticket) => ticket.code === code));

  return code;
}

function normalizeNumbers(numbers: number[], totalNumbers: number) {
  const uniqueNumbers = [...new Set(numbers.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!uniqueNumbers.length) throw new Error("Selecione pelo menos um numero.");
  const invalid = uniqueNumbers.find((number) => !Number.isInteger(number) || number < 0 || number >= totalNumbers);
  if (invalid !== undefined) throw new Error(`Numero ${String(invalid).padStart(2, "0")} invalido.`);
  return uniqueNumbers;
}

function makePixCopyPaste(raffle: Raffle, orderId: string, amount: number) {
  return [
    "PIX DA MAFIA IMPORTS",
    `Instituicao: ${defaultPixProvider}`,
    `Titular: ${defaultPixHolder}`,
    `Chave: ${raffle.pixKey}`,
    `Valor: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    `Rifa: ${raffle.title}`,
    `Pedido: ${orderId}`,
  ].join(" | ");
}

function ensureOrderCanBecomePaid(db: Db, order: RaffleOrder) {
  const raffle = findRaffleByPublicId(db, order.raffleId);
  if (!raffle) throw new Error("Rifa nao encontrada.");

  const paidNumbers = new Set(soldNumbersForRaffle(db, raffle));
  const blocked = order.selectedNumbers.find((number) => paidNumbers.has(number));
  if (blocked) throw new Error(`Numero ${blocked} ja esta pago. Cancele o pedido e peca nova selecao.`);
  return raffle;
}

export function listRaffles() {
  return visibleRaffles(readDb());
}

export function listProducts() {
  return visibleProducts(readDb());
}

export function listWinners() {
  return [...readDb().winners].sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
}

export function getRaffle(id: string) {
  const db = readDb();
  return findRaffleByPublicId(db, id);
}

export function getRaffleSoldNumbers(id: string) {
  const db = readDb();
  const raffle = findRaffleByPublicId(db, id);
  return raffle ? soldNumbersForRaffle(db, raffle) : [];
}

export function getRaffleSoldNumberDetails(id: string) {
  const db = readDb();
  const raffle = findRaffleByPublicId(db, id);
  return raffle ? soldNumberDetailsForRaffle(db, raffle) : [];
}

export function getRaffleReservedNumbers(id: string) {
  const db = readDb();
  const raffle = findRaffleByPublicId(db, id);
  return raffle ? reservedNumbersForRaffle(db, raffle) : [];
}

export function getRaffleReservedNumberDetails(id: string) {
  const db = readDb();
  const raffle = findRaffleByPublicId(db, id);
  if (!raffle) return [];
  return activeReservedOrdersForRaffle(db, raffle).flatMap((order) =>
    order.selectedNumbers.map((number) => ({
      number,
      buyerName: publicBuyerName(order.buyerName),
      reservedUntil: order.reservedUntil ?? null,
      reservationMode: order.reservationMode ?? raffle.reservationMode,
    })),
  );
}

export function getRaffleRecentOrders(id: string) {
  const db = readDb();
  const raffle = findRaffleByPublicId(db, id);
  if (!raffle) return [];

  return db.orders
    .filter((order) => order.raffleId === raffle.id && order.status === "paid")
    .slice(0, 4)
    .map((order) => ({
      id: order.id,
      buyerName: order.buyerName,
      selectedNumbers: order.selectedNumbers,
      totalAmount: order.totalAmount,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
    }));
}

export function listMyNumbersByWhatsapp(whatsapp: string) {
  const db = readDb();
  const phone = normalizePhone(whatsapp);
  if (phone.length < 10) throw new Error("Informe um WhatsApp valido.");

  const orders = db.orders
    .filter((order) => phoneMatches(order.buyerWhatsapp, phone))
    .map((order) => {
      const raffle = db.raffles.find((item) => item.id === order.raffleId);
      if (!raffle) return null;
      const ticket = order.ticketId
        ? db.tickets.find((item) => item.id === order.ticketId)
        : db.tickets.find((item) => item.orderId === order.id);

      return {
        id: order.id,
        raffleId: raffle.id,
        raffleTitle: raffle.title,
        raffleImage: raffle.image,
        raffleDrawDate: raffle.drawDate,
        adminWhatsapp: raffle.adminWhatsapp,
        buyerName: order.buyerName,
        buyerWhatsapp: order.buyerWhatsapp,
        numbers: order.selectedNumbers,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt ?? null,
        validationCode: ticket?.code ?? null,
        pixCopyPaste: order.pixCopyPaste,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const orderTicketIds = new Set(db.orders.map((order) => order.ticketId).filter((id): id is string => Boolean(id)));
  const tickets = db.tickets
    .filter((ticket) => phoneMatches(ticket.participant.phone, phone) && !orderTicketIds.has(ticket.id))
    .map((ticket) => {
      const raffle = db.raffles.find((item) => item.id === ticket.raffleId);
      if (!raffle) return null;

      return {
        id: ticket.id,
        raffleId: raffle.id,
        raffleTitle: raffle.title,
        raffleImage: raffle.image,
        raffleDrawDate: raffle.drawDate,
        adminWhatsapp: raffle.adminWhatsapp,
        buyerName: ticket.participant.name,
        buyerWhatsapp: ticket.participant.phone,
        numbers: ticket.numbers,
        totalAmount: ticket.numbers.length * raffle.pricePerNumber,
        status: ticket.paid ? "paid" : "pending",
        createdAt: ticket.createdAt,
        paidAt: ticket.paidAt ?? null,
        validationCode: ticket.code,
        pixCopyPaste: "",
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return [...orders, ...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function validateTicket(code: string, identity?: string) {
  const db = readDb();
  const normalizedCode = code.trim().toUpperCase();
  const normalizedIdentity = identity?.trim().toLowerCase();
  const ticket = db.tickets.find((item) => item.code.toUpperCase() === normalizedCode);
  if (!ticket) return null;

  const user = db.users.find((item) => item.id === ticket.userId);
  const raffle = db.raffles.find((item) => item.id === ticket.raffleId);
  if (!raffle) return null;

  const participant = ticket.participant ?? (user ? participantFromUser(publicUser(user)) : null);
  if (!participant) return null;

  if (
    normalizedIdentity &&
    ![participant.email.toLowerCase(), participant.phone.toLowerCase(), participant.cpf.toLowerCase()].includes(normalizedIdentity)
  ) {
    return null;
  }

  return {
    participant: participant.name,
    email: participant.email,
    phone: participant.phone,
    cpf: participant.cpf,
    raffle: raffle.title,
    numbers: ticket.numbers,
    paid: ticket.paid,
    status: ticket.paid ? "PAGO" : "PENDENTE",
    date: new Date(ticket.paidAt ?? ticket.createdAt).toLocaleDateString("pt-BR"),
    code: ticket.code,
  };
}

export function registerUser(input: RegisterInput) {
  const db = readDb();
  const phone = normalizePhone(input.phone);
  if (phone.length < 10) throw new Error("Informe um WhatsApp valido.");

  const email = sanitizeText(input.email ?? "", 160).toLowerCase() || customerEmailFromPhone(phone);
  if (db.users.some((user) => user.email.toLowerCase() === email || phoneMatches(user.phone, phone))) {
    throw new Error("Este WhatsApp ja esta cadastrado.");
  }

  const user: StoredUser = {
    id: `user-${randomBytes(8).toString("hex")}`,
    name: sanitizeText(input.name, 120),
    email,
    phone,
    cpf: normalizeCpf(input.cpf),
    role: "customer",
    passwordHash: hashPassword(input.password),
  };

  db.users.push(user);
  writeDb(db);
  return publicUser(user);
}

export function loginUser(input: LoginInput) {
  const db = readDb();
  const identifier = input.email.trim().toLowerCase();
  const phone = normalizePhone(identifier);
  const user = db.users.find((item) => item.email.toLowerCase() === identifier || (!!phone && phoneMatches(item.phone, phone)));
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error("WhatsApp ou senha invalidos.");
  }

  cleanupSessions(db);
  const session = {
    id: randomBytes(32).toString("hex"),
    userId: user.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
  db.sessions.push(session);
  writeDb(db);

  return { sessionId: session.id, user: publicUser(user) };
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

export function getUserBySession(sessionId?: string) {
  if (!sessionId) return null;
  const db = readDb();
  const before = db.sessions.length;
  cleanupSessions(db);
  const session = db.sessions.find((item) => item.id === sessionId);
  const user = session ? db.users.find((item) => item.id === session.userId) : undefined;
  if (before !== db.sessions.length) writeDb(db);
  return user ? publicUser(user) : null;
}

export function deleteSession(sessionId?: string) {
  if (!sessionId) return;
  const db = readDb();
  db.sessions = db.sessions.filter((session) => session.id !== sessionId);
  writeDb(db);
}

export function createOrder(input: CreateOrderInput) {
  const db = readDb();
  const raffle = db.raffles.find((item) => item.id === input.raffleId);
  if (!raffle || raffle.status !== "ativa") throw new Error("Rifa indisponivel.");

  const selectedNumbers = normalizeNumbers(input.numbers, raffle.totalNumbers);
  const paidNumbers = new Set(soldNumbersForRaffle(db, raffle));
  const reservedNumbers = new Set(reservedNumbersForRaffle(db, raffle));
  const blocked = selectedNumbers.find((number) => paidNumbers.has(number) || reservedNumbers.has(number));
  if (blocked) throw new Error(`Numero ${blocked} indisponivel.`);

  const buyerName = sanitizeText(input.buyerName, 120);
  const buyerWhatsapp = normalizePhone(input.buyerWhatsapp);
  const buyerCpf = normalizeCpf(input.buyerCpf);
  if (buyerName.length < 3) throw new Error("Informe o nome completo.");
  if (buyerWhatsapp.length < 10) throw new Error("Informe um WhatsApp valido.");

  const orderId = `order-${randomBytes(8).toString("hex")}`;
  const totalAmount = selectedNumbers.length * raffle.pricePerNumber;
  const reservedUntil = raffle.reservationMode === "auto_24h" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
  const order: RaffleOrder = {
    id: orderId,
    raffleId: raffle.id,
    buyerName,
    buyerWhatsapp,
    buyerCpf,
    selectedNumbers,
    totalAmount,
    status: "reserved",
    createdAt: new Date().toISOString(),
    paidAt: null,
    ticketId: null,
    pixCopyPaste: makePixCopyPaste(raffle, orderId, totalAmount),
    reservedUntil,
    reservationMode: raffle.reservationMode,
  };

  db.orders.unshift(order);
  writeDb(db);
  return { order, raffle };
}

export function createTicket(userId: string, raffleId: string, numbers: number[]) {
  const db = readDb();
  const raffle = db.raffles.find((item) => item.id === raffleId);
  if (!raffle || raffle.status !== "ativa") throw new Error("Rifa indisponivel.");
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new Error("Participante nao encontrado.");

  const result = createOrder({
    raffleId,
    buyerName: user.name,
    buyerWhatsapp: user.phone,
    buyerCpf: user.cpf,
    numbers,
  });

  return {
    order: result.order,
    raffle,
  };
}

export function confirmOrder(orderId: string) {
  const db = readDb();
  const order = db.orders.find((item) => item.id === orderId);
  if (!order) throw new Error("Pedido nao encontrado.");
  if (order.status !== "pending" && order.status !== "reserved") throw new Error("Este pedido nao esta pendente.");

  const raffle = ensureOrderCanBecomePaid(db, order);
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: `ticket-${randomBytes(8).toString("hex")}`,
    code: createValidationCode(db),
    userId: "guest",
    raffleId: raffle.id,
    participant: {
      name: order.buyerName,
      email: "",
      phone: order.buyerWhatsapp,
      cpf: order.buyerCpf,
    },
    numbers: order.selectedNumbers,
    paid: true,
    createdAt: order.createdAt,
    paidAt: now,
    orderId: order.id,
  };

  order.status = "paid";
  order.paidAt = now;
  order.ticketId = ticket.id;
  db.tickets.unshift(ticket);
  syncRaffleSoldNumbers(db, raffle.id);
  writeDb(db);

  return {
    order,
    ticket,
    raffle: raffle.title,
  };
}

export function cancelOrder(orderId: string) {
  const db = readDb();
  const order = db.orders.find((item) => item.id === orderId);
  if (!order) throw new Error("Pedido nao encontrado.");
  if (order.status === "paid") throw new Error("Pedido pago nao pode ser cancelado aqui.");
  order.status = "cancelled";
  writeDb(db);
  return order;
}

export function adminDashboard() {
  const db = readDb();
  const revenue = db.orders
    .filter((order) => order.status === "paid")
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const enrichedRaffles = db.raffles.map((raffle) => {
    const paidNumbers = soldNumbersForRaffle(db, raffle);
    return { ...raffle, soldNumbers: paidNumbers.length };
  });
  const reservedNumbers = db.raffles.reduce((sum, raffle) => sum + reservedNumbersForRaffle(db, raffle).length, 0);

  return {
    users: db.users.map(publicUser),
    raffles: enrichedRaffles,
    products: db.products,
    winners: db.winners,
    orders: db.orders.map((order) => ({
      ...order,
      raffle: db.raffles.find((raffle) => raffle.id === order.raffleId)?.title ?? "Rifa",
    })),
    reservations: [],
    tickets: db.tickets.map((ticket) => ({
      ...ticket,
      participant: ticket.participant?.name ?? db.users.find((user) => user.id === ticket.userId)?.name ?? "Cliente",
      participantEmail: ticket.participant?.email ?? "",
      participantPhone: ticket.participant?.phone ?? "",
      participantCpf: ticket.participant?.cpf ?? "",
      raffle: db.raffles.find((raffle) => raffle.id === ticket.raffleId)?.title ?? "Rifa",
    })),
    stats: {
      revenue,
      activeRaffles: db.raffles.filter((raffle) => raffle.status === "ativa").length,
      users: db.users.length,
      tickets: db.tickets.length,
      pendingOrders: db.orders.filter((order) => order.status === "pending" || order.status === "reserved").length,
      paidNumbers: db.tickets.filter((ticket) => ticket.paid).reduce((sum, ticket) => sum + ticket.numbers.length, 0),
      reservedNumbers,
      freeNumbers: db.raffles.reduce((sum, raffle) => sum + raffle.totalNumbers - soldNumbersForRaffle(db, raffle).length - reservedNumbersForRaffle(db, raffle).length, 0),
    },
  };
}

export function createRaffle(input: CreateRaffleInput) {
  const db = readDb();
  const images = (Array.isArray(input.images) ? input.images : [input.image])
    .map((image) => sanitizeText(image, 5_000_000))
    .filter(Boolean)
    .slice(0, 12);
  const raffle: Raffle = {
    id: `r${db.raffles.length + 1}-${randomBytes(3).toString("hex")}`,
    title: sanitizeText(input.title, 140),
    description: sanitizeText(input.description, 600),
    pricePerNumber: Number(input.pricePerNumber),
    totalNumbers: Number(input.totalNumbers),
    soldNumbers: 0,
    status: input.status ?? "ativa",
    drawDate: input.drawDate,
    image: images[0] || input.image || "gold",
    images,
    pixKey: sanitizeText(input.pixKey || defaultPixKey, 140),
    adminWhatsapp: normalizePhone(input.adminWhatsapp || defaultAdminWhatsapp),
    reservationMode: normalizeReservationMode(input.reservationMode),
    createdAt: new Date().toISOString(),
  };
  db.raffles.unshift(raffle);
  writeDb(db);
  return raffle;
}

export function createProduct(input: CreateProductInput) {
  const db = readDb();
  const product: Product = {
    id: `p${db.products.length + 1}-${randomBytes(3).toString("hex")}`,
    name: sanitizeText(input.name, 140),
    category: normalizeProductCategory(input.category),
    price: Number(input.price),
    stock: Math.max(0, Math.floor(Number(input.stock))),
    description: sanitizeText(input.description, 600),
    image: sanitizeText(input.image || "/assets/da-mafia/product-perfume-noir.svg", 5_000_000),
  };

  if (!product.name) throw new Error("Nome do produto e obrigatorio.");
  if (!Number.isFinite(product.price) || product.price <= 0) throw new Error("Preco do produto invalido.");
  if (!Number.isFinite(product.stock)) throw new Error("Estoque do produto invalido.");

  db.products.unshift(product);
  writeDb(db);
  return product;
}

export function createWinner(input: CreateWinnerInput) {
  const db = readDb();
  const winner: Winner = {
    id: `w${db.winners.length + 1}-${randomBytes(3).toString("hex")}`,
    title: sanitizeText(input.title, 140),
    description: sanitizeText(input.description, 600),
    winnerName: sanitizeText(input.winnerName, 120),
    city: sanitizeText(input.city, 120),
    date: sanitizeText(input.date, 20),
    image: sanitizeText(input.image, 5_000_000),
    video: input.video ? sanitizeText(input.video, 25_000_000) : "",
    status: input.status === "destaque" ? "destaque" : "confirmado",
    createdAt: new Date().toISOString(),
  };

  if (!winner.title) throw new Error("Titulo do vencedor e obrigatorio.");
  if (!winner.description) throw new Error("Descricao do vencedor e obrigatoria.");
  if (!winner.winnerName) throw new Error("Nome do vencedor e obrigatorio.");
  if (!winner.date) throw new Error("Data da entrega e obrigatoria.");

  if (winner.status === "destaque") {
    db.winners = db.winners.map((item) => ({ ...item, status: item.status === "destaque" ? "confirmado" : item.status }));
  }

  db.winners.unshift(winner);
  writeDb(db);
  return winner;
}

export function deleteWinner(id: string) {
  const db = readDb();
  const winner = db.winners.find((item) => item.id === id);
  if (!winner) throw new Error("Vencedor nao encontrado.");

  db.winners = db.winners.filter((item) => item.id !== id);
  writeDb(db);
  return { ok: true, id };
}

export function deleteProduct(id: string) {
  const db = readDb();
  const productId = sanitizeText(id, 80);
  if (!productId) throw new Error("Produto invalido.");

  db.deletedProductIds = Array.from(new Set([...(db.deletedProductIds ?? []), productId]));
  db.products = db.products.filter((item) => item.id !== productId);
  writeDb(db);
  return { ok: true, id: productId };
}

export function updateRaffleStatus(id: string, status: RaffleStatus) {
  const db = readDb();
  const raffle = db.raffles.find((item) => item.id === id);
  if (!raffle) throw new Error("Rifa nao encontrada.");
  raffle.status = status;
  writeDb(db);
  return raffle;
}

export function deleteRaffle(id: string) {
  const db = readDb();
  const raffleId = sanitizeText(id, 80);
  if (!raffleId) throw new Error("Rifa invalida.");

  const idsToDelete = new Set([raffleId]);
  const aliasTarget = raffleAliases[raffleId];
  if (aliasTarget) idsToDelete.add(aliasTarget);

  Object.entries(raffleAliases).forEach(([publicId, targetId]) => {
    if (targetId === raffleId) idsToDelete.add(publicId);
  });

  db.deletedRaffleIds = Array.from(new Set([...(db.deletedRaffleIds ?? []), ...idsToDelete]));
  db.raffles = db.raffles.filter((item) => !idsToDelete.has(item.id));
  db.orders = db.orders.filter((order) => !idsToDelete.has(order.raffleId));
  db.tickets = db.tickets.filter((ticket) => !idsToDelete.has(ticket.raffleId));
  writeDb(db);

  return { ok: true, id: raffleId };
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  if (status === "paid") return confirmOrder(id).order;
  if (status === "canceled") return cancelOrder(id);
  throw new Error("Status de pedido invalido.");
}

