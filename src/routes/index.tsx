import { ArrowRight, Crown, ShoppingBag, Ticket } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "DA MAFIA IMPORTS - Importados, rifas e ofertas exclusivas" },
      {
        name: "description",
        content: "Produtos importados, ofertas exclusivas e rifas oficiais da DA MAFIA IMPORTS.",
      },
    ],
  }),
});

function Index() {
  return (
    <div className="exact-template-home" aria-label="DA MAFIA IMPORTS">
      <div className="exact-template-home__stage">
        <nav className="exact-template-mobile-nav" aria-label="Navegacao principal mobile">
          <span aria-hidden="true" className="exact-template-mobile-nav__line" />
          <span aria-hidden="true" className="exact-template-mobile-nav__diamond" />
          <Crown className="exact-template-mobile-nav__crown" aria-hidden="true" />
          <Link to="/loja" className="exact-template-mobile-nav__link">
            Importados
          </Link>
          <span aria-hidden="true" className="exact-template-mobile-nav__dot" />
          <Link
            to="/loja"
            search={{ categoria: "CamisasTailandesas" }}
            className="exact-template-mobile-nav__link"
          >
            FIFA
          </Link>
          <span aria-hidden="true" className="exact-template-mobile-nav__dot" />
          <Link to="/rifas" className="exact-template-mobile-nav__link">
            Ofertas Exclusivas
          </Link>
          <span aria-hidden="true" className="exact-template-mobile-nav__diamond" />
          <span aria-hidden="true" className="exact-template-mobile-nav__line" />
        </nav>

        <picture>
          <source
            media="(max-width: 768px), ((orientation: portrait) and (pointer: coarse))"
            srcSet="/assets/da-mafia/home-hero-mobile-reference-20260605.png?v=mobile-hero-nav-overlay-20260606"
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
    </div>
  );
}





