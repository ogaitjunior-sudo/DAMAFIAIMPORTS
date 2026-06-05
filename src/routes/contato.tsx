import { createFileRoute } from "@tanstack/react-router";
import { Crown, Gem, Headphones, Instagram, LockKeyhole, Mail, MapPin, MessageCircle, Send, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { siteInfo } from "@/lib/site-info";

export const Route = createFileRoute("/contato")({
  component: ContatoPage,
  head: () => ({ meta: [{ title: "Contato - DA MAFIA IMPORTS" }] }),
});

const contacts = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "(22) 99770-1093",
    detail: "Atendimento rápido e direto",
    href: "https://wa.me/5522997701093",
  },
  {
    icon: Mail,
    label: "E-mail",
    value: "damafiaimports@gmail.com",
    detail: "Responderemos em breve",
    href: "mailto:damafiaimports@gmail.com",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: siteInfo.instagram.handle,
    detail: "Acompanhe nosso dia a dia",
    href: siteInfo.instagram.url,
  },
  {
    icon: MapPin,
    label: "Localização",
    value: "Cabo Frio, RJ",
    detail: "Atendemos todo o Brasil",
    href: "#",
  },
];

const trustItems = [
  {
    icon: Crown,
    label: "Perfil oficial",
    title: "DA MÁFIA IMPORTS",
    text: "Importados premium, street luxury, perfumes, jerseys e acessórios exclusivos.",
  },
  { icon: Gem, label: "Produtos", title: "Selecionados" },
  { icon: ShieldCheck, label: "Qualidade", title: "Premium" },
  { icon: Truck, label: "Envio seguro", title: "Para todo o Brasil" },
  { icon: Headphones, label: "Atendimento", title: "Exclusivo" },
];

function ContatoPage() {
  return (
    <main className="contact-page">
      <div className="contact-page-glow" />

      <section className="contact-layout">
        <div className="contact-copy">
          <div className="contact-eyebrow">Fale com a gente</div>
          <div className="contact-hero-logo" aria-hidden="true">
            <img src="/assets/da-mafia/logo-da-mafia-from-hero.png?v=logo-oficial-20260604" alt="" />
          </div>
          <h1>
            Entre em <span>Contato</span>
          </h1>
          <p>Atendimento exclusivo e personalizado para te oferecer a melhor experiência.</p>

          <div className="contact-card-list">
            {contacts.map(({ icon: Icon, label, value, detail, href }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                className="contact-info-card"
              >
                <span>
                  <Icon />
                </span>
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <p>{detail}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
          <div className="contact-form-mark" aria-hidden="true">
            <Crown />
          </div>
          <div className="contact-form-heading">
            <div>
              <h2>Envie sua mensagem</h2>
              <span aria-hidden="true">★ ★ ★</span>
              <p>Preencha os dados abaixo que entraremos em contato.</p>
            </div>
          </div>

          <FormField label="Nome">
            <Input placeholder="Seu nome completo" required />
          </FormField>
          <FormField label="E-mail">
            <Input type="email" placeholder="Seu melhor e-mail" required />
          </FormField>
          <FormField label="Telefone">
            <Input placeholder="Seu telefone (opcional)" />
          </FormField>
          <FormField label="Mensagem">
            <Textarea rows={7} placeholder="Como podemos te ajudar?" required />
          </FormField>

          <Button type="submit" size="lg" className="contact-submit gold-shine">
            <Send className="h-5 w-5" /> Enviar mensagem
          </Button>

          <p className="contact-secure">
            <LockKeyhole className="h-4 w-4" />
            Seus dados estão protegidos e não serão compartilhados.
          </p>
        </form>
      </section>

      <section className="contact-trust-strip" aria-label="Garantias DA MAFIA IMPORTS">
        {trustItems.map(({ icon: Icon, label, title, text }) => (
          <TrustItem key={label} icon={<Icon />} label={label} title={title} text={text} />
        ))}
      </section>
    </main>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="contact-field">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function TrustItem({ icon, label, title, text }: { icon: React.ReactNode; label: string; title: string; text?: string }) {
  return (
    <div>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </div>
    </div>
  );
}
