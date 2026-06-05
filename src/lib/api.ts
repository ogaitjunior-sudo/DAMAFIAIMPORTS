import { createServerFn } from "@tanstack/react-start";

import type { ProductCategory, PublicUser, RaffleStatus, ReservationMode } from "./types";

const sessionCookie = "da_mafia_session";
const authTokenCookie = "da_mafia_auth";
const authCookieMaxAge = 60 * 60 * 24 * 7;
const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: false,
  path: "/",
  maxAge: authCookieMaxAge,
} as const;

type BackendModule = typeof import("./supabase-backend.server");

async function loadBackend(): Promise<BackendModule> {
  const { isSupabaseServerConfigured } = await import("./supabase.server");
  if (isSupabaseServerConfigured()) return await import("./supabase-backend.server");
  return (await import("./backend.server")) as BackendModule;
}

async function authHelpers() {
  const cookies = await import("@tanstack/react-start/server");
  const backend = await loadBackend();
  const sessionId = cookies.getCookie(sessionCookie);
  const authToken = cookies.getCookie(authTokenCookie);
  const user = backend.getUserBySessionToken(authToken) ?? (await backend.getUserBySession(sessionId));

  return { ...cookies, backend, sessionId, authToken, user };
}

function makeAuthToken(backend: Pick<BackendModule, "createUserSessionToken">, user: PublicUser) {
  return backend.createUserSessionToken(user, authCookieMaxAge);
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} é obrigatório.`);
  }
  return value.trim();
}

function requiredNumber(value: unknown, field: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${field} precisa ser maior que zero.`);
  }
  return number;
}

function optionalString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function optionalReservationMode(value: unknown): ReservationMode {
  return value === "manual_admin" || value === "auto_24h" ? value : "auto_24h";
}

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const { backend } = await authHelpers();
  const [rafflesResult, productsResult] = await Promise.allSettled([backend.listRaffles(), backend.listProducts()]);
  const raffles = rafflesResult.status === "fulfilled" ? rafflesResult.value : [];
  const products = productsResult.status === "fulfilled" ? productsResult.value : [];

  if (rafflesResult.status === "rejected") console.error("Nao foi possivel carregar rifas da home.", rafflesResult.reason);
  if (productsResult.status === "rejected") console.error("Nao foi possivel carregar produtos da home.", productsResult.reason);

  return {
    activeRaffles: raffles.filter((raffle) => raffle.status === "ativa").slice(0, 3),
    featuredProducts: products.slice(0, 4),
  };
});

export const getRaffles = createServerFn({ method: "GET" }).handler(async () => {
  const { backend } = await authHelpers();
  return await backend.listRaffles();
});

export const getProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { backend } = await authHelpers();
  return await backend.listProducts();
});

export const getWinners = createServerFn({ method: "GET" }).handler(async () => {
  const { backend } = await authHelpers();
  return await backend.listWinners();
});

export const getRaffleById = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: requiredString(input.id, "ID da rifa") }))
  .handler(async ({ data }) => {
    const { backend } = await authHelpers();
    return await backend.getRaffle(data.id);
  });

export const getRaffleCheckout = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: requiredString(input.id, "ID da rifa") }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    const raffle = await backend.getRaffle(data.id);
    if (!raffle) {
      return { raffle: null, soldNumbers: [], soldNumberDetails: [], reservedNumbers: [], reservedNumberDetails: [], recentOrders: [], numberLoadError: false, user };
    }

    const [soldResult, reservedResult, recentOrdersResult] = await Promise.allSettled([
      backend.getRaffleSoldNumberDetails(data.id),
      backend.getRaffleReservedNumberDetails(data.id),
      backend.getRaffleRecentOrders(data.id),
    ]);
    const soldNumberDetails = soldResult.status === "fulfilled" ? soldResult.value : [];
    const reservedNumberDetails = reservedResult.status === "fulfilled" ? reservedResult.value : [];
    const recentOrders = recentOrdersResult.status === "fulfilled" ? recentOrdersResult.value : [];

    if (soldResult.status === "rejected") console.error("Nao foi possivel carregar detalhes dos numeros vendidos.", soldResult.reason);
    if (reservedResult.status === "rejected") console.error("Nao foi possivel carregar detalhes dos numeros reservados.", reservedResult.reason);
    if (recentOrdersResult.status === "rejected") console.error("Nao foi possivel carregar compradores recentes.", recentOrdersResult.reason);

    return {
      raffle,
      soldNumbers: soldNumberDetails.map((sale) => sale.number),
      soldNumberDetails,
      reservedNumbers: reservedNumberDetails.map((reservation) => reservation.number),
      reservedNumberDetails,
      recentOrders,
      numberLoadError: soldResult.status === "rejected" || reservedResult.status === "rejected",
      user,
    };
  });

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await authHelpers();
  return user;
});

