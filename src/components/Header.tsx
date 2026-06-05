import { Link } from "@tanstack/react-router";
import { Menu as MenuIcon, ShoppingCart, User, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";

const nav = [
  { to: "/", label: "INÍCIO" },
  { to: "/rifas", label: "RIFAS" },
  { to: "/loja", label: "COLEÇÃO" },
  { to: "/contato", label: "CONTATO" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header original-template-header sticky top-0 z-50 border-b border-gold/60 bg-black">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 lg:px-8">
        <Logo size="lg" />

        <nav className="original-template-nav hidden lg:flex items-center">
          {nav.map((n) => (
            <Link
              key={`${n.to}-${n.label}`}
              to={n.to}
              className="original-template-nav-link"
              activeProps={{ className: "is-active" }}
            >
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="original-template-actions hidden lg:flex items-center">
          <Link to="/login" className="original-template-account" aria-label="Minha conta">
            <User className="h-6 w-6" />
            <span>Minha conta</span>
          </Link>
          <Link to="/loja" className="original-template-cart" aria-label="Carrinho">
            <ShoppingCart className="h-6 w-6" />
            <span>0</span>
          </Link>
        </div>

        <button
          className="original-template-menu-button lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          type="button"
        >
          {open ? <X /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <div className="original-template-mobile lg:hidden">
          <nav>
            {nav.map((n) => (
              <Link key={`${n.to}-${n.label}`} to={n.to} onClick={() => setOpen(false)}>
                <span>{n.label}</span>
              </Link>
            ))}
            <Link to="/login" onClick={() => setOpen(false)}>
              <User className="h-4 w-4" />
              Minha conta
            </Link>
            <Link to="/loja" onClick={() => setOpen(false)}>
              <ShoppingCart className="h-4 w-4" />
              Carrinho 0
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
