import type { FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contato")({
  component: ContatoPage,
  head: () => ({ meta: [{ title: "Contato - DA MAFIA IMPORTS" }] }),
});

function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  const nome = String(data.get("nome") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const telefone = String(data.get("telefone") ?? "").trim();
  const mensagem = String(data.get("mensagem") ?? "").trim();

  const body = [
    `Nome: ${nome}`,
    `E-mail: ${email}`,
    telefone ? `Telefone: ${telefone}` : "",
    "",
    mensagem,
  ]
    .filter(Boolean)
    .join("\n");

  window.location.href = `mailto:damafiaimports@gmail.com?subject=${encodeURIComponent(
    "Contato DA MAFIA IMPORTS",
  )}&body=${encodeURIComponent(body)}`;
}

function ContatoPage() {
  return (
    <main className="contact-exact-page" aria-label="Contato DA MAFIA IMPORTS">
      <section className="contact-exact-stage">
        <img
          className="contact-exact-art"
          src="/assets/da-mafia/contact-exact-reference-20260605.png?v=contact-exact-20260605"
          alt="DA MAFIA IMPORTS - Entre em contato"
          draggable={false}
        />

        <form className="contact-exact-form" aria-label="Formulario de contato" onSubmit={handleContactSubmit}>
          <label className="sr-only" htmlFor="contact-name">
            Nome
          </label>
          <input
            id="contact-name"
            name="nome"
            className="contact-exact-input contact-exact-input--name"
            placeholder="Seu nome completo"
            autoComplete="name"
            required
          />

          <label className="sr-only" htmlFor="contact-email">
            E-mail
          </label>
          <input
            id="contact-email"
            name="email"
            className="contact-exact-input contact-exact-input--email"
            placeholder="Seu melhor e-mail"
            type="email"
            autoComplete="email"
            required
          />

          <label className="sr-only" htmlFor="contact-phone">
            Telefone
          </label>
          <input
            id="contact-phone"
            name="telefone"
            className="contact-exact-input contact-exact-input--phone"
            placeholder="Seu telefone (opcional)"
            autoComplete="tel"
          />

          <label className="sr-only" htmlFor="contact-message">
            Mensagem
          </label>
          <textarea
            id="contact-message"
            name="mensagem"
            className="contact-exact-textarea"
            placeholder="Como podemos te ajudar?"
            required
          />

          <button
            className="contact-exact-submit"
            type="submit"
            aria-label="Enviar mensagem"
            title="Enviar mensagem"
          >
            <span className="sr-only">Enviar mensagem</span>
          </button>
        </form>
      </section>

      <section className="contact-mobile-shell" aria-label="Contato DA MAFIA IMPORTS mobile">
        <div className="contact-mobile-exact-stage">
          <img
            className="contact-mobile-exact-art"
            src="/assets/da-mafia/contact-mobile-exact-reference-20260605.png?v=contact-mobile-exact-20260605"
            alt="DA MAFIA IMPORTS - Entre em contato"
            draggable={false}
          />

          <a className="contact-mobile-exact-home" href="/" aria-label="Ir para o inicio" />
          <details className="contact-mobile-exact-menu-wrap">
            <summary className="contact-mobile-exact-menu" aria-label="Menu">
              <span className="sr-only">Menu</span>
            </summary>
            <nav className="contact-mobile-exact-menu-panel" aria-label="Menu mobile">
              <a href="/">Inicio</a>
              <a href="/rifas">Rifas</a>
              <a href="/loja">Colecao</a>
              <a href="/contato">Contato</a>
            </nav>
          </details>

          <form className="contact-mobile-exact-form" aria-label="Formulario de contato mobile" onSubmit={handleContactSubmit}>
            <label className="sr-only" htmlFor="mobile-contact-name">
              Nome
            </label>
            <input
              id="mobile-contact-name"
              name="nome"
              className="contact-mobile-exact-field contact-mobile-exact-field--name"
              placeholder="Seu nome completo"
              autoComplete="name"
              required
            />

            <label className="sr-only" htmlFor="mobile-contact-email">
              E-mail
            </label>
            <input
              id="mobile-contact-email"
              name="email"
              className="contact-mobile-exact-field contact-mobile-exact-field--email"
              placeholder="Seu melhor e-mail"
              type="email"
              autoComplete="email"
              required
            />

            <label className="sr-only" htmlFor="mobile-contact-phone">
              Telefone
            </label>
            <input
              id="mobile-contact-phone"
              name="telefone"
              className="contact-mobile-exact-field contact-mobile-exact-field--phone"
              placeholder="Seu telefone (opcional)"
              autoComplete="tel"
            />

            <label className="sr-only" htmlFor="mobile-contact-message">
              Mensagem
            </label>
            <textarea
              id="mobile-contact-message"
              name="mensagem"
              className="contact-mobile-exact-field contact-mobile-exact-field--message"
              placeholder="Como podemos te ajudar?"
              required
            />

            <button className="contact-mobile-exact-submit" type="submit" aria-label="Enviar mensagem" title="Enviar mensagem">
              <span className="sr-only">Enviar mensagem</span>
            </button>
          </form>

          <a className="contact-mobile-exact-link contact-mobile-exact-link--whatsapp" href="https://wa.me/5521997701093" aria-label="Abrir WhatsApp" />
          <a className="contact-mobile-exact-link contact-mobile-exact-link--email" href="mailto:damafiaimports@gmail.com" aria-label="Enviar e-mail" />
          <a className="contact-mobile-exact-link contact-mobile-exact-link--instagram" href="https://www.instagram.com/damafiaimports" aria-label="Abrir Instagram" />
        </div>
      </section>
    </main>
  );
}
