import { createFileRoute } from "@tanstack/react-router";
import { Headphones, Instagram, LockKeyhole, Mail, MapPin, MessageCircle, Send, Settings, ShieldCheck } from "lucide-react";
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
    value: "22 99770-1093",
    detail: "Atendimento rápido e direto",
    href: "https://wa.me/5522997701093",
  },
  {
    icon: Mail,
    label: "E-mail",
    value: "contato@damafiaimports.com",
    detail: "Responderemos o mais breve possível",
    href: "mailto:contato@damafiaimports.com",
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
    value: "Salvador, BA",
    detail: "Atendemos todo o Brasil",
    href: "#",
  },
];

function ContatoPage() {
  return (
    <main className="contact-page">
      <div className="contact-page-glow" />

      <section className="contact-layout">
        <div className="contact-copy">
          <div className="contact-eyebrow">Fale com a gente</div>
          <h1>
            Entre em <span>Contato</span>
          </h1>
          <p>
            Estamos prontos para te atender! Tire dúvidas, faça sugestões ou fale sobre parcerias.
            <strong> Será um prazer conversar com você.</strong>
          </p>

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

          <a href={siteInfo.instagram.url} target="_blank" rel="noreferrer" className="contact-profile-card">
            <small>Perfil oficial</small>
            <h2>{siteInfo.instagram.name}</h2>
            <p>{siteInfo.instagram.bio}</p>
            <div>
              <span>
                <strong>{siteInfo.instagram.posts}</strong>
                Posts
              </span>
              <span>
                <strong>{siteInfo.instagram.followers}</strong>
                Seguidores
              </span>
              <span>
                <strong>{siteInfo.instagram.following}</strong>
                Seguindo
              </span>
            </div>
          </a>

          <a href="https://wa.me/5522997701093" target="_blank" rel="noreferrer" className="contact-whatsapp-cta">
            <MessageCircle />
            <span>
              <strong>Atendimento direto no WhatsApp</strong>
              Clique para conversar agora
            </span>
            <b>→</b>
          </a>
        </div>

        <form className="contact-form">
          <div className="contact-form-heading">
            <span>
              <MessageCircle />
            </span>
            <div>
              <h2>Envie sua mensagem</h2>
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

      <section className="contact-trust-strip">
        <TrustItem icon={<ShieldCheck />} title="Ambiente Seguro" text="Seus dados protegidos com criptografia avançada." />
        <TrustItem icon={<Settings />} title="Rifas Auditadas" text="Processo claro, suporte direto e acompanhamento transparente." />
        <TrustItem icon={<Headphones />} title="Atendimento Humanizado" text="Estamos sempre prontos para te atender da melhor forma." />
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

function TrustItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

