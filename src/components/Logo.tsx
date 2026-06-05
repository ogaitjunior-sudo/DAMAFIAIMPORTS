import { Link } from "@tanstack/react-router";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { mark: "h-9 w-10", title: "text-base", sub: "text-[9px]" },
    md: { mark: "h-12 w-14", title: "text-lg", sub: "text-[10px]" },
    lg: { mark: "h-20 w-24", title: "text-3xl", sub: "text-xs" },
  }[size];

  return (
    <Link to="/" className="flex items-center gap-3 group">
      <div className={`${sizes.mark} da-mafia-logo-mark`}>
        <img
          src="/assets/da-mafia/logo-da-mafia-from-hero.png?v=logo-oficial-20260604"
          alt="DA MAFIA IMPORTS"
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span className={`font-display font-semibold tracking-wide text-gradient-gold ${sizes.title}`}>
          DA MAFIA
        </span>
        <span className={`uppercase tracking-[0.3em] text-muted-foreground ${sizes.sub}`}>
          Imports
        </span>
      </div>
    </Link>
  );
}
