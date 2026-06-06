import { ArrowRight, ShoppingBag, Ticket } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

const mobileFeaturedCategories = [
  {
    label: "Relogios",
    image: "/assets/da-mafia/watches/black-emperor-gold.jpg",
    href: "/loja?categoria=Relogios#produtos",
  },
  {
    label: "Perfumes",
    image: "/assets/da-mafia/real-products/oud-mystery-intense.jpeg",
    href: "/loja?categoria=Perfumes#produtos",
  },
  {
    label: "Eletronicos",
    image: "/assets/da-mafia/category-showcase-strip.jpg?v=mobile-category-aparelhos-20260605",
    href: "/loja?categoria=Aparelhos#produtos",
  },
  {
    label: "Camisas de time",
    image: "/assets/da-mafia/product-jersey-gold.svg",
    href: "/loja?categoria=CamisasTailandesas#produtos",
  },
];

function Index() {
  return (
    <div className="exact-template-home" aria-label="DA MAFIA IMPORTS">
      <div className="exact-template-home__stage">
        <picture>
          <source
            media="(max-width: 768px), ((orientation: portrait) and (pointer: coarse))"
            srcSet="/assets/da-mafia/home-hero-mobile-reference-20260605.png?v=mobile-hero-reference-20260605"
          />
          <img
            className="exact-template-home__image exact-template-home__image--final"
            src="/assets/da-mafia/home-hero-brasil-rolex-20260604.png?v=hero-inicio-nova-20260605"
            alt="DA MAFIA IMPORTS - Produtos importados, rifas exclusivas e ofertas selecionadas"
          />
        </picture>

        <div className="exact-template-actions" aria-label="Acoes principais">
          <Link className="exact-template-action exact-template-action--primary" to="/loja">
            <ShoppingBag className="exact-template-action__icon" aria-hidden="true" />
            <span>VER PRODUTOS</span>
            <ArrowRight className="exact-template-action__arrow" aria-hidden="true" />
          </Link>
          <Link className="exact-template-action exact-template-action--secondary" to="/rifas">
            <span>PARTICIPAR DAS RIFAS</span>
            <Ticket className="exact-template-action__ticket" aria-hidden="true" />
          </Link>
        </div>

        <Link className="exact-template-hotspot exact-template-hotspot--inicio" to="/" aria-label="Inicio" />
        <Link className="exact-template-hotspot exact-template-hotspot--rifas" to="/rifas" aria-label="Rifas" />
        <Link className="exact-template-hotspot exact-template-hotspot--colecao" to="/loja" aria-label="Colecao" />
        <Link className="exact-template-hotspot exact-template-hotspot--lancamentos" to="/vencedores" aria-label="Lancamentos" />
        <Link className="exact-template-hotspot exact-template-hotspot--confiavel" to="/validar" aria-label="Confiavel" />
        <Link className="exact-template-hotspot exact-template-hotspot--sobre" to="/sobre" aria-label="Sobre" />
        <Link className="exact-template-hotspot exact-template-hotspot--contato" to="/contato" aria-label="Contato" />
        <Link className="exact-template-hotspot exact-template-hotspot--conta" to="/login" aria-label="Minha conta" />
      </div>

      <section className="home-mobile-categories" aria-labelledby="home-mobile-categories-title">
        <div className="home-mobile-categories__heading">
          <h2 id="home-mobile-categories-title">Categorias em destaque</h2>
          <span aria-hidden="true" />
        </div>

        <div className="home-mobile-categories__grid">
          {mobileFeaturedCategories.map((category) => (
            <a key={category.label} className="home-mobile-category-card" href={category.href}>
              <span className="home-mobile-category-card__media" aria-hidden="true">
                <img src={category.image} alt="" loading="lazy" />
              </span>
              <strong>{category.label}</strong>
              <small>Ver produtos</small>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}





