import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  PackageCheck,
} from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/api";
import type { Product } from "@/lib/types";

type CategoryKey =
  | "Todos"
  | "CamisasTailandesas"
  | "Perfumes"
  | "Relogios"
  | "Correntes"
  | "Pingentes"
  | "Pulseiras"
  | "Dedeiras"
  | "Aparelhos";

type CategoryOption = {
  key: Exclude<CategoryKey, "Todos">;
  label: string;
  eyebrow: string;
};

const categories: CategoryOption[] = [
  { key: "CamisasTailandesas", label: "Camisas Tailandesas", eyebrow: "Street luxury" },
  { key: "Perfumes", label: "Perfumes", eyebrow: "Importados" },
  { key: "Relogios", label: "Relógios", eyebrow: "Premium" },
  { key: "Correntes", label: "Correntes", eyebrow: "Gold style" },
  { key: "Pingentes", label: "Pingentes", eyebrow: "Exclusivos" },
  { key: "Pulseiras", label: "Pulseiras", eyebrow: "Selecionadas" },
  { key: "Dedeiras", label: "Dedeiras", eyebrow: "Limitadas" },
  { key: "Aparelhos", label: "Aparelhos", eyebrow: "Premium" },
];

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function legacyCategoryKey(category: string): CategoryKey {
  const aliases: Record<string, CategoryKey> = {
    ["Cava" + "quinhos"]: "Perfumes",
    ["Cor" + "das"]: "CamisasTailandesas",
    ["Capo" + "traste"]: "Correntes",
    ["Pal" + "hetas"]: "Aparelhos",
    ["Afi" + "nadores"]: "Relogios",
    ["Ca" + "ses"]: "Aparelhos",
    Jerseys: "CamisasTailandesas",
    Sneakers: "Aparelhos",
    Relogios: "Relogios",
    Acessorios: "Correntes",
    Premium: "Aparelhos",
  };
  return aliases[category] ?? (category as CategoryKey);
}

function productMatchesCategory(product: Product, category: CategoryKey) {
  if (category === "Todos") return true;

  const legacy = legacyCategoryKey(product.category);
  const text = normalizeText(`${product.name} ${product.description} ${product.category}`);

  switch (category) {
    case "CamisasTailandesas":
      return legacy === category || text.includes("camisa") || text.includes("tailandesa") || text.includes("jersey");
    case "Perfumes":
      return legacy === category || text.includes("perfume") || text.includes("fragrancia");
    case "Relogios":
      return legacy === category || text.includes("relogio") || text.includes("watch");
    case "Correntes":
      return text.includes("corrente") || text.includes("chain") || normalizeText(product.category) === "correntes";
    case "Pingentes":
      return text.includes("pingente") || text.includes("pendant") || normalizeText(product.category) === "pingentes";
    case "Pulseiras":
      return text.includes("pulseira") || text.includes("bracelet") || normalizeText(product.category) === "pulseiras";
    case "Dedeiras":
      return text.includes("dedeira") || text.includes("anel") || text.includes("ring") || normalizeText(product.category) === "dedeiras";
    case "Aparelhos":
      return (
        legacy === category ||
        text.includes("aparelho") ||
        text.includes("iphone") ||
        text.includes("celular") ||
        text.includes("smartphone") ||
        text.includes("console") ||
        text.includes("playstation") ||
        text.includes("eletronico")
      );
    default:
      return false;
  }
}

const perfumeProducts: Product[] = [
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
];

const watchProducts: Product[] = [
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

function mergeCuratedProducts(products: Product[]) {
  const existingNames = new Set(products.map((product) => normalizeText(product.name)));
  const curatedPerfumes = perfumeProducts.filter((product) => !existingNames.has(normalizeText(product.name)));
  const curatedWatches = watchProducts.filter((product) => !existingNames.has(normalizeText(product.name)));

  return [...curatedPerfumes, ...curatedWatches, ...products];
}

export const Route = createFileRoute("/loja")({
  loader: async () => {
    try {
      return await getProducts();
    } catch (error) {
      console.error("Nao foi possivel carregar os produtos.", error);
      return [];
    }
  },
  component: LojaPage,
  head: () => ({ meta: [{ title: "Colecao - DA MAFIA IMPORTS" }] }),
});

function LojaPage() {
  const products = Route.useLoaderData();
  const [cat, setCat] = useState<CategoryKey>("Todos");
  const collectionProducts = mergeCuratedProducts(products);
  const list = collectionProducts.filter((p) => productMatchesCategory(p, cat));

  return (
    <div className="store-page collection-aaa">
      <section className="collection-reference-hero" aria-labelledby="collection-title">
        <h1 id="collection-title" className="collection-category-sr">
          Importados e Street Luxury
        </h1>
        <div className="collection-reference-hero__frame">
          <img
            src="/assets/da-mafia/colecao.png?v=colecao-nova-final-20260604"
            alt="Importados e Street Luxury. Produtos selecionados para quem busca exclusividade, estilo e presenca."
          />
          <div className="collection-reference-actions" aria-label="Acoes da colecao">
            <a href="#produtos" className="collection-primary-action collection-reference-button">
              Ver coleção premium
              <ArrowRight className="h-5 w-5" />
            </a>
            <a href="/contato" className="collection-secondary-action collection-reference-button">
              Como funciona
            </a>
          </div>
        </div>
      </section>

      <section className="collection-categories" aria-labelledby="category-title">
        <h2 id="category-title" className="collection-category-sr">Categorias</h2>

        <div className="collection-category-showcase">
          <img src="/assets/da-mafia/category-showcase-strip.jpg?v=original-symbol-20260528" alt="" />
          <div className="collection-category-hotspots" role="tablist" aria-label="Categorias da loja">
            {categories.map(({ key, label, eyebrow }) => (
              <button
                key={key}
                type="button"
                onClick={() => setCat(cat === key ? "Todos" : key)}
                className={cat === key ? "is-active" : ""}
                aria-pressed={cat === key}
                aria-label={`${label} - ${eyebrow}`}
                title={label}
              >
                <span className="collection-category-sr">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="produtos" className="collection-products" aria-labelledby="products-title">
        <div className="collection-products__head">
          <div className="collection-section-heading collection-section-heading--left">
            <span />
            <h2 id="products-title">Produtos em destaque</h2>
            <span />
          </div>
          <p>{list.length} itens selecionados pela curadoria DA MAFIA</p>
        </div>

        <div className="collection-product-grid">
          {list.length > 0 ? (
            list.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div className="collection-empty">
              <span><PackageCheck className="h-8 w-8" /></span>
              <h3>Curadoria premium em preparacao</h3>
              <p>Os itens exclusivos aparecem aqui assim que forem liberados pela equipe DA MAFIA.</p>
              <a href="/contato">Solicitar consultoria</a>
            </div>
          )}
        </div>
      </section>

      <section className="collection-signature" aria-label="Assinatura DA MAFIA IMPORTS">
        <img src="/assets/da-mafia/logo-da-mafia-from-hero.png?v=logo-oficial-20260604" alt="" />
        <div>
          <h2>Da Mafia Imports</h2>
          <p>Excelencia em cada detalhe. Produtos exclusivos, atendimento premium e presenca de marca.</p>
        </div>
        <strong>Luxury imports</strong>
      </section>
    </div>
  );
}

