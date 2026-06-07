import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Box,
  CalendarDays,
  CheckCircle2,
  CircleCheckBig,
  Clock3,
  ClipboardCheck,
  Copy,
  FileText,
  Home,
  LayoutGrid,
  type LucideIcon,
  MessageCircle,
  PackageCheck,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Truck,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, getMyNumbers } from "@/lib/api";
import { publicErrorMessage } from "@/lib/client-errors";
import { imageFor } from "@/lib/gallery";
import { formatTicketList, formatTicketNumber } from "@/lib/raffle-numbers";
import {
  formatBrazilianWhatsapp,
  isValidBrazilianWhatsapp,
  readStoredWhatsapp,
  saveStoredWhatsapp,
  whatsappDigits,
} from "@/lib/whatsapp";

export const Route = createFileRoute("/meus-numeros")({
  component: MyNumbersPage,
  head: () => ({ meta: [{ title: "Meus Pedidos - DA MAFIA IMPORTS" }] }),
});

type MyNumbersEntry = {
  id: string;
  raffleId: string;
  raffleTitle: string;
  raffleImage: string;
  raffleDrawDate: string;
  adminWhatsapp: string;
  buyerName: string;
  buyerWhatsapp: string;
  numbers: number[];
  totalAmount: number;
  status: "pending" | "paid" | "canceled";
  createdAt: string;
  paidAt: string | null;
  validationCode: string | null;
  pixCopyPaste: string;
};

type FilterMode = "all" | "paid" | "pending" | "finished";
type DisplayStatus = "pending" | "paid" | "confirmed" | "canceled";

const filters: Array<{ value: FilterMode; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "paid", label: "Pagas" },
  { value: "pending", label: "Pendentes" },
  { value: "finished", label: "Finalizadas" },
];

const statusCopy: Record<DisplayStatus, { label: string; className: string; icon: LucideIcon }> = {
  pending: { label: "Pendente", className: "my-status-pending", icon: Wallet },
  paid: { label: "Pago", className: "my-status-paid", icon: CheckCircle2 },
  confirmed: { label: "Confirmado", className: "my-status-confirmed", icon: ClipboardCheck },
  canceled: { label: "Cancelado", className: "my-status-canceled", icon: XCircle },
};

