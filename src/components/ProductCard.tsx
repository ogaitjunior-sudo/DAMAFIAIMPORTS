import { Heart, ShoppingCart, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { imageFor } from "@/lib/gallery";
import type { Product } from "@/lib/types";

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function categoryLabel(product: Product) {
  const text = normalizeText(`${product.name} ${product.description} ${product.category}`);
  const aliases: Record<string, string> = {
    ["Cava" + "quinhos"]: "Perfumes",
    ["Cor" + "das"]: "Camisas de Futebol",
    ["Afi" + "nadores"]: "Relógios",
    Jerseys: "Camisas de Futebol",
    Relogios: "Relógios",
    Premium: "Premium",
  };

  if (product.category === "Perfumes" || text.includes("perfume") || text.includes("fragrancia")) return "Perfumes";
  if (text.includes("camisa") || text.includes("tailandesa") || text.includes("jersey")) return "Camisas de Futebol";
  if (text.includes("relogio") || text.includes("watch")) return "Relógios";
  if (text.includes("corrente") || text.includes("chain")) return "Correntes";
  if (text.includes("pingente") || text.includes("pendant")) return "Pingentes";
  if (text.includes("pulseira") || text.includes("bracelet")) return "Pulseiras";
  if (text.includes("dedeira") || text.includes("anel") || text.includes("ring")) return "Dedeiras";
  if (text.includes("aparelho") || text.includes("iphone") || text.includes("celular") || text.includes("smartphone") || text.includes("console") || text.includes("playstation")) return "Premium";

  return aliases[product.category] ?? "Correntes";
}

function productTone(product: Product) {
  switch (categoryLabel(product)) {
    case "Perfumes":
      return "aaa-product-card--perfume";
    case "Camisas de Futebol":
      return "aaa-product-card--jersey";
    case "Correntes":
    case "Pingentes":
    case "Pulseiras":
    case "Dedeiras":
      return "aaa-product-card--exclusive";
    case "Relógios":
      return "aaa-product-card--watch";
    default:
      return "aaa-product-card--premium";
  }
}

function badgeFor(product: Product) {
  if (product.stock <= 5) return "Limitado";
  if (product.price >= 500) return "Exclusivo";
  return "Premium";
}

function ratingFor(product: Product) {
  const seed = product.id.charCodeAt(product.id.length - 1) || 5;
  return (4.6 + (seed % 4) / 10).toFixed(1);
}

function isRasterProductPhoto(src: string) {
  return /\.(jpe?g|png|webp)(\?|$)/i.test(src);
}

export function ProductCard({ product }: { product: Product }) {
  const rating = ratingFor(product);
  const stockPercent = Math.max(10, Math.min(100, product.stock * 8));
  const imageSrc = imageFor(product.image);
  const photoClassName = `aaa-product-card__photo${isRasterProductPhoto(imageSrc) ? " aaa-product-card__photo--raster" : ""}`;
  const formattedPrice =
    product.price > 0
      ? product.price.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "Consultar";

  return (
    <article className={`aaa-product-card ${productTone(product)}`}>
      <div className="aaa-product-card__media">
        <div className="aaa-product-card__badges">
          <span>{badgeFor(product)}</span>
          <span>{categoryLabel(product)}</span>
        </div>
        <button type="button" aria-label="Favoritar" className="aaa-product-card__favorite">
          <Heart className="h-5 w-5" />
        </button>
        <img className={photoClassName} src={imageSrc} alt={product.name} loading="lazy" />
      </div>

      <div className="aaa-product-card__body">
        <div className="aaa-product-card__rating" aria-label={`Avaliacao ${rating} de 5`}>
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
          <span>{rating}</span>
        </div>

        <h2>{product.name}</h2>
        <p>{product.description}</p>

        <div className="aaa-product-card__stock">
          <span>{product.stock} restantes</span>
          <i><b style={{ width: `${stockPercent}%` }} /></i>
        </div>

        <div className="aaa-product-card__price-row">
          <strong>{formattedPrice}</strong>
          <small>curadoria premium</small>
        </div>

        <div className="aaa-product-card__actions">
          <Button className="aaa-buy-button">
            <ShoppingCart className="h-4 w-4" />
            Comprar
          </Button>
          <Button variant="outline" size="icon" className="aaa-detail-button" aria-label="Ver detalhes">
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
