import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle, Mail, ShoppingBag } from "lucide-react";
import { Logo } from "./Logo";
import { siteInfo } from "@/lib/site-info";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="container mx-auto px-4 lg:px-8 py-16 grid gap-12 md:grid-cols-5">
        <div className="md:col-span-2 space-y-4">
          <Logo size="md" />
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Importados premium, street luxury, perfumes, jerseys e acessorios exclusivos para quem compra presenca, nao ruido.
          </p>
          <div className="flex gap-3 pt-2">
            {[
              { Icon: Instagram, href: siteInfo.instagram.url, label: "Instagram" },
              { Icon: MessageCircle, href: "/contato", label: "WhatsApp" },
              { Icon: Mail, href: "mailto:contato@damafiaimports.com", label: "E-mail" },
              { Icon: ShoppingBag, href: "/loja", label: "Colecao" },
            ].map(({ Icon, href, label }) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} aria-label={label} className="h-10 w-10 rounded-full border border-gold/30 flex items-center justify-center text-primary hover:bg-gradient-gold hover:text-background transition-all">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-widest text-primary mb-4">Loja</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/loja" className="hover:text-primary">Colecao</Link></li>
            <li><Link to="/rifas" className="hover:text-primary">Rifas premium</Link></li>
            <li><Link to="/vencedores" className="hover:text-primary">Lancamentos</Link></li>
            <li><Link to="/sobre" className="hover:text-primary">Sobre</Link></li>
            <li><Link to="/contato" className="hover:text-primary">Contato</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-widest text-primary mb-4">Conta</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/login" className="hover:text-primary">Entrar</Link></li>
            <li><Link to="/cadastro" className="hover:text-primary">Criar Conta</Link></li>
            <li><Link to="/validar" className="hover:text-primary">Validar Rifa</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-widest text-primary mb-4">Instagram</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href={siteInfo.instagram.url} target="_blank" rel="noreferrer" className="hover:text-primary">{siteInfo.instagram.handle}</a></li>
            <li>{siteInfo.instagram.name}</li>
            <li>{siteInfo.instagram.bio}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground tracking-widest uppercase">
        &copy; {new Date().getFullYear()} DA MAFIA IMPORTS &middot; EXCLUSIVIDADE &middot; ESTILO &middot; PRESEN&Ccedil;A
      </div>
    </footer>
  );
}
