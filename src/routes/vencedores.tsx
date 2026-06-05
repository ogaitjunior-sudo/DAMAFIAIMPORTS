import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gift,
  LockKeyhole,
  PackageCheck,
  PlayCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWinners } from "@/lib/api";
import type { Winner } from "@/lib/types";

export const Route = createFileRoute("/vencedores")({
  loader: async () => {
    try {
      return await getWinners();
    } catch (error) {
      console.error("Nao foi possivel carregar as entregas.", error);
      return [];
    }
  },
  component: VencedoresPage,
  head: () => ({ meta: [{ title: "Entregas - DA MAFIA IMPORTS" }] }),
});

const winnerCards = [
  {
    image: "/assets/winners/winner-01.jpg",
    date: "15 mai 2024",
    title: "Rifa entregue com presenca",
    text: "Cliente recebeu o kit DA MAFIA com perfume, jersey e bag personalizada em maos.",
  },
  {
    image: "/assets/winners/winner-02.jpg",
    date: "10 mai 2024",
    title: "Entregue em mãos",
    text: "Registro real do cliente recebendo o kit premium selecionado.",
  },
  {
    image: "/assets/winners/winner-03.jpeg",
    date: "05 mai 2024",
    title: "Chegou cedo e levou",
    text: "Mais uma entrega feita com transparência e compromisso.",
  },
];

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Rifa segura",
    text: "Participações registradas com código de validação.",
  },
  {
    icon: Users,
    title: "Clientes reais",
    text: "Fotos e vídeos das entregas feitas aos participantes.",
  },
  {
    icon: PackageCheck,
    title: "Entrega confirmada",
    text: "Prêmios entregues e divulgados com transparência.",
  },
];

const testimonials = [
  {
    image: "/assets/winners/winner-01.jpg",
    quote: "Recebi meu importado premium em perfeito estado. Transparencia total em todo o processo!",
    name: "Andre S.",
    place: "Salvador, BA",
  },
  {
    image: "/assets/winners/winner-02.jpg",
    quote: "Curadoria impecavel, atendimento rapido e entrega com experiencia premium.",
    name: "Carlos M.",
    place: "Rio de Janeiro, RJ",
  },
  {
    image: "/assets/winners/winner-03.jpeg",
    quote: "Entrega rápida e o prêmio é ainda mais lindo ao vivo. Parabéns DA MAFIA!",
    name: "Joao P.",
    place: "Belo Horizonte, MG",
  },
];

const stats = [
  { icon: Users, value: "+1.2k", label: "Participantes", text: "na plataforma" },
  { icon: Gift, value: "+50", label: "Entregas realizadas", text: "com sucesso" },
  { icon: ShieldCheck, value: "100%", label: "Rifas auditadas", text: "com total transparência" },
  { icon: ThumbsUp, value: "0", label: "Reclamações", text: "nossa maior conquista" },
];

function formatWinnerDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return date;
  return parsedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

function VencedoresPage() {
  const winners = Route.useLoaderData() as Winner[];
  const featuredWinner = winners.find((winner) => winner.status === "destaque") ?? winners[0];
  const winnerCards = winners.slice(0, 6);
  const testimonials = winnerCards.slice(0, 3);

  return (
    <main className="winners-page">
      <div className="winners-page-glow" />

      <section className="winners-hero">
        <div className="winners-copy">
          <p className="winners-eyebrow">
            <Trophy className="h-4 w-4" />
            Galeria de entregas
          </p>
          <h1>
            Entregas <span>DA MAFIA</span>
          </h1>
          <p>
            Quem entra nas rifas acompanha tudo com transparencia. Aqui estao registros reais de entregas,
            kits recebidos e historias da nossa comunidade.
          </p>
          <div className="winners-actions">
            <Button asChild className="bg-gradient-gold text-background shadow-gold gold-shine">
              <Link to="/rifas">
                <Flame className="h-4 w-4" />
                Ver rifas ativas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-gold/45 bg-background/35 text-cream hover:bg-gold/10">
              <Link to="/validar">
                <ShieldCheck className="h-4 w-4" />
                Validar rifa
              </Link>
            </Button>
          </div>
        </div>

        <article className="winners-video-card">
          <div className="winners-video-badges">
            <span>
              <PackageCheck className="h-4 w-4" />
              Entrega real
            </span>
            <span>
              <ShieldCheck className="h-4 w-4" />
              100% confirmado
            </span>
          </div>
          <div className="winners-video-heading">
            <h2>
              Entrega premium <span>confirmada!</span>
            </h2>
          </div>
          {featuredWinner?.video ? (
            <video controls preload="metadata" poster={featuredWinner.image}>
              <source src={featuredWinner.video} type="video/mp4" />
            </video>
          ) : (
            <img className="w-full rounded-xl object-cover" src={featuredWinner?.image ?? "/assets/winners/winner-01.jpg"} alt={featuredWinner?.title ?? "Vencedor DA MAFIA"} />
          )}
        </article>
      </section>

      <section className="winners-feature-strip">
        {trustItems.map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <span>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="winners-gallery">
        <div className="winners-section-heading">
          <p>
            <Sparkles className="h-4 w-4" />
            Últimos
          </p>
          <h2>Entregas</h2>
          <Button asChild variant="outline" className="winners-view-all">
            <Link to="/rifas">
              Ver rifas ativas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="winners-grid">
          {winnerCards.map((winner) => (
            <article key={winner.image} className="winner-card">
              <figure>
                <img src={winner.image} alt={winner.title} loading="lazy" />
                <span className="winner-confirmed">Entrega confirmada</span>
                <span className="winner-check">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              </figure>
              <div>
                <small className="winner-date">
                  <CalendarDays className="h-4 w-4" />
                  {formatWinnerDate(winner.date)}
                </small>
                <h3>{winner.title}</h3>
                <p>{winner.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="winners-testimonials">
        <button type="button" className="winners-slider-button" aria-label="Depoimento anterior">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="winners-testimonial-panel">
          <div className="winners-mini-heading">
            <span />
            Historias reais
            <span />
          </div>
          <div className="winners-testimonial-grid">
            {testimonials.map((testimonial) => (
              <article key={testimonial.id} className="winners-testimonial">
                <div className="winners-stars" aria-label="5 estrelas">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4" />
                  ))}
                </div>
                <p>
                  <Quote className="h-4 w-4" />
                  Entrega confirmada com transparencia. O kit chegou em maos e ficou registrado aqui na galeria DA MAFIA.
                </p>
                <div>
                  <img src={testimonial.image} alt={testimonial.winnerName} loading="lazy" />
                  <span>
                    <strong>{testimonial.winnerName}</strong>
                    <small>{testimonial.city || "Brasil"}</small>
                  </span>
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </article>
            ))}
          </div>
        </div>
        <button type="button" className="winners-slider-button" aria-label="Próximo depoimento">
          <ChevronRight className="h-5 w-5" />
        </button>
      </section>

      <section className="winners-stats">
        {stats.map(({ icon: Icon, value, label, text }) => (
          <article key={label}>
            <span>
              <Icon className="h-7 w-7" />
            </span>
            <div>
              <strong>{value}</strong>
              <h2>{label}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="winners-safe">
        <span />
        <p>
          <LockKeyhole className="h-5 w-5" />
          Compra segura e ambiente 100% protegido
        </p>
        <span />
        <small>Seus dados protegidos com criptografia e pagamento seguro.</small>
      </section>
    </main>
  );
}

