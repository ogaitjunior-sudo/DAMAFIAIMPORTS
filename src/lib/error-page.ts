export const errorPageHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DA MAFIA IMPORTS</title>
    <style>
      :root { color-scheme: dark; --gold: #d7ad55; --bg: #050505; --cream: #fff7dd; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 20%, rgba(215,173,85,.16), transparent 22rem), #000; color: var(--cream); font-family: Inter, system-ui, sans-serif; }
      main { width: min(92vw, 560px); text-align: center; padding: 36px; border: 1px solid rgba(215,173,85,.25); border-radius: 18px; background: rgba(8,8,8,.78); box-shadow: 0 24px 80px rgba(0,0,0,.6); }
      img { width: 92px; height: 92px; object-fit: cover; border-radius: 999px; margin: 0 auto 18px; filter: drop-shadow(0 0 24px rgba(215,173,85,.28)); }
      h1 { margin: 0; font-size: clamp(2.2rem, 8vw, 4.2rem); line-height: .92; text-transform: uppercase; }
      p { color: rgba(255,247,221,.72); line-height: 1.7; }
      a { display: inline-flex; margin-top: 18px; min-height: 44px; align-items: center; justify-content: center; padding: 0 18px; color: #050505; background: linear-gradient(135deg, #fff0bd, #d7ad55); border-radius: 8px; font-weight: 900; text-decoration: none; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <main>
      <img src="/assets/da-mafia/logo-da-mafia-imports.svg?v=logo-oficial-20260604" alt="DA MAFIA IMPORTS" />
      <h1>DA MAFIA IMPORTS</h1>
      <p>A experiencia premium oscilou por alguns instantes. Recarregue ou volte para a colecao.</p>
      <a href="/loja">Ver colecao</a>
    </main>
  </body>
</html>`;

export function renderErrorPage() {
  return errorPageHtml;
}

