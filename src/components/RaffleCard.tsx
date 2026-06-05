import { Link } from "@tanstack/react-router";
import { ArrowRight, Bolt, Lock, ShieldCheck, Star, Ticket } from "lucide-react";
import { imageFor } from "@/lib/gallery";
import type { Raffle } from "@/lib/types";

type RaffleCardProps = {
  raffle: Raffle;
  featured?: boolean;
  index?: number;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function daysUntil(date: string) {
  const target = new Date(`${date}T23:59:59`);
  const now = new Date();
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000));
}

function badgeFor(raffle: Raffle, featured?: boolean) {
  if (raffle.status !== "ativa") return { icon: ShieldCheck, text: "Confiável" };
  if (featured) return { icon: Bolt, text: "Ativa" };
  return { icon: Star, text: "Popular" };
}

export function RaffleCard({ raffle, featured = false, index = 0 }: RaffleCardProps) {
  const progress = Math.min(100, Math.round((raffle.soldNumbers / raffle.totalNumbers) * 100));
  const available = Math.max(0, raffle.totalNumbers - raffle.soldNumbers);
  const soldOut = raffle.status !== "ativa" || available === 0;
  const remainingDays = daysUntil(raffle.drawDate);
  const BadgeIcon = badgeFor(raffle, featured).icon;
  const badgeText = badgeFor(raffle, featured).text;

  return (
    <article className="raffle-card group">
      <div className={`raffle-card-media raffle-card-media-${index % 3}`}>
        <div className="raffle-media-light" />
        <img className="raffle-card-product" src={imageFor(raffle.image)} alt={raffle.title} loading="lazy" />
        <span className="raffle-status-badge">
          <BadgeIcon className="h-3.5 w-3.5" />
          {badgeText}
        </span>
        {featured && (
          <span className="raffle-feature-badge">
            <Star className="h-3.5 w-3.5" />
            Em destaque
          </span>
        )}
      </div>

      <div className="raffle-card-body">
        <h2>{raffle.title}</h2>
        <p>{raffle.description}</p>

        <div className="raffle-card-numbers">
          <div>
            <span>Por apenas</span>
            <strong>R$ {formatCurrency(raffle.pricePerNumber)}</strong>
          </div>
          <div>
            <span>Disponíveis</span>
            <strong>{available} / {raffle.totalNumbers}</strong>
          </div>
        </div>

        <div>
          <div className="raffle-progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="raffle-progress-meta">
            <span>{progress}% vendido</span>
            <span>{soldOut ? "Rifa encerrada" : `Termina em ${remainingDays} dias`}</span>
          </div>
        </div>

        <div className="raffle-card-actions">
          {soldOut ? (
            <button type="button" disabled className="raffle-primary-action raffle-primary-action-disabled">
              <Lock className="h-4 w-4" />
              Esgotada
            </button>
          ) : (
            <Link
              to="/rifas/$id"
              params={{ id: raffle.id }}
              className="raffle-primary-action"
              aria-label={`Participar da rifa ${raffle.title}`}
            >
              <Ticket className="h-4 w-4" />
              Participar
            </Link>
          )}
          <Link
            to="/rifas/$id"
            params={{ id: raffle.id }}
            className="raffle-secondary-action"
            aria-label={`Ver detalhes da rifa ${raffle.title}`}
          >
            Detalhes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
