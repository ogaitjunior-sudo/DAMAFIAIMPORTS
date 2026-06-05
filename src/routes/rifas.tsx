import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Medal, RefreshCw, ShieldCheck } from "lucide-react";
import { RaffleCard } from "@/components/RaffleCard";
import { getRaffles } from "@/lib/api";
import { publicErrorMessage } from "@/lib/client-errors";
import { subscribeToRafflesChanges } from "@/lib/realtime";
import type { Raffle } from "@/lib/types";

type RafflesLoaderData = {
  raffles: Raffle[];
  ok: boolean;
  error?: string;
};

let lastStableRaffles: Raffle[] = [];

function stableRaffles(current: Raffle[], incoming: Raffle[]) {
  if (incoming.length > 0) return incoming;
  return current.length > 0 ? current : incoming;
}

function rememberStableRaffles(raffles: Raffle[]) {
  if (raffles.length > 0 || lastStableRaffles.length === 0) {
    lastStableRaffles = raffles;
  }
}

export const Route = createFileRoute("/rifas")({
  loader: async (): Promise<RafflesLoaderData> => {
    try {
      const raffles = await getRaffles();
      const visibleRaffles = stableRaffles(lastStableRaffles, raffles);
      if (raffles.length === 0 && visibleRaffles.length > 0) {
        console.error("[/rifas] Supabase retornou lista vazia durante atualizacao; mantendo rifas ja carregadas na tela.");
      }
      rememberStableRaffles(visibleRaffles);
      return { raffles: visibleRaffles, ok: true };
    } catch (error) {
      console.error("[/rifas] Falha tecnica ao carregar a listagem de rifas.", error);
      return {
        raffles: lastStableRaffles,
        ok: false,
        error: publicErrorMessage(error, "Nao foi possivel atualizar as rifas agora."),
      };
    }
  },
  pendingComponent: RifasLoading,
  errorComponent: RifasError,
  component: RifasPage,
  head: () => ({ meta: [{ title: "Rifas - DA MAFIA IMPORTS" }] }),
});

function RaffleRetryButton({
  isRefreshing,
  onRetry,
}: {
  isRefreshing: boolean;
  onRetry: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={isRefreshing}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary transition hover:bg-gold/20 disabled:cursor-wait disabled:opacity-70"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      {isRefreshing ? "Atualizando" : "Tentar novamente"}
    </button>
  );
}

function RafflesRefreshStatus({
  error,
  isRefreshing,
  onRetry,
}: {
  error: string;
  isRefreshing: boolean;
  onRetry: () => void;
}) {
  if (!error && !isRefreshing) {
    return <p className="mt-4 min-h-5 text-sm text-primary/80" aria-live="polite" />;
  }

  return (
    <div
      className="mx-auto mt-4 flex max-w-2xl flex-col items-center justify-center gap-3 rounded-xl border border-gold/20 bg-background/50 px-4 py-3 text-sm text-cream/72 shadow-gold/10 backdrop-blur sm:flex-row"
      aria-live="polite"
    >
      <div className="text-center sm:text-left">
        <p className="font-semibold text-primary">
          {error ? "Nao foi possivel atualizar as rifas" : "Atualizando rifas..."}
        </p>
        {error ? (
          <p className="mt-1 text-xs leading-5 text-cream/65">
            Nao foi possivel concluir a atualizacao agora. Mantendo os cards ja carregados.
          </p>
        ) : null}
      </div>
      {error ? <RaffleRetryButton isRefreshing={isRefreshing} onRetry={onRetry} /> : null}
    </div>
  );
}

