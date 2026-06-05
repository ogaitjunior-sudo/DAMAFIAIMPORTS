import { ArrowRight, ShoppingBag, Ticket } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="exact-template-home" aria-label="DA MAFIA IMPORTS">
      <div className="exact-template-home__stage">
        <img
          className="exact-template-home__image exact-template-home__image--final"
          src="/assets/da-mafia/home-hero-brasil-rolex-20260604.png?v=hero-logo-sem-rosto-20260604"
          alt="DA MAFIA IMPORTS - Produtos importados, rifas exclusivas e ofertas selecionadas"
        />

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





