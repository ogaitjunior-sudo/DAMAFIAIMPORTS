export const adminRealtimeEventName = "lsb-admin-data-changed";
export const adminRealtimeChannelName = "lsb-admin-live";

type ImportMetaWithEnv = ImportMeta & {
  env?: Record<string, string | undefined>;
};

function cleanEnvValue(value: string | undefined) {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function getBrowserSupabaseConfig() {
  const env = ((import.meta as ImportMetaWithEnv).env ?? {}) as Record<string, string | undefined>;
  const url = cleanEnvValue(env.VITE_SUPABASE_URL || env.SUPABASE_URL).replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  const anonKey = cleanEnvValue(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY);
  return url && anonKey ? { url, anonKey } : null;
}

type RealtimeCallback = () => void;

type RealtimeSubscription = {
  callbacks: Set<RealtimeCallback>;
  channelName: string;
  disposed: boolean;
  remove?: () => void;
};

const realtimeSubscriptions = new Map<string, RealtimeSubscription>();
let browserSupabaseClientPromise: Promise<any> | null = null;

function getBrowserSupabaseClient(config: { url: string; anonKey: string }) {
  if (!browserSupabaseClientPromise) {
    browserSupabaseClientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) =>
        createClient(config.url, config.anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }),
      )
      .catch((error) => {
        browserSupabaseClientPromise = null;
        throw error;
      });
  }

  return browserSupabaseClientPromise;
}

function subscribeToTableChanges(options: { key: string; channelName: string; table: string; filter?: string }, onChange: RealtimeCallback) {
  if (typeof window === "undefined") return () => {};

  const config = getBrowserSupabaseConfig();
  if (!config) return () => {};

  const existing = realtimeSubscriptions.get(options.key);
  if (existing && !existing.disposed) {
    existing.callbacks.add(onChange);
    return () => releaseRealtimeSubscription(options.key, onChange);
  }
  if (existing?.disposed) realtimeSubscriptions.delete(options.key);

  const subscription: RealtimeSubscription = {
    callbacks: new Set([onChange]),
    channelName: options.channelName,
    disposed: false,
  };
  realtimeSubscriptions.set(options.key, subscription);

  void getBrowserSupabaseClient(config)
    .then((supabase) => {
      if (subscription.disposed) return;

      const postgresConfig = {
        event: "*",
        schema: "public",
        table: options.table,
        ...(options.filter ? { filter: options.filter } : {}),
      };

      const channel = supabase
        .channel(options.channelName)
        .on("postgres_changes", postgresConfig, () => {
          [...subscription.callbacks].forEach((callback) => {
            try {
              callback();
            } catch (error) {
              console.error(`Erro ao processar atualizacao de ${options.table} em tempo real.`, error);
            }
          });
        })
        .subscribe((status: string, error?: unknown) => {
          if (error || status === "CHANNEL_ERROR") {
            console.error(`Nao foi possivel ouvir atualizacoes de ${options.table} em tempo real.`, error ?? status);
          }
        });

      subscription.remove = () => {
        subscription.remove = undefined;
        void supabase.removeChannel(channel).catch((error: unknown) => {
          console.error(`Nao foi possivel encerrar atualizacoes de ${options.table} em tempo real.`, error);
        });
      };
    })
    .catch((error) => {
      if (realtimeSubscriptions.get(options.key) === subscription) {
        realtimeSubscriptions.delete(options.key);
      }
      console.error(`Nao foi possivel iniciar atualizacoes de ${options.table} em tempo real.`, error);
    });

  return () => releaseRealtimeSubscription(options.key, onChange);
}

function releaseRealtimeSubscription(key: string, onChange: RealtimeCallback) {
  const subscription = realtimeSubscriptions.get(key);
  if (!subscription) return;

  subscription.callbacks.delete(onChange);
  if (subscription.callbacks.size) return;

  subscription.disposed = true;
  subscription.remove?.();
  realtimeSubscriptions.delete(key);
}

export function announceAdminDataChange() {
  if (typeof window === "undefined") return;

  const payload = "changed";
  window.dispatchEvent(new CustomEvent(adminRealtimeEventName, { detail: payload }));

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(adminRealtimeChannelName);
    channel.postMessage(payload);
    channel.close();
  }
}

export function subscribeToRafflesChanges(onChange: () => void) {
  return subscribeToTableChanges(
    {
      key: "public:raffles",
      channelName: "raffles-list",
      table: "raffles",
    },
    onChange,
  );
}

export function subscribeToRaffleNumberChanges(raffleId: string, onChange: () => void) {
  if (!raffleId) return () => {};

  return subscribeToTableChanges(
    {
      key: `public:raffle_number_reservations:${raffleId}`,
      channelName: `raffle-number-reservations:${raffleId}`,
      table: "raffle_number_reservations",
      filter: `raffle_id=eq.${raffleId}`,
    },
    onChange,
  );
}
