import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Crown,
  Gem,
  PackageCheck,
  Headphones,
  Heart,
  Instagram,
  MapPin,
  
  ShieldCheck,
  Users,
} from "lucide-react";
import { PhotoGallery } from "@/components/PhotoGallery";
import { featuredImages } from "@/lib/gallery";
import { siteInfo } from "@/lib/site-info";

export const Route = createFileRoute("/sobre")({
  component: SobrePage,
  head: () => ({ meta: [{ title: "Sobre - DA MAFIA IMPORTS" }] }),
});

const storyCards = [
  {
    icon: PackageCheck,
    title: "Importados com presenca",
    text: "Cada item DA MAFIA e selecionado para entregar acabamento, presenca e visual internacional.",
  },
  {
    icon: Heart,
    title: "Street luxury",
    text: "Acreditamos em estilo com assinatura propria: perfumes, jerseys e acessorios que mudam a chegada.",
  },
  {
    icon: Users,
    title: "Comunidade de estilo",
    text: "Mais que uma loja: um ponto de encontro para quem vive importados, rifas e presenca premium.",
  },
];

const differentials = [
  { icon: ShieldCheck, title: "Curadoria Premium", value: "100%", text: "Produtos selecionados por estilo, acabamento e raridade." },
  { icon: Gem, title: "Acabamento Premium", value: "Premium", text: "Materiais nobres e acabamento de alto padrão." },
  { icon: BadgeCheck, title: "Rifas Transparentes", value: "Confianca", text: "Processo claro, atendimento direto e acompanhamento seguro." },
  { icon: Headphones, title: "Atendimento Humanizado", value: "Suporte", text: "Atendimento próximo, rápido e feito por quem entende." },
];

function SobrePage() {
  return (
    <main className="about-page">
      <div className="about-page-glow" />

      <section className="about-hero">
        <div className="about-hero-copy">
          <div className="about-eyebrow">Nossa história</div>
          <h1>
            Sobre a <span>DA MAFIA</span>
          </h1>
          <p>
            Mais do que importados premium, criamos uma experiencia de presenca, curadoria e estilo. Cada item DA MAFIA carrega
            identidade, acabamento refinado e energia street luxury.
          </p>
          <a href={siteInfo.instagram.url} target="_blank" rel="noreferrer" className="about-instagram-link">
            <Instagram className="h-5 w-5" />
            {siteInfo.instagram.handle}
            <span>→</span>
          </a>
        </div>

        <div className="about-hero-stage" aria-hidden="true">
          <div className="about-case about-case-back" />
          <div className="about-case about-case-front" />
          <div className="about-pedestal">
            <span>DM</span>
          </div>
          <img src={featuredImages.about} alt="" />
        </div>
      </section>

      <PhotoGallery title="Galeria real DA MAFIA" subtitle="Perfumes, jerseys, acessorios e composicoes usadas nas rifas e vendas." />

      <section className="about-story-grid">
        {storyCards.map(({ icon: Icon, title, text }) => (
          <article key={title} className="about-story-card">
            <span>
              <Icon />
            </span>
            <h2>{title}</h2>
            <p>{text}</p>
            <div />
          </article>
        ))}
      </section>

      <section className="about-differentials">
        <p>Nossos diferenciais</p>
        <h2>
          Por que escolher a <span>DA MAFIA?</span>
        </h2>
        <div className="about-differential-grid">
          {differentials.map(({ icon: Icon, title, value, text }) => (
            <article key={title} className="about-differential-card">
              <span>
                <Icon />
              </span>
              <h3>{title}</h3>
              <strong>{value}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-banner">
        <div>
          <h2>Estilo cria presenca.</h2>
          <p>E nós estamos aqui para fazer parte da sua.</p>
          <a href={siteInfo.instagram.url} target="_blank" rel="noreferrer" aria-label="Abrir Instagram da DA MAFIA">
            →
          </a>
        </div>
        <div className="about-banner-strip">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="about-info-strip">
        <div>
          <Crown />
          <h2>DA MAFIA IMPORTS</h2>
          <p>{siteInfo.instagram.bio}</p>
        </div>
        <div>
          <Headphones />
          <h2>Atendimento</h2>
          <p>Segunda a sexta: 9h às 18h</p>
          <p>Sábado: 9h às 13h</p>
        </div>
        <div>
          <MapPin />
          <h2>Localização</h2>
          <p>Salvador, Bahia</p>
          <p>Brasil</p>
        </div>
        <div>
          <Instagram />
          <h2>Redes sociais</h2>
          <a href={siteInfo.instagram.url} target="_blank" rel="noreferrer">
            {siteInfo.instagram.handle}
          </a>
        </div>
      </section>
    </main>
  );
}