export const getMyNumbers = createServerFn({ method: "POST" })
  .inputValidator((input: { whatsapp: string }) => ({
    whatsapp: requiredString(input.whatsapp, "WhatsApp"),
  }))
  .handler(async ({ data }) => {
    const { backend } = await authHelpers();
    return await backend.listMyNumbersByWhatsapp(data.whatsapp);
  });

export const login = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => ({
    email: requiredString(input.email, "WhatsApp").toLowerCase(),
    password: requiredString(input.password, "Senha"),
  }))
  .handler(async ({ data }) => {
    const { backend, deleteCookie, setCookie } = await authHelpers();
    const result = await backend.loginUser(data);

    deleteCookie(sessionCookie, { path: "/" });
    setCookie(authTokenCookie, makeAuthToken(backend, result.user), authCookieOptions);

    return result.user;
  });

export const register = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; email?: string; phone: string; cpf?: string; password: string; confirm?: string }) => {
    const password = requiredString(input.password, "Senha");
    if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    const confirm = optionalString(input.confirm);
    if (confirm && password !== confirm) throw new Error("As senhas nao conferem.");

    return {
      name: requiredString(input.name, "Nome"),
      email: optionalString(input.email).toLowerCase(),
      phone: requiredString(input.phone, "WhatsApp"),
      cpf: optionalString(input.cpf),
      password,
    };
  })
  .handler(async ({ data }) => {
    const { backend } = await authHelpers();
    return await backend.registerUser(data);
  });

export const registerAndLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; email?: string; phone: string; cpf?: string; password: string; confirm?: string }) => {
    const password = requiredString(input.password, "Senha");
    if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
    const confirm = optionalString(input.confirm);
    if (confirm && password !== confirm) throw new Error("As senhas nao conferem.");

    return {
      name: requiredString(input.name, "Nome"),
      email: optionalString(input.email).toLowerCase(),
      phone: requiredString(input.phone, "WhatsApp"),
      cpf: optionalString(input.cpf),
      password,
    };
  })
  .handler(async ({ data }) => {
    const { backend, deleteCookie, setCookie } = await authHelpers();
    const user = await backend.registerUser(data);

    deleteCookie(sessionCookie, { path: "/" });
    setCookie(authTokenCookie, makeAuthToken(backend, user), authCookieOptions);

    return user;
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { backend, deleteCookie, sessionId } = await authHelpers();
  await backend.deleteSession(sessionId);
  deleteCookie(sessionCookie, { path: "/" });
  deleteCookie(authTokenCookie, { path: "/" });
  return { ok: true };
});

export const validateRaffleTicket = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; identity?: string }) => ({
    code: requiredString(input.code, "Código da rifa"),
    identity: optionalString(input.identity),
  }))
  .handler(async ({ data }) => {
    const { backend } = await authHelpers();
    return await backend.validateTicket(data.code, data.identity);
  });

export const createRaffleOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { raffleId: string; buyerName: string; buyerWhatsapp: string; buyerCpf?: string; numbers: number[] }) => ({
    raffleId: requiredString(input.raffleId, "ID da rifa"),
    buyerName: requiredString(input.buyerName, "Nome"),
    buyerWhatsapp: requiredString(input.buyerWhatsapp, "WhatsApp"),
    buyerCpf: optionalString(input.buyerCpf),
    numbers: Array.isArray(input.numbers) ? input.numbers.map(Number).filter(Number.isFinite) : [],
  }))
  .handler(async ({ data }) => {
    if (!data.numbers.length) throw new Error("Selecione pelo menos um número.");
    const { backend } = await authHelpers();
    return await backend.createOrder(data);
  });

export const buyRaffleNumbers = createServerFn({ method: "POST" })
  .inputValidator((input: { raffleId: string; numbers: number[] }) => ({
    raffleId: requiredString(input.raffleId, "ID da rifa"),
    numbers: Array.isArray(input.numbers) ? input.numbers.map(Number).filter(Number.isFinite) : [],
  }))
  .handler(async ({ data }) => {
    if (!data.numbers.length) throw new Error("Selecione pelo menos um número.");
    const { backend, user } = await authHelpers();
    if (!user) throw new Error("Entre na sua conta para confirmar a participação.");
    return await backend.createTicket(user.id, data.raffleId, data.numbers);
  });

export const getAdminDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { backend, user } = await authHelpers();
  if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
  return await backend.adminDashboard();
});

