import type { Product } from "./types";

export const curatedStoreProducts: Product[] = [
  {
    id: "perfume-oud-mystery-intense",
    name: "Oud Mystery Intense - 100ml",
    category: "Perfumes",
    price: 350,
    stock: 12,
    description:
      "Perfume amadeirado especiado unissex, famoso por sua alta fixacao e projecao marcante. Topo: acafrao, noz-moscada e lavanda. Coracao: agarwood (oud). Fundo: patchouli e almiscar.",
    image: "/assets/da-mafia/real-products/oud-mystery-intense.jpeg",
  },
  {
    id: "perfume-fakhar-gold",
    name: "Fakhar Gold - 100ml",
    category: "Perfumes",
    price: 350,
    stock: 10,
    description:
      "Abertura vibrante com toranja, pimenta-rosa e cardamomo. Corpo floral adocicado com tuberosa, artemisia e notas solares. Fundo duradouro com ambar, cashmeran, ladano e couro.",
    image: "/assets/da-mafia/real-products/fakhar-lattafa-gold.jpeg",
  },
  {
    id: "perfume-qaed-al-fursan",
    name: "Qaed Al Fursan - 100ml",
    category: "Perfumes",
    price: 350,
    stock: 8,
    description:
      "Topo com abacaxi e acafrao, abertura frutada, fresca e levemente picante. Coracao com balsamo de abeto e jasmim. Fundo com cedro, ambar e agarwood (oud).",
    image: "/assets/da-mafia/real-products/qaed-al-fursan.jpeg",
  },
  {
    id: "perfume-oud-for-glory",
    name: "Oud For Glory - 100ml",
    category: "Perfumes",
    price: 350,
    stock: 9,
    description:
      "Notas de topo: acafrao, noz-moscada e lavanda. Notas de coracao: agarwood (oud). Notas de fundo: agarwood (oud), patchouli e almiscar.",
    image: "/assets/da-mafia/real-products/badee-al-oud.jpeg",
  },
  {
    id: "watch-imperium-gold-x",
    name: "Imperium Gold X",
    category: "Relogios",
    price: 489.9,
    stock: 7,
    description:
      "Criado para quem gosta de presenca e exclusividade. Visor esportivo premium, acabamento dourado espelhado, pulseira em aco dourado e conforto no pulso.",
    image: "/assets/da-mafia/watches/imperium-gold-x.jpg",
  },
  {
    id: "watch-black-emperor-gold",
    name: "Black Emperor Gold",
    category: "Relogios",
    price: 529.9,
    stock: 5,
    description:
      "Mostrador preto profundo com detalhes dourados, visual executivo e esportivo, acabamento brilhante e personalidade forte.",
    image: "/assets/da-mafia/watches/black-emperor-gold.jpg",
  },
  {
    id: "watch-royal-cassino-edition",
    name: "Royal Cassino Edition",
    category: "Relogios",
    price: 649.9,
    stock: 4,
    description:
      "Inspirado nos cassinos de luxo e Las Vegas, com visor estilo roleta premium, pulseira dourada e visual raro colecionavel.",
    image: "/assets/da-mafia/watches/royal-cassino-edition.jpg",
  },
  {
    id: "watch-vegas-crown-gold",
    name: "Vegas Crown Gold",
    category: "Relogios",
    price: 699.9,
    stock: 3,
    description:
      "Luxo, ousadia e sofisticacao em um acessorio de destaque. Painel roleta, pulseira dourada premium e presenca para eventos.",
    image: "/assets/da-mafia/watches/vegas-crown-gold.jpg",
  },
  {
    id: "watch-golden-machine-skeleton",
    name: "Golden Machine Skeleton",
    category: "Relogios",
    price: 799.9,
    stock: 2,
    description:
      "Visual mecanico impressionante com detalhes internos aparentes, inspirado em relogios de luxo suicos, pesado e elegante.",
    image: "/assets/da-mafia/watches/golden-machine-skeleton.jpg",
  },
];

function normalizeProductName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function mergeCuratedProducts(products: Product[]) {
  const existingNames = new Set(products.map((product) => normalizeProductName(product.name)));
  const curatedProducts = curatedStoreProducts.filter((product) => !existingNames.has(normalizeProductName(product.name)));

  return [...curatedProducts, ...products];
}
