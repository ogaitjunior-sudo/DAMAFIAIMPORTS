import {
  ArrowRight,
  ClipboardList,
  Crown,
  Home,
  Menu,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  User,
} from "lucide-react";
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
        <header className="home-mobile-topbar" aria-label="Topo mobile">
          <details className="home-mobile-menu">
            <summary aria-label="Abrir menu">
              <Menu aria-hidden="true" />
            </summary>
            <nav className="home-mobile-menu__panel" aria-label="Menu mobile">
              <Link to="/">Inicio</Link>
              <Link to="/loja">Produtos</Link>
              <Link to="/rifas">Rifas</Link>
              <Link to="/meus-numeros">Pedidos</Link>
              <Link to="/login">Conta</Link>
            </nav>
          </details>

          <Link to="/" className="home-mobile-brand" aria-label="Inicio DA MAFIA IMPORTS">
            <span>DA MAFIA</span>
            <small>
              <Crown aria-hidden="true" />
              IMPORTS
              <Crown aria-hidden="true" />
            </small>
          </Link>

          <div className="home-mobile-tools" aria-label="Acoes mobile">
            <Link to="/loja" aria-label="Buscar produtos">
              <Search aria-hidden="true" />
            </Link>
            <Link to="/loja" aria-label="Carrinho">
              <ShoppingCart aria-hidden="true" />
            </Link>
          </div>
        </header>

        <picture>
          <source
            media="(max-width: 768px)"
            srcSet="/assets/da-mafia/home-mobile-exact-reference-20260607.png?v=mobile-exact-reference-20260607"
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

        <nav className="home-mobile-bottom-nav" aria-label="Navegacao inferior mobile">
          <Link to="/" className="is-active">
            <Home aria-hidden="true" />
            <span>Inicio</span>
          </Link>
          <Link to="/loja">
            <Package aria-hidden="true" />
            <span>Produtos</span>
          </Link>
          <Link to="/rifas">
            <Ticket aria-hidden="true" />
            <span>Rifas</span>
          </Link>
          <Link to="/meus-numeros">
            <ClipboardList aria-hidden="true" />
            <span>Pedidos</span>
          </Link>
          <Link to="/login">
            <User aria-hidden="true" />
            <span>Conta</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}