export const createAdminRaffle = createServerFn({ method: "POST" })
  .inputValidator((input: {
    title: string;
    description: string;
    pricePerNumber: number;
    totalNumbers: number;
    drawDate: string;
    image: string;
    images?: string[];
    pixKey?: string;
    adminWhatsapp?: string;
    reservationMode?: ReservationMode;
    status?: RaffleStatus;
  }) => ({
    title: requiredString(input.title, "Título"),
    description: requiredString(input.description, "Descrição"),
    pricePerNumber: requiredNumber(input.pricePerNumber, "Valor por número"),
    totalNumbers: requiredNumber(input.totalNumbers, "Total de números"),
    drawDate: requiredString(input.drawDate, "Data do sorteio"),
    image: input.image || "gold",
    images: Array.isArray(input.images)
      ? input.images.map((image) => optionalString(image, "")).filter(Boolean).slice(0, 12)
      : [],
    pixKey: optionalString(input.pixKey, "71992929927"),
    adminWhatsapp: optionalString(input.adminWhatsapp, "5522997701093"),
    reservationMode: optionalReservationMode(input.reservationMode),
    status: input.status ?? "ativa",
  }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.createRaffle(data);
  });

export const updateAdminRaffle = createServerFn({ method: "POST" })
  .inputValidator((input: {
    id: string;
    title: string;
    description: string;
    pricePerNumber: number;
    totalNumbers: number;
    drawDate: string;
    image: string;
    images?: string[];
    pixKey?: string;
    adminWhatsapp?: string;
    reservationMode?: ReservationMode;
    status?: RaffleStatus;
  }) => ({
    id: requiredString(input.id, "ID da rifa"),
    title: requiredString(input.title, "Título"),
    description: requiredString(input.description, "Descrição"),
    pricePerNumber: requiredNumber(input.pricePerNumber, "Valor por número"),
    totalNumbers: requiredNumber(input.totalNumbers, "Total de números"),
    drawDate: requiredString(input.drawDate, "Data do sorteio"),
    image: input.image || "gold",
    images: Array.isArray(input.images)
      ? input.images.map((image) => optionalString(image, "")).filter(Boolean).slice(0, 12)
      : [],
    pixKey: optionalString(input.pixKey, "71992929927"),
    adminWhatsapp: optionalString(input.adminWhatsapp, "5522997701093"),
    reservationMode: optionalReservationMode(input.reservationMode),
    status: input.status ?? "ativa",
  }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.updateRaffle(data);
  });

export const updateAdminRaffleStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; status: RaffleStatus }) => ({
    id: requiredString(input.id, "ID da rifa"),
    status: input.status,
  }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.updateRaffleStatus(data.id, data.status);
  });

export const deleteAdminRaffle = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({
    id: requiredString(input.id, "ID da rifa"),
  }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.deleteRaffle(data.id);
  });

export const createAdminProduct = createServerFn({ method: "POST" })
  .inputValidator((input: {
    name: string;
    category: ProductCategory;
    price: number;
    stock: number;
    description: string;
    image: string;
  }) => ({
    name: requiredString(input.name, "Nome do produto"),
    category: input.category,
    price: requiredNumber(input.price, "Preco"),
    stock: Number.isFinite(Number(input.stock)) ? Math.max(0, Math.floor(Number(input.stock))) : 0,
    description: requiredString(input.description, "Descricao"),
    image: optionalString(input.image, "/assets/da-mafia/product-perfume-noir.svg"),
  }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.createProduct(data);
  });

export const deleteAdminProduct = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({
    id: requiredString(input.id, "ID do produto"),
  }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.deleteProduct(data.id);
  });

export const createAdminWinner = createServerFn({ method: "POST" })
  .inputValidator((input: {
    title: string;
    description: string;
    winnerName: string;
    city: string;
    date: string;
    image: string;
    video?: string;
    status?: "confirmado" | "destaque";
  }) => ({
    title: requiredString(input.title, "Titulo"),
    description: requiredString(input.description, "Descricao"),
    winnerName: requiredString(input.winnerName, "Nome do vencedor"),
    city: optionalString(input.city, ""),
    date: requiredString(input.date, "Data da entrega"),
    image: requiredString(input.image, "Foto do vencedor"),
    video: optionalString(input.video, ""),
    status: (input.status === "destaque" ? "destaque" : "confirmado") as "confirmado" | "destaque",
  }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.createWinner(data);
  });

export const deleteAdminWinner = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({
    id: requiredString(input.id, "ID do vencedor"),
  }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.deleteWinner(data.id);
  });

export const confirmAdminOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({ id: requiredString(input.id, "ID do pedido") }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.confirmOrder(data.id);
  });

export const cancelAdminOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({ id: requiredString(input.id, "ID do pedido") }))
  .handler(async ({ data }) => {
    const { backend, user } = await authHelpers();
    if (user?.role !== "admin") throw new Error("Acesso restrito ao admin.");
    return await backend.cancelOrder(data.id);
  });

