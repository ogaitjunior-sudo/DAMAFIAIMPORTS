export type RaffleStatus = "ativa" | "pausada" | "encerrada";
export type ReservationMode = "auto_24h" | "manual_admin";
export type ReservationStatus = "available" | "selected" | "reserved" | "confirmed" | "cancelled" | "expired";
export type OrderStatus = "pending" | "paid" | "canceled" | ReservationStatus;

export type Raffle = {
  id: string;
  title: string;
  description: string;
  pricePerNumber: number;
  totalNumbers: number;
  soldNumbers: number;
  status: RaffleStatus;
  drawDate: string;
  image: string;
  images?: string[];
  pixKey: string;
  adminWhatsapp: string;
  reservationMode: ReservationMode;
  createdAt: string;
};

export type ProductCategory =
  | "Perfumes"
  | "Jerseys"
  | "Acessorios"
  | "Sneakers"
  | "Relogios"
  | "Premium"
  | "Acessorios";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  description: string;
  image: string;
};

export type Winner = {
  id: string;
  title: string;
  description: string;
  winnerName: string;
  city: string;
  date: string;
  image: string;
  video?: string;
  status: "confirmado" | "destaque";
  createdAt: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  role: "customer" | "admin";
};

export type ParticipantSnapshot = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
};

export type RaffleOrder = {
  id: string;
  raffleId: string;
  buyerName: string;
  buyerWhatsapp: string;
  buyerCpf: string;
  selectedNumbers: number[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string | null;
  ticketId?: string | null;
  pixCopyPaste: string;
  reservedUntil?: string | null;
  reservationMode?: ReservationMode;
  confirmedAt?: string | null;
  paymentProof?: string | null;
  source?: "order" | "reservation";
};

export type RaffleNumberReservation = {
  id: string;
  raffleId: string;
  userName: string;
  whatsapp: string;
  numbers: number[];
  total: number;
  status: ReservationStatus;
  paymentProof?: string | null;
  reservedUntil: string | null;
  reservationMode?: ReservationMode;
  createdAt: string;
  confirmedAt?: string | null;
};

export type ReservedNumberInfo = {
  number: number;
  buyerName: string;
  reservedUntil: string | null;
  reservationMode: ReservationMode;
};

export type SoldNumberInfo = {
  number: number;
  buyerName: string;
  confirmedAt: string | null;
};

export type Ticket = {
  id: string;
  code: string;
  userId: string;
  raffleId: string;
  participant: ParticipantSnapshot;
  numbers: number[];
  paid: boolean;
  createdAt: string;
  paidAt?: string | null;
  orderId?: string | null;
};