function EmptyRafflesState({
  hasError,
  isRefreshing,
  onRetry,
}: {
  hasError: boolean;
  isRefreshing: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gold/20 bg-card/50 p-8 text-center text-cream/72">
      <p className="font-semibold text-primary">
        {hasError ? "Nao foi possivel carregar as rifas" : isRefreshing ? "Atualizando rifas..." : "Nenhuma rifa disponivel no momento."}
      </p>
      {hasError ? (
        <>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cream/65">
            A conexao com o Supabase oscilou. Voce pode tentar carregar novamente.
          </p>
          <div className="mt-5">
            <RaffleRetryButton isRefreshing={isRefreshing} onRetry={onRetry} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function RifasError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cachedRaffles = lastStableRaffles;

  useEffect(() => {
    console.error("[/rifas] Erro inesperado interceptado pela rota de rifas.", error);
  }, [error]);

  const retry = useCallback(() => {
    setIsRefreshing(true);
    reset();
    void router
      .invalidate()
      .catch((retryError) => {
        console.error("[/rifas] Falha tecnica ao tentar recarregar a rota de rifas.", retryError);
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [reset, router]);

  return (
    <div className="raffles-page relative overflow-hidden">
      <div className="absolute inset-0 texture-noise opacity-25" />
      <div className="absolute inset-0 raffles-page-glow" />

      <div className="container relative mx-auto px-4 py-14 lg:px-8 lg:py-16">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="raffles-eyebrow">Rifas premium</p>
          <h1 className="font-display text-5xl leading-[0.95] text-cream lg:text-7xl">
            Participe das <span className="text-gradient-gold">Rifas</span>
          </h1>
          <p className="mt-4 text-base text-cream/72 lg:text-lg">
            Escolha sua rifa, reserve seus numeros e concorra a itens premium.
          </p>
          {cachedRaffles.length > 0 ? (
            <RafflesRefreshStatus error="Nao foi possivel atualizar as rifas agora." isRefreshing={isRefreshing} onRetry={retry} />
          ) : null}
        </div>

        {cachedRaffles.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {cachedRaffles.map((raffle, index) => (
              <RaffleCard key={raffle.id} raffle={raffle} featured={index === 0} index={index} />
            ))}
          </div>
        ) : (
          <EmptyRafflesState hasError isRefreshing={isRefreshing} onRetry={retry} />
        )}
      </div>
    </div>
  );
}

function RifasLoading() {
  const cachedRaffles = lastStableRaffles;

  return (
    <div className="raffles-page relative overflow-hidden">
      <div className="absolute inset-0 texture-noise opacity-25" />
      <div className="absolute inset-0 raffles-page-glow" />

      <div className="container relative mx-auto px-4 py-14 lg:px-8 lg:py-16">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="raffles-eyebrow">Rifas premium</p>
          <h1 className="font-display text-5xl leading-[0.95] text-cream lg:text-7xl">
            Participe das <span className="text-gradient-gold">Rifas</span>
          </h1>
          <p className="mt-4 text-base text-cream/72 lg:text-lg">
            Escolha sua rifa, reserve seus numeros e concorra a itens premium.
          </p>
          <p className="mt-4 min-h-5 text-sm text-primary/80" aria-live="polite">
            Atualizando rifas...
          </p>
        </div>

        {cachedRaffles.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {cachedRaffles.map((raffle, index) => (
              <RaffleCard key={raffle.id} raffle={raffle} featured={index === 0} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gold/20 bg-card/50 p-8 text-center text-cream/72">
            Atualizando rifas...
          </div>
        )}
      </div>
    </div>
  );
}

function RifasPage() {
  const loaderData = Route.useLoaderData();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routerIsLoading = useRouterState({ select: (state) => state.isLoading });
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const [raffles, setRaffles] = useState<Raffle[]>(() => loaderData.raffles);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(loaderData.ok ? "" : loaderData.error ?? "");
  const mountedRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const queuedRefreshRef = useRef(false);
  const refreshRequestRef = useRef(0);
  const recoveryAttemptedRef = useRef(false);
  const pageIsRefreshing = isRefreshing || routerIsLoading;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (loaderData.ok) {
      setRaffles((current) => {
        const nextRaffles = stableRaffles(current, loaderData.raffles);
        rememberStableRaffles(nextRaffles);
        return nextRaffles;
      });
      setRefreshError("");
      return;
    }

    console.error("[/rifas] Loader manteve a interface funcionando apos falha.", loaderData.error);
    setRefreshError(loaderData.error ?? "Nao foi possivel atualizar as rifas agora.");
  }, [loaderData]);

  const refreshRaffles = useCallback(async () => {
    if (refreshInFlightRef.current) {
      queuedRefreshRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    queuedRefreshRef.current = false;
    setIsRefreshing(true);

    try {
      do {
        queuedRefreshRef.current = false;
        try {
          const requestId = ++refreshRequestRef.current;
          const latestRaffles = await getRaffles();
          if (!mountedRef.current || requestId !== refreshRequestRef.current) return;
          setRaffles((current) => {
            const nextRaffles = stableRaffles(current, latestRaffles);
            if (latestRaffles.length === 0 && current.length > 0) {
              console.error("[/rifas] Atualizacao retornou lista vazia; mantendo rifas atuais ate a proxima leitura valida.");
            }
            rememberStableRaffles(nextRaffles);
            return nextRaffles;
          });
          setRefreshError("");
        } catch (error) {
          console.error("[/rifas] Falha tecnica ao atualizar rifas em segundo plano.", error);
          if (mountedRef.current) {
            setRefreshError(publicErrorMessage(error, "Nao foi possivel atualizar as rifas agora."));
          }
          break;
        }
      } while (queuedRefreshRef.current && mountedRef.current);
    } finally {
      refreshInFlightRef.current = false;
      if (mountedRef.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (normalizedPath !== "/rifas") return;

    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;

    const requestRefresh = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void refreshRaffles();
      }, 160);
    };

    const unsubscribe = subscribeToRafflesChanges(requestRefresh);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [normalizedPath, refreshRaffles]);

  useEffect(() => {
    if (normalizedPath !== "/rifas" || !refreshError || raffles.length > 0 || pageIsRefreshing || recoveryAttemptedRef.current) return;

    recoveryAttemptedRef.current = true;
    const timeoutId = window.setTimeout(() => {
      void refreshRaffles();
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedPath, refreshError, raffles.length, pageIsRefreshing, refreshRaffles]);

  if (normalizedPath !== "/rifas") {
    return <Outlet />;
  }

  return (
    <div className="raffles-page relative overflow-hidden">
      <div className="absolute inset-0 texture-noise opacity-25" />
      <div className="absolute inset-0 raffles-page-glow" />

      <div className="container relative mx-auto px-4 py-14 lg:px-8 lg:py-16">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="raffles-eyebrow">Rifas premium</p>
          <h1 className="font-display text-5xl leading-[0.95] text-cream lg:text-7xl">
            Participe das <span className="text-gradient-gold">Rifas</span>
          </h1>
          <p className="mt-4 text-base text-cream/72 lg:text-lg">
            Escolha sua rifa, reserve seus numeros e concorra a itens premium.
          </p>
          {raffles.length > 0 ? (
            <RafflesRefreshStatus error={refreshError} isRefreshing={pageIsRefreshing} onRetry={() => void refreshRaffles()} />
          ) : null}
        </div>

        {raffles.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {raffles.map((r, index) => (
              <RaffleCard key={r.id} raffle={r} featured={index === 0} index={index} />
            ))}
          </div>
        ) : (
          <EmptyRafflesState hasError={Boolean(refreshError)} isRefreshing={pageIsRefreshing} onRetry={() => void refreshRaffles()} />
        )}

        <div className="mt-12 grid gap-6 border-t border-gold/20 pt-8 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "100% segura", text: "Todas as rifas sao auditadas e realizadas com total transparencia." },
            { icon: Medal, title: "Rifas auditadas", text: "Sorteios acompanhados com processo claro e suporte direto." },
            { icon: Headphones, title: "Suporte premium", text: "Atendimento humanizado para tirar todas as suas dúvidas." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="raffle-trust-item">
              <div className="raffle-trust-icon">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

