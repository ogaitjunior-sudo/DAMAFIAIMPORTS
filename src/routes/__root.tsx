import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { siteInfo } from "@/lib/site-info";
import {
  adminRealtimeChannelName,
  adminRealtimeEventName,
} from "@/lib/realtime";

function BrandedFallback({
  title,
  message,
  primaryLabel,
  onPrimary,
}: {
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary?: () => void;
}) {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-cream">
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-6 flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-gold font-display text-2xl font-bold text-background shadow-gold">
            DM
          </span>
          <div className="text-left">
            <p className="font-display text-2xl leading-none text-primary">DA MAFIA</p>
            <p className="text-xs uppercase tracking-[0.32em] text-cream/70">Importado Premium</p>
          </div>
        </div>

        <h1 className="font-display text-4xl leading-tight md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-cream/70">{message}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {onPrimary ? (
            <button
              type="button"
              onClick={onPrimary}
              className="inline-flex h-11 items-center justify-center rounded-md bg-gradient-gold px-5 text-sm font-semibold text-background shadow-gold transition hover:brightness-110"
            >
              {primaryLabel}
            </button>
          ) : (
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-md bg-gradient-gold px-5 text-sm font-semibold text-background shadow-gold transition hover:brightness-110"
            >
              {primaryLabel}
            </a>
          )}
          <a
            href="/loja"
            className="inline-flex h-11 items-center justify-center rounded-md border border-gold/40 bg-background px-5 text-sm font-semibold text-cream transition hover:bg-gold/10"
          >
            Ver colecao
          </a>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <BrandedFallback
      title="Página não encontrada"
      message="O endereço acessado não está disponível. Você pode voltar para as rifas oficiais e continuar navegando normalmente."
      primaryLabel="Ir para o início"
    />
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <BrandedFallback
      title="Vamos recarregar esta página"
      message="A conexão com o site oscilou por alguns instantes. Recarregue para continuar ou acesse a lista de rifas oficiais."
      primaryLabel="Recarregar"
      onPrimary={() => {
        router.invalidate();
        reset();
      }}
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DA MAFIA IMPORTS - Rifas premium, importados e street luxury" },
      { name: "description", content: `${siteInfo.instagram.bio} Rifas oficiais, importados premium, perfumes, jerseys e acessorios exclusivos.` },
      { name: "author", content: "DA MAFIA IMPORTS" },
      { property: "og:title", content: "DA MAFIA IMPORTS" },
      { property: "og:description", content: `${siteInfo.instagram.name} ${siteInfo.instagram.handle} - ${siteInfo.instagram.bio}` },
      { property: "og:url", content: siteInfo.instagram.url },
      { property: "og:image", content: siteInfo.instagram.profileImage },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    let disposed = false;
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;

    const refreshSiteData = () => {
      if (disposed) return;
      if (timeoutId) window.clearTimeout(timeoutId);

      timeoutId = window.setTimeout(() => {
        void router.invalidate().catch((error) => {
          console.error("Nao foi possivel atualizar os dados automaticamente.", error);
        });
        void queryClient.invalidateQueries().catch((error) => {
          console.error("Nao foi possivel atualizar as consultas automaticamente.", error);
        });
      }, 120);
    };

    window.addEventListener(adminRealtimeEventName, refreshSiteData);

    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(adminRealtimeChannelName);
      channel.onmessage = refreshSiteData;
    }

    return () => {
      disposed = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener(adminRealtimeEventName, refreshSiteData);
      channel?.close();
    };
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </QueryClientProvider>
  );
}


