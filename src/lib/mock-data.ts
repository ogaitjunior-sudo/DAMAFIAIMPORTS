export type Raffle = {
  id: string;
  title: string;
  description: string;
  pricePerNumber: number;
  totalNumbers: number;
  soldNumbers: number;
  status: "ativa" | "encerrada" | "sorteada";
  drawDate: string;
  image: string;
};

export type Product = {
  id: string;
  name: string;
  category: "Perfumes" | "Jerseys" | "Acessorios" | "Sneakers" | "Relogios" | "Premium";
  price: number;
  stock: number;
  description: string;
  image: string;
};

export const raffles: Raffle[] = [
  {
    id: "r1",
    title: "Rifa Noir Gold Selection",
    description: "Selecao premium com perfume, jersey e acessorios DA MAFIA IMPORTS.",
    pricePerNumber: 25,
    totalNumbers: 300,
    soldNumbers: 217,
    status: "ativa",
    drawDate: "2026-06-30",
    image: "/assets/da-mafia/hero-da-mafia-imports.png",
  },
  {
    id: "r2",
    title: "Kit Premium Imports",
    description: "Combo street luxury com itens selecionados e atendimento consultivo.",
    pricePerNumber: 15,
    totalNumbers: 500,
    soldNumbers: 384,
    status: "ativa",
    drawDate: "2026-06-15",
    image: "/assets/da-mafia/product-jersey-gold.svg",
  },
  {
    id: "r3",
    title: "Premium Collection",
    description: "Pecas de presenca para quem quer visual internacional.",
    pricePerNumber: 10,
    totalNumbers: 200,
    soldNumbers: 200,
    status: "sorteada",
    drawDate: "2026-04-20",
    image: "/assets/da-mafia/product-perfume-noir.svg",
  },
];

export const products: Product[] = [
  { id: "p1", name: "Perfume Noir Imperial", category: "Perfumes", price: 389, stock: 8, description: "Fragrancia intensa, sofisticada e noturna para presenca marcante.", image: "/assets/da-mafia/product-perfume-noir.svg" },
  { id: "p2", name: "Jersey Gold Edition", category: "Jerseys", price: 429, stock: 6, description: "Jersey premium com textura respiravel, corte street e detalhe dourado.", image: "/assets/da-mafia/product-jersey-gold.svg" },
  { id: "p3", name: "Corrente Capo Gold", category: "Acessorios", price: 249, stock: 12, description: "Corrente de visual metalico refinado com brilho discreto.", image: "/assets/da-mafia/product-chain.svg" },
  { id: "p4", name: "Sneaker Nero Line", category: "Sneakers", price: 689, stock: 4, description: "Sneaker de linhas limpas, contraste champagne e solado robusto.", image: "/assets/da-mafia/product-sneaker.svg" },
  { id: "p5", name: "Relogio Vendetta", category: "Relogios", price: 529, stock: 5, description: "Relogio com pulseira escura, caixa dourada e leitura limpa.", image: "/assets/da-mafia/product-watch.svg" },
  { id: "p6", name: "Bone Omerta Black", category: "Acessorios", price: 179, stock: 15, description: "Bone preto premium com aba estruturada e detalhe champagne.", image: "/assets/da-mafia/product-cap.svg" },
  { id: "p7", name: "Jersey Shadow Club", category: "Jerseys", price: 359, stock: 7, description: "Jersey escura com recortes modernos e visual de presenca.", image: "/assets/da-mafia/product-jersey-shadow.svg" },
  { id: "p8", name: "Perfume Rosso Premium", category: "Perfumes", price: 319, stock: 9, description: "Fragrancia amadeirada com toque quente em edicao promocional.", image: "/assets/da-mafia/product-perfume-rosso.svg" },
];

export function imageGradient(kind: string) {
  switch (kind) {
    case "wood": return "bg-gradient-wood";
    case "gold": return "bg-gradient-gold";
    default: return "bg-gradient-to-br from-secondary via-muted to-background";
  }
}