function MyNumbersPage() {
  const [whatsapp, setWhatsapp] = useState("");
  const [draftWhatsapp, setDraftWhatsapp] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [entries, setEntries] = useState<MyNumbersEntry[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const loadEntries = async (phone: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await getMyNumbers({ data: { whatsapp: phone } });
      setEntries(result as MyNumbersEntry[]);
    } catch (err) {
      setError(publicErrorMessage(err, "Nao foi possivel carregar seus numeros. Tente novamente em instantes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      const user = await getCurrentUser().catch(() => null);
      const storedWhatsapp = user?.phone || readStoredWhatsapp();
      if (!active) return;

      if (isValidBrazilianWhatsapp(storedWhatsapp)) {
        const formatted = formatBrazilianWhatsapp(storedWhatsapp);
        setWhatsapp(formatted);
        setDraftWhatsapp(formatted);
        saveStoredWhatsapp(formatted);
        await loadEntries(formatted);
      } else {
        setModalOpen(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const status = getDisplayStatus(entry);
      const matchesFilter =
        filter === "all" ||
        (filter === "paid" && (status === "paid" || status === "confirmed")) ||
        (filter === "pending" && status === "pending") ||
        (filter === "finished" && (status === "confirmed" || status === "canceled"));

      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      return (
        entry.raffleTitle.toLowerCase().includes(normalizedQuery) ||
        entry.numbers.some((number) => formatTicketNumber(number).includes(normalizedQuery)) ||
        (entry.validationCode?.toLowerCase().includes(normalizedQuery) ?? false)
      );
    });
  }, [entries, filter, query]);

  const stats = useMemo(() => {
    const paidEntries = entries.filter((entry) => getDisplayStatus(entry) === "paid" || getDisplayStatus(entry) === "confirmed");
    return {
      raffles: new Set(entries.map((entry) => entry.raffleId)).size,
      numbers: entries.reduce((sum, entry) => sum + entry.numbers.length, 0),
      pending: entries.filter((entry) => getDisplayStatus(entry) === "pending").length,
      total: paidEntries.reduce((sum, entry) => sum + entry.totalAmount, 0),
    };
  }, [entries]);

  const mobileOrderStats = useMemo(
    () => ({
      total: entries.length,
      processing: entries.filter((entry) => getDisplayStatus(entry) === "paid").length,
      delivered: entries.filter((entry) => getDisplayStatus(entry) === "confirmed").length,
      pending: entries.filter((entry) => getDisplayStatus(entry) === "pending").length,
    }),
    [entries],
  );

  const submitWhatsapp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidBrazilianWhatsapp(draftWhatsapp)) {
      setError("Informe um WhatsApp valido com DDD.");
      return;
    }

    const formatted = formatBrazilianWhatsapp(draftWhatsapp);
    setWhatsapp(formatted);
    saveStoredWhatsapp(formatted);
    setModalOpen(false);
    void loadEntries(formatted);
  };

  const copyCode = async (entry: MyNumbersEntry) => {
    const value = entry.validationCode || entry.pixCopyPaste || formatTicketList(entry.numbers);
    await navigator.clipboard.writeText(value);
    setCopiedId(entry.id);
    window.setTimeout(() => setCopiedId(""), 1800);
  };

  return (
    <div className="my-numbers-page">
      <section className="mobile-orders-page" aria-label="Meus pedidos">
        <div className="mobile-orders-heading">
          <Box aria-hidden="true" />
          <div>
            <h1>
              Meus <span>Pedidos</span>
            </h1>
            <p>
              Acompanhe todas as suas compras em <span>tempo real.</span>
            </p>
          </div>
        </div>

        <div className="mobile-orders-stats" aria-label="Resumo dos pedidos">
          <MobileOrderStat icon={ShoppingBag} value={mobileOrderStats.total} label="Pedidos totais" />
          <MobileOrderStat icon={Truck} value={mobileOrderStats.processing} label="Em analise" />
          <MobileOrderStat icon={CircleCheckBig} value={mobileOrderStats.delivered} label="Confirmados" />
          <MobileOrderStat icon={Clock3} value={mobileOrderStats.pending} label="Pendentes" />
        </div>

        <div className="mobile-orders-tools">
          <button type="button" onClick={() => setModalOpen(true)}>
            <Phone aria-hidden="true" />
            {whatsapp ? whatsapp : "Informar WhatsApp"}
          </button>
          <label>
            <Search aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido" />
          </label>
        </div>

        {loading ? (
          <div className="mobile-orders-list">
            <div className="mobile-order-card mobile-order-card--loading" />
            <div className="mobile-order-card mobile-order-card--loading" />
          </div>
        ) : error ? (
          <div className="mobile-orders-empty">{error}</div>
        ) : filteredEntries.length ? (
          <div className="mobile-orders-list">
            {filteredEntries.map((entry, index) => (
              <MobileOrderCard
                key={entry.id}
                entry={entry}
                featured={index === 0}
                copied={copiedId === entry.id}
                onCopy={() => copyCode(entry)}
              />
            ))}
          </div>
        ) : (
          <div className="mobile-orders-empty">
            <PackageCheck aria-hidden="true" />
            <strong>Nenhum pedido encontrado</strong>
            <span>Informe seu WhatsApp para localizar suas compras.</span>
          </div>
        )}

        {filteredEntries[0] ? <MobileOrderTimeline entry={filteredEntries[0]} /> : null}

        <nav className="mobile-orders-bottom-nav" aria-label="Navegacao principal">
          <Link to="/">
            <Home aria-hidden="true" />
            <span>Inicio</span>
          </Link>
          <Link to="/loja">
            <LayoutGrid aria-hidden="true" />
            <span>Produtos</span>
          </Link>
          <Link to="/rifas">
            <Ticket aria-hidden="true" />
            <span>Rifas</span>
          </Link>
          <Link to="/meus-numeros" className="is-active">
            <Box aria-hidden="true" />
            <span>Pedidos</span>
          </Link>
          <Link to="/login">
            <UserRound aria-hidden="true" />
            <span>Perfil</span>
          </Link>
        </nav>
      </section>

      <div className="my-numbers-shell">
        <section className="my-numbers-hero">
          <div>
            <span className="my-numbers-kicker">
              <Ticket className="h-4 w-4" />
              Area do participante
            </span>
            <h1 className="my-numbers-title">
              Meus
              <span>Numeros</span>
            </h1>
            <p>Acompanhe todas as rifas em que voce participa, confira pagamentos, codigos de validacao e numeros reservados.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" onClick={() => setModalOpen(true)} className="bg-gradient-gold text-background font-semibold gold-shine">
                <Phone className="h-4 w-4 mr-2" />
                {whatsapp ? "Trocar WhatsApp" : "Informar WhatsApp"}
              </Button>
              <Button asChild variant="outline" className="border-gold/35 text-cream hover:bg-gold/10">
                <Link to="/validar">Validar Compra</Link>
              </Button>
            </div>
          </div>

          <div className="my-numbers-hero-panel">
            <div className="my-numbers-stat">
              <span>WhatsApp cadastrado</span>
              <strong>{whatsapp || "Obrigatorio"}</strong>
            </div>
            <div className="my-numbers-stat">
              <span>Rifas ativas</span>
              <strong>{stats.raffles}</strong>
            </div>
            <div className="my-numbers-stat">
              <span>Numeros comprados</span>
              <strong>{stats.numbers}</strong>
            </div>
            <div className="my-numbers-stat">
              <span>Pagamentos pendentes</span>
              <strong>{stats.pending}</strong>
            </div>
            <div className="my-numbers-stat">
              <span>Valor confirmado</span>
              <strong>{formatMoney(stats.total)}</strong>
            </div>
          </div>
        </section>

        <section className="my-numbers-toolbar">
          <label className="my-numbers-search">
            <Search className="h-4 w-4" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar rifa" />
          </label>
          <div className="my-numbers-filters">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                className={filter === item.value ? "my-numbers-filter active" : "my-numbers-filter"}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="my-numbers-grid">
            {[1, 2, 3].map((item) => (
              <div key={item} className="my-numbers-card min-h-80 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="my-empty">{error}</div>
        ) : filteredEntries.length ? (
          <div className="my-numbers-grid">
            {filteredEntries.map((entry) => (
              <MyNumbersCard key={entry.id} entry={entry} copied={copiedId === entry.id} onCopy={() => copyCode(entry)} />
            ))}
          </div>
        ) : (
          <div className="my-empty">
            <Ticket className="mx-auto mb-3 h-10 w-10 text-primary" />
            Nenhuma participacao encontrada para este WhatsApp.
          </div>
        )}

        <section className="my-numbers-security">
          <div>
            <ShieldCheck className="h-8 w-8" />
            <span>Compra segura</span>
          </div>
          <div>
            <ClipboardCheck className="h-8 w-8" />
            <span>Rifas auditadas</span>
          </div>
          <div>
            <CheckCircle2 className="h-8 w-8" />
            <span>Participacao confirmada</span>
          </div>
        </section>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => (whatsapp ? setModalOpen(open) : setModalOpen(true))}>
        <DialogContent className="max-w-md border-gold/35 bg-card">
          <div className="whatsapp-gate-card">
            <DialogHeader>
              <div className="whatsapp-gate-icon">
                <MessageCircle className="h-7 w-7" />
              </div>
              <DialogTitle className="text-center font-display text-3xl">Informe seu WhatsApp</DialogTitle>
              <p className="text-center text-sm text-muted-foreground">
                Utilizamos seu numero para localizar suas rifas, pagamentos e numeros reservados.
              </p>
            </DialogHeader>
            <form onSubmit={submitWhatsapp} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="myWhatsapp">WhatsApp</Label>
                <Input
                  id="myWhatsapp"
                  type="tel"
                  inputMode="tel"
                  value={draftWhatsapp}
                  onChange={(event) => setDraftWhatsapp(formatBrazilianWhatsapp(event.target.value))}
                  placeholder="(71) 92929-9927"
                  className="mt-2"
                  autoComplete="tel"
                  required
                />
              </div>
              <Button className="w-full bg-gradient-gold text-background font-semibold gold-shine">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Continuar
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MobileOrderStat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <article>
      <Icon aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function MobileOrderCard({
  entry,
  featured,
  copied,
  onCopy,
}: {
  entry: MyNumbersEntry;
  featured: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  const status = getDisplayStatus(entry);
  const meta = mobileOrderStatus(status);
  const StatusIcon = meta.icon;
  const code = entry.validationCode || entry.id.slice(-6).toUpperCase();

  return (
    <article className={featured ? "mobile-order-card is-featured" : "mobile-order-card"}>
      <header>
        <div className="mobile-order-id">
          <Box aria-hidden="true" />
          <strong>
            Pedido <span>#{code}</span>
          </strong>
        </div>
        <span className={`mobile-order-status ${meta.className}`}>
          <StatusIcon aria-hidden="true" />
          {meta.label}
        </span>
      </header>

      <div className="mobile-order-meta">
        <span>
          <CalendarDays aria-hidden="true" />
          {formatDate(entry.createdAt)}
        </span>
        <i />
        <span>
          <Wallet aria-hidden="true" />
          {formatMoney(entry.totalAmount)}
        </span>
      </div>

      {featured ? <MobileOrderProgress status={status} /> : null}

      <div className="mobile-order-actions">
        <button type="button" onClick={onCopy}>
          <FileText aria-hidden="true" />
          {copied ? "Copiado" : featured ? "Ver detalhes" : "Ver pedido"}
        </button>
        <Link to={status === "pending" ? "/validar" : "/rifas"} className={featured ? "is-primary" : ""}>
          {featured ? <Search aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
          {featured ? "Validar pedido" : "Comprar novamente"}
        </Link>
      </div>
    </article>
  );
}

function MobileOrderProgress({ status }: { status: DisplayStatus }) {
  const activeStep = status === "pending" ? 1 : status === "paid" ? 3 : status === "confirmed" ? 4 : 0;
  const steps = ["Pedido confirmado", "Pagamento", "Numeros reservados", "Confirmado"];

  return (
    <div className="mobile-order-progress" style={{ "--mobile-order-progress": `${(activeStep / (steps.length - 1)) * 100}%` } as CSSProperties}>
      {steps.map((step, index) => (
        <span key={step} className={index <= activeStep ? "is-complete" : ""}>
          <b>{index < activeStep ? <CheckCircle2 aria-hidden="true" /> : index === activeStep ? <Ticket aria-hidden="true" /> : null}</b>
          <small>{step}</small>
        </span>
      ))}
    </div>
  );
}

function MobileOrderTimeline({ entry }: { entry: MyNumbersEntry }) {
  const status = getDisplayStatus(entry);
  const code = entry.validationCode || entry.id.slice(-6).toUpperCase();
  const events = [
    { title: "Pedido recebido", detail: "Recebemos sua compra com sucesso.", done: true },
    { title: "Pagamento aprovado", detail: "Seu pagamento foi identificado.", done: status !== "pending" },
    { title: "Numeros reservados", detail: `${entry.numbers.length} numero(s) vinculados ao pedido.`, done: status === "paid" || status === "confirmed" },
    { title: "Compra confirmada", detail: "Seu codigo de validacao esta disponivel.", done: status === "confirmed" },
  ];

  return (
    <section className="mobile-order-timeline" aria-label={`Acompanhamento do pedido ${code}`}>
      <h2>
        <Clock3 aria-hidden="true" />
        Acompanhamento do pedido <span>#{code}</span>
      </h2>
      <div>
        {events.map((event, index) => (
          <article key={event.title} className={event.done ? "is-complete" : ""}>
            <time>{formatTimelineDate(entry, index)}</time>
            <b />
            <p>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function mobileOrderStatus(status: DisplayStatus): { label: string; className: string; icon: LucideIcon } {
  if (status === "pending") return { label: "Pendente", className: "is-pending", icon: Clock3 };
  if (status === "confirmed") return { label: "Confirmado", className: "is-confirmed", icon: CircleCheckBig };
  if (status === "canceled") return { label: "Cancelado", className: "is-canceled", icon: XCircle };
  return { label: "Em analise", className: "is-processing", icon: Truck };
}

function formatTimelineDate(entry: MyNumbersEntry, offset: number) {
  const date = new Date(entry.createdAt);
  date.setMinutes(date.getMinutes() + offset * 15);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function MyNumbersCard({ entry, copied, onCopy }: { entry: MyNumbersEntry; copied: boolean; onCopy: () => void }) {
  const status = getDisplayStatus(entry);
  const meta = statusCopy[status];
  const StatusIcon = meta.icon;

  return (
    <article className="my-numbers-card">
      <img src={imageFor(entry.raffleImage)} alt={entry.raffleTitle} className="my-numbers-card-image" />
      <div className="my-numbers-card-body">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2>{entry.raffleTitle}</h2>
          <span className={`my-numbers-status ${meta.className}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
        </div>

        <div className="grid gap-2 text-sm text-cream/70 sm:grid-cols-2">
          <span>Data: {formatDate(entry.raffleDrawDate || entry.createdAt)}</span>
          <span>Quantidade: {entry.numbers.length}</span>
          <span>Valor: {formatMoney(entry.totalAmount)}</span>
          <span>Codigo: {entry.validationCode || "Pendente"}</span>
        </div>

        <div className="my-numbers-list">
          {entry.numbers.map((number) => (
            <span key={number} className="my-number-chip">
              {formatTicketNumber(number)}
            </span>
          ))}
        </div>

        <div className="my-numbers-actions">
          <Button type="button" variant="outline" className="border-gold/35" onClick={onCopy}>
            <Copy className="h-4 w-4 mr-2" />
            {copied ? "Copiado" : "Ver Comprovante"}
          </Button>
          <Button asChild variant="outline" className="border-gold/35">
            <Link to="/validar">Validar Compra</Link>
          </Button>
          <Button asChild variant="outline" className="border-gold/35">
            <a href={buildWhatsappLink(entry, "grupo")} target="_blank" rel="noreferrer">
              Entrar no Grupo
            </a>
          </Button>
          <Button asChild className="bg-gradient-gold text-background font-semibold">
            <a href={buildWhatsappLink(entry, "suporte")} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar no WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}

function getDisplayStatus(entry: MyNumbersEntry): DisplayStatus {
  if (entry.status === "canceled") return "canceled";
  if (entry.status === "pending") return "pending";
  return entry.validationCode ? "confirmed" : "paid";
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function buildWhatsappLink(entry: MyNumbersEntry, intent: "grupo" | "suporte") {
  const admin = whatsappDigits(entry.adminWhatsapp);
  const phone = admin.startsWith("55") ? admin : `55${admin}`;
  const message = [
    intent === "grupo" ? "Ola, quero entrar no grupo da rifa DA MAFIA." : "Ola, preciso falar sobre minha rifa DA MAFIA.",
    "",
    `Rifa: ${entry.raffleTitle}`,
    `Nome: ${entry.buyerName}`,
    `WhatsApp: ${entry.buyerWhatsapp}`,
    `Numeros: ${formatTicketList(entry.numbers)}`,
    entry.validationCode ? `Codigo: ${entry.validationCode}` : "Pagamento pendente de confirmacao.",
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

