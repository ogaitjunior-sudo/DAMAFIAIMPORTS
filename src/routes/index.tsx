import {
  ArrowRight,
  Crown,
  CreditCard,
  Gem,
  Instagram,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Shirt,
  ShoppingBag,
  Smartphone,
  Star,
  Ticket,
  Watch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getHomeData } from "@/lib/api";
import { curatedStoreProducts } from "@/lib/store-curation";
import type { Product, Raffle } from "@/lib/types";

export const Route = createFileRoute("/")({
  loader: async (): Promise<HomeLoaderData> => {
    try {
      const data = await getHomeData();
      return {
        activeRaffles: data.activeRaffles,
        featuredProducts: data.featuredProducts,
        ok: true,
      };
    } catch (error) {
      console.error("[/] Falha tecnica ao carregar dados reais da home.", error);
      return {
        activeRaffles: [],
        featuredProducts: [],
        ok: false,
      };
    }
  },
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

type HomeLoaderData = {
  activeRaffles: Raffle[];
  featuredProducts: Product[];
  ok: boolean;
};

const mobileFeaturedCategories: Array<{
  label: string;
  subtitle: string;
  href: string;
  Icon: LucideIcon;
}> = [
  {
    label: "Perfumes",
    subtitle: "Importados",
    href: "/loja?categoria=Perfumes#produtos",
    Icon: Gem,
  },
  {
    label: "Camisas",
    subtitle: "Tailandesas",
    href: "/loja?categoria=CamisasTailandesas#produtos",
    Icon: Shirt,
  },
  {
    label: "Relogios",
    subtitle: "Premium",
    href: "/loja?categoria=Relogios#produtos",
    Icon: Watch,
  },
  {
    label: "Correntes",
    subtitle: "Exclusivas",
    href: "/loja?categoria=Correntes#produtos",
    Icon: Crown,
  },
  {
    label: "Aparelhos",
    subtitle: "Selecionados",
    href: "/loja?categoria=Aparelhos#produtos",
    Icon: Smartphone,
  },
];

const contactItems = [
  {
    title: "WhatsApp",
    text: "(22) 99770-1093",
    href: "https://wa.me/5521997701093",
    Icon: MessageCircle,
  },
  {
    title: "Instagram",
    text: "@damafiaimports",
    href: "https://www.instagram.com/damafiaimports",
    Icon: Instagram,
  },
  {
    title: "E-mail",
    text: "damafiaimports@gmail.com",
    href: "mailto:damafiaimports@gmail.com",
    Icon: Mail,
  },
  {
    title: "Localizacao",
    text: "Cabo Frio, RJ",
    href: "https://www.google.com/maps/search/?api=1&query=Cabo%20Frio%20RJ",
    Icon: MapPin,
  },
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function imageSource(source?: string) {
  if (!source) return "/assets/da-mafia/logo-da-mafia-imports-oficial.png";
  if (source.startsWith("http") || source.startsWith("/")) return source;
  return `/${source}`;
}

function raffleProgress(raffle: Raffle) {
  if (raffle.totalNumbers <= 0) return 0;
  return Math.min(100, Math.round((raffle.soldNumbers / raffle.totalNumbers) * 100));
}

function Index() {
  const { activeRaffles, featuredProducts } = Route.useLoaderData();
  const mobileProducts = featuredProducts.length > 0 ? featuredProducts : curatedStoreProducts.slice(0, 4);
  const hasProducts = mobileProducts.length > 0;
  const hasRaffles = activeRaffles.length > 0;

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

      <div className="home-mobile-premium" aria-label="Conteudo real DA MAFIA IMPORTS">
        <section className="home-mobile-categories" aria-labelledby="home-mobile-categories-title">
          <div className="home-mobile-section-title">
            <span aria-hidden="true" />
            <h2 id="home-mobile-categories-title">Categorias em destaque</h2>
            <span aria-hidden="true" />
          </div>

          <div className="home-mobile-categories__grid">
            {mobileFeaturedCategories.map(({ label, subtitle, href, Icon }) => (
              <a key={label} className="home-mobile-category-card" href={href}>
                <span className="home-mobile-category-card__icon" aria-hidden="true">
                  <Icon />
                </span>
                <strong>{label}</strong>
                <small>{subtitle}</small>
              </a>
            ))}
          </div>
        </section>

        {hasProducts ? (
          <section className="home-mobile-showcase" aria-labelledby="home-mobile-products-title">
            <div className="home-mobile-section-title">
              <span aria-hidden="true" />
              <h2 id="home-mobile-products-title">Vitrine premium</h2>
              <span aria-hidden="true" />
            </div>

            <div className="home-mobile-product-grid">
              {mobileProducts.map((product) => (
                <a key={product.id} className="home-mobile-product-card" href="/loja#produtos">
                  <span className="home-mobile-product-card__media">
                    <img src={imageSource(product.image)} alt={product.name} loading="lazy" />
                  </span>
                  <span className="home-mobile-product-card__body">
                    <strong>{product.name}</strong>
                    <small>{formatCurrency(product.price)}</small>
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {hasRaffles ? (
          <section className="home-mobile-raffles" aria-labelledby="home-mobile-raffles-title">
            <div className="home-mobile-section-title">
              <span aria-hidden="true" />
              <h2 id="home-mobile-raffles-title">Rifas oficiais</h2>
              <span aria-hidden="true" />
            </div>

            <div className="home-mobile-raffle-list">
              {activeRaffles.map((raffle) => {
                const progress = raffleProgress(raffle);
                return (
                  <Link key={raffle.id} className="home-mobile-raffle-card" to="/rifas/$id" params={{ id: raffle.id }}>
                    <span className="home-mobile-raffle-card__top">
                      <strong>{raffle.title}</strong>
                      <small>{formatCurrency(raffle.pricePerNumber)}</small>
                    </span>
                    <span className="home-mobile-raffle-card__bar" aria-hidden="true">
                      <span style={{ width: `${progress}%` }} />
                    </span>
                    <span className="home-mobile-raffle-card__meta">
                      {raffle.soldNumbers}/{raffle.totalNumbers} numeros
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="home-mobile-payment" aria-label="Pagamento seguro">
          <div className="home-mobile-payment__intro">
            <LockKeyhole aria-hidden="true" />
            <div>
              <strong>Pagamento seguro</strong>
              <span>Aceitamos os melhores meios de pagamento</span>
            </div>
          </div>
          <div className="home-mobile-payment__badges" aria-hidden="true">
            <span>VISA</span>
            <span>Master</span>
            <span>AMEX</span>
            <span>Elo</span>
            <span>Pix</span>
          </div>
        </section>

        <section className="home-mobile-contact" aria-label="Canais oficiais">
          {contactItems.map(({ title, text, href, Icon }) => (
            <a key={title} className="home-mobile-contact__item" href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>
              <Icon aria-hidden="true" />
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
            </a>
          ))}
        </section>

        <section className="home-mobile-signature" aria-label="Compromisso DA MAFIA IMPORTS">
          <img src="/assets/da-mafia/logo-da-mafia-imports.svg" alt="DA MAFIA IMPORTS" loading="lazy" />
          <div>
            <span aria-label="5 estrelas">
              <Star aria-hidden="true" />
              <Star aria-hidden="true" />
              <Star aria-hidden="true" />
              <Star aria-hidden="true" />
              <Star aria-hidden="true" />
            </span>
            <strong>Qualidade, confianca e exclusividade</strong>
            <small>Esse e o nosso compromisso com voce.</small>
          </div>
          <CreditCard aria-hidden="true" />
        </section>
      </div>
    </div>
  );
}





