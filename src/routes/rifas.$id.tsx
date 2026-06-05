import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  Copy,
  Crown,
  Filter,
  Flame,
  Loader2,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { createRaffleOrder, getRaffleCheckout } from "@/lib/api";
import { publicErrorMessage } from "@/lib/client-errors";
import { galleryImages, imageFor } from "@/lib/gallery";
import { formatTicketList, formatTicketNumber } from "@/lib/raffle-numbers";
import { subscribeToRaffleNumberChanges } from "@/lib/realtime";
import type { ReservationMode, ReservedNumberInfo, SoldNumberInfo } from "@/lib/types";
import { formatBrazilianWhatsapp, readStoredWhatsapp, saveStoredWhatsapp } from "@/lib/whatsapp";

export const Route = createFileRoute("/rifas/$id")({
  loader: async ({ params }) => {
    try {
      return await getRaffleCheckout({ data: { id: params.id } });
    } catch (error) {
      console.error("Nao foi possivel carregar a rifa.", error);
      return { raffle: null, soldNumbers: [], soldNumberDetails: [], reservedNumbers: [], reservedNumberDetails: [], recentOrders: [], numberLoadError: true, user: null };
    }
  },
  component: RaffleDetail,
});

type CreatedOrder = Awaited<ReturnType<typeof createRaffleOrder>>["order"];
type FilterMode = "all" | "free" | "reserved" | "paid";
type NumberTooltipTone = "free" | "selected" | "reserved" | "paid";

const pageSize = 100;

function formatReservationCountdown(reservedUntil?: string | null) {
  if (!reservedUntil) return "";
  const remainingMs = new Date(reservedUntil).getTime() - Date.now();
  if (remainingMs <= 0) return "Reserva expirada";
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return `Reserva expira em ${hours}h ${String(minutes).padStart(2, "0")}min`;
  return `Reserva expira em ${minutes}min`;
}

function formatReservationTooltipTime(reservedUntil?: string | null) {
  if (!reservedUntil) return "";
  const remainingMs = new Date(reservedUntil).getTime() - Date.now();
  if (remainingMs <= 0) return "0h 00min";
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}

function formatReservationLimit(reservedUntil?: string | null) {
  if (!reservedUntil) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(reservedUntil));
}

function reservationModeFromOrder(order?: { reservationMode?: ReservationMode; reservedUntil?: string | null } | null): ReservationMode {
  return order?.reservationMode ?? (order?.reservedUntil ? "auto_24h" : "manual_admin");
}

function publicBuyerName(name?: string | null) {
  const cleanName = name?.trim();
  return cleanName || "Cliente não identificado";
}

function reservedNumberTooltipLines(info?: ReservedNumberInfo) {
  return [
    `Reservado por: ${publicBuyerName(info?.buyerName)}`,
    "Pagamento pendente",
    info?.reservedUntil ? `Expira em: ${formatReservationTooltipTime(info.reservedUntil)}` : "Aguardando decisão do ADM",
  ];
}

function soldNumberTooltipLines(info?: SoldNumberInfo) {
  return [
    `Comprado por: ${publicBuyerName(info?.buyerName)}`,
    "Pagamento confirmado",
  ];
}

function RaffleDetail() {
  const checkout = Route.useLoaderData();
  if (!checkout.raffle) return <RaffleNotFound />;

  const { raffle, soldNumbers, soldNumberDetails = [], reservedNumbers = [], reservedNumberDetails = [], recentOrders, numberLoadError = false, user } = checkout;
  const router = useRouter();
  const longPressTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const longPressTriggeredRef = useRef<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [manualMode, setManualMode] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buyer, setBuyer] = useState({
    name: user?.name ?? "",
    whatsapp: user?.phone ?? "",
    cpf: user?.cpf ?? "",
  });
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [localReservedDetails, setLocalReservedDetails] = useState<ReservedNumberInfo[]>([]);
  const [openNumberPopover, setOpenNumberPopover] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [, setNowTick] = useState(0);

  useEffect(() => {
    const storedWhatsapp = user?.phone || readStoredWhatsapp();
    if (!storedWhatsapp) return;

    setBuyer((current) => ({
      ...current,
      whatsapp: current.whatsapp ? formatBrazilianWhatsapp(current.whatsapp) : formatBrazilianWhatsapp(storedWhatsapp),
    }));
    saveStoredWhatsapp(storedWhatsapp);
  }, [user?.phone]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick((current) => current + 1);
      void router.invalidate().catch((refreshError) => {
        console.error("Nao foi possivel liberar reservas expiradas automaticamente.", refreshError);
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setOpenNumberPopover(null);
  }, [page, filter, search]);

  const clearNumberLongPress = () => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const openNumberDetails = (number: number) => {
    setOpenNumberPopover((current) => (current === number ? null : number));
  };

  const handleNumberPointerDown = (number: number, hasDetails: boolean, event: React.PointerEvent) => {
    if (!hasDetails || event.pointerType === "mouse") return;
    clearNumberLongPress();
    longPressTriggeredRef.current = null;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = number;
      setOpenNumberPopover(number);
    }, 420);
  };

  const handleNumberPointerEnd = () => {
    clearNumberLongPress();
  };

  const paidSet = useMemo(() => new Set(soldNumbers), [soldNumbers]);
  const paidInfoByNumber = useMemo(() => {
    const details = soldNumberDetails.length
      ? soldNumberDetails
      : soldNumbers.map((number) => ({
          number,
          buyerName: "Cliente não identificado",
          confirmedAt: null,
        }));
    return new Map(details.map((sale) => [sale.number, sale]));
  }, [soldNumberDetails, soldNumbers]);
  const allReservedDetails = useMemo(() => {
    const details = reservedNumberDetails.length
      ? reservedNumberDetails
      : reservedNumbers.map((number) => ({
          number,
          buyerName: "Cliente não identificado",
          reservedUntil: null,
          reservationMode: "manual_admin" as ReservationMode,
        }));
    return [...details, ...localReservedDetails];
  }, [reservedNumberDetails, reservedNumbers, localReservedDetails]);
  const reservedSet = useMemo(() => new Set(allReservedDetails.map((reservation) => reservation.number)), [allReservedDetails]);
  const reservedInfoByNumber = useMemo(() => new Map(allReservedDetails.map((reservation) => [reservation.number, reservation])), [allReservedDetails]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const paidCount = paidSet.size;
  const reservedCount = reservedSet.size;
  const freeCount = Math.max(0, raffle.totalNumbers - paidCount - reservedCount);
  const soldPercent = raffle.totalNumbers ? Math.round((paidCount / raffle.totalNumbers) * 100) : 0;
  const revenue = paidCount * raffle.pricePerNumber;
  const total = selected.length * raffle.pricePerNumber;
  const isActive = raffle.status === "ativa";
  const canUseNumbers = isActive && !numberLoadError;
  const canCreatePix = !loading && !createdOrder && canUseNumbers;

  useEffect(() => {
    setSelected((current) => {
      const availableSelection = current.filter((number) => !paidSet.has(number) && !reservedSet.has(number));
      return availableSelection.length === current.length ? current : availableSelection;
    });
  }, [paidSet, reservedSet]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;
    const unsubscribe = subscribeToRaffleNumberChanges(raffle.id, () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void router.invalidate().catch((refreshError) => {
          console.error("Nao foi possivel atualizar os numeros da rifa em tempo real.", refreshError);
        });
      }, 120);
    });

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [raffle.id, router]);

  const allNumbers = useMemo(() => Array.from({ length: raffle.totalNumbers }, (_, index) => index), [raffle.totalNumbers]);
  const displayDigits = 2;
  const filteredNumbers = allNumbers.filter((number) => {
    if (filter === "free" && (paidSet.has(number) || reservedSet.has(number))) return false;
    if (filter === "reserved" && !reservedSet.has(number)) return false;
    if (filter === "paid" && !paidSet.has(number)) return false;
    if (search.trim()) return formatTicketNumber(number, displayDigits).includes(search.trim());
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filteredNumbers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleNumbers = filteredNumbers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const freeNumbers = allNumbers.filter((number) => !paidSet.has(number) && !reservedSet.has(number) && !selectedSet.has(number));
  const canPay = canUseNumbers && selected.length > 0 && !loading;
  const gallery = useMemo(() => {
    const raffleImages = (raffle.images?.length ? raffle.images : [raffle.image]).map((image) => imageFor(image)).filter(Boolean);
    if (raffleImages.length) return [...new Set(raffleImages)];

    return [...new Set([galleryImages[6], galleryImages[10], galleryImages[1]].filter(Boolean))];
  }, [raffle.image, raffle.images]);

  const validatePixRequest = () => {
    const fullNameParts = buyer.name.trim().split(/\s+/).filter(Boolean);
    if (fullNameParts.length < 2) return "Informe seu nome completo.";
    if (buyer.whatsapp.replace(/\D/g, "").length < 10) return "Informe um WhatsApp válido com DDD.";
    if (!selected.length) return "Selecione pelo menos um número.";
    const unavailableNumber = selected.find((number) => paidSet.has(number) || reservedSet.has(number));
    if (unavailableNumber !== undefined) {
      return `Número ${formatTicketNumber(unavailableNumber, displayDigits)} indisponível. Escolha outro número.`;
    }
    return "";
  };

  const toggleNumber = (number: number) => {
    if (!canUseNumbers || paidSet.has(number) || reservedSet.has(number)) return;
    setOpenNumberPopover(null);
    setCreatedOrder(null);
    setError("");
    setSelected((current) =>
      current.includes(number)
        ? current.filter((item) => item !== number)
        : [...current, number].sort((a, b) => a - b),
    );
  };

  const autoSelect = (amount: number) => {
    if (!canUseNumbers) return;
    setCreatedOrder(null);
    setError("");
    const shuffled = [...freeNumbers].sort(() => Math.random() - 0.5).slice(0, amount);
    if (!shuffled.length) {
      setError("Não há números livres suficientes para essa seleção.");
      return;
    }
    setSelected((current) => [...new Set([...current, ...shuffled])].sort((a, b) => a - b));
  };

  const reserveSelectedNumbers = async () => {
    console.info("[Pagamento Pix] botão Gerar Pix clicado");
    const validationError = validatePixRequest();
    if (validationError) {
      console.warn("[Pagamento Pix] validação falhou", { validationError, buyer, selected });
      setError(validationError);
      setCheckoutOpen(true);
      return;
    }

    const payload = {
      raffleId: raffle.id,
      raffleTitle: raffle.title,
      buyerName: buyer.name,
      buyerWhatsapp: buyer.whatsapp,
      buyerCpf: buyer.cpf,
      numbers: selected,
    };
    console.info("[Pagamento Pix] dados enviados", payload);
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      const result = await createRaffleOrder({
        data: {
          raffleId: payload.raffleId,
          buyerName: payload.buyerName,
          buyerWhatsapp: payload.buyerWhatsapp,
          buyerCpf: payload.buyerCpf,
          numbers: payload.numbers,
        },
      });
      console.info("[Pagamento Pix] resposta Supabase", result);
      setCreatedOrder(result.order);
      setLocalReservedDetails(result.order.selectedNumbers.map((number) => ({
        number,
        buyerName: publicBuyerName(result.order.buyerName),
        reservedUntil: result.order.reservedUntil ?? null,
        reservationMode: reservationModeFromOrder(result.order),
      })));
      saveStoredWhatsapp(buyer.whatsapp);
      await router.invalidate();
      setCheckoutOpen(true);
      console.info("[Pagamento Pix] reserva criada", {
        orderId: result.order.id,
        numbers: result.order.selectedNumbers,
        reservedUntil: result.order.reservedUntil,
      });
    } catch (err) {
      console.error("[Pagamento Pix] erro real", err);
      const message = publicErrorMessage(err, "Não foi possível gerar o Pix. Tente novamente em instantes.");
      setError(message);
      console.warn("[Pagamento Pix] reserva falhou", { message });
    } finally {
      setLoading(false);
    }
  };

  const openCheckout = () => {
    setCheckoutOpen(true);
  };

  const createOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    await reserveSelectedNumbers();
  };

  const copyPix = async () => {
    if (!createdOrder) return;
    await navigator.clipboard.writeText(raffle.pixKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const whatsappMessage = createdOrder
    ? [
        "Ola, quero participar da rifa DA MAFIA IMPORTS.",
        "",
        `Rifa: ${raffle.title}`,
        `Nome: ${createdOrder.buyerName}`,
        `WhatsApp: ${createdOrder.buyerWhatsapp}`,
        `Números reservados: ${formatTicketList(createdOrder.selectedNumbers, displayDigits)}`,
        `Quantidade: ${createdOrder.selectedNumbers.length}`,
        `Valor total: R$ ${createdOrder.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        createdOrder.reservedUntil
          ? `Tempo limite de pagamento: ${formatReservationLimit(createdOrder.reservedUntil)}`
          : "Reserva: Aguardando decisão do ADM",
        `Pix: ${raffle.pixKey}`,
        `Pix copia e cola: ${createdOrder.pixCopyPaste}`,
        "",
        createdOrder.reservedUntil ? "Vou realizar o pagamento via Pix dentro do prazo." : "Vou realizar o pagamento via Pix e aguardar a decisão do ADM.",
        "Segue o comprovante nesta conversa.",
      ].join("\n")
    : "";
  const whatsappUrl = `https://wa.me/${raffle.adminWhatsapp}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="raffle-detail-premium">
      <div className="raffle-shell">
        <div className="raffle-top-row">
          <Button asChild variant="ghost" className="raffle-back-button">
            <Link to="/rifas">
              <ArrowLeft className="h-4 w-4" />
              Voltar para rifas
            </Link>
          </Button>

          <div className="raffle-metrics-strip">
            <Metric icon={Ticket} label="Total de números" value={String(raffle.totalNumbers)} />
            <Metric icon={Check} label="Disponíveis" value={String(freeCount)} tone="free" />
            <Metric icon={Clock3} label="Reservados" value={String(reservedCount)} />
            <Metric icon={Ticket} label="Vendidos" value={String(paidCount)} tone="paid" />
            <Metric icon={BarChart3} label="Porcentagem" value={`${soldPercent.toLocaleString("pt-BR")}%`} />
            <Metric icon={Wallet} label="Arrecadado" value={`R$ ${revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
          </div>
        </div>

        <section className="raffle-stage">
          <div className="raffle-gallery-panel">
            <span className="raffle-gallery-badge">
              <Crown className="h-4 w-4" />
              Premium
            </span>
            <button type="button" className="raffle-gallery-nav left" onClick={() => setActiveImage((current) => (current === 0 ? gallery.length - 1 : current - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <img src={gallery[activeImage]} alt={raffle.title} className="raffle-main-image" />
            <button type="button" className="raffle-gallery-nav right" onClick={() => setActiveImage((current) => (current + 1) % gallery.length)}>
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="raffle-thumbs">
              {gallery.map((src, index) => (
                <button key={src} type="button" className={activeImage === index ? "active" : ""} onClick={() => setActiveImage(index)}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          </div>

          <div className="raffle-buy-panel">
            <span className="raffle-status-pill">{isActive ? "Rifa ativa" : raffle.status}</span>
            <h1>{raffle.title}</h1>
            <p>{raffle.description}</p>

            <div className="raffle-feature-list">
              <span><Sparkles className="h-4 w-4" /> 100% Artesanal</span>
              <span><ShieldCheck className="h-4 w-4" /> Acabamento Premium</span>
              <span><Flame className="h-4 w-4" /> Edição Limitada</span>
            </div>

            <div className="raffle-progress-line">
              <div>
                <span>{soldPercent}% vendido</span>
                <strong>{paidCount}/{raffle.totalNumbers} vendidos · {reservedCount} reservados</strong>
              </div>
              <Progress value={soldPercent} className="h-2" />
            </div>

            <div className="raffle-choice-row">
              <div className="raffle-price-block">
                <span>Valor do número</span>
                <strong>R$ {raffle.pricePerNumber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              </div>
              <button type="button" className={manualMode ? "raffle-mode-button active" : "raffle-mode-button"} onClick={() => setManualMode(true)}>
                Escolher Manualmente
              </button>
              <button type="button" className={!manualMode ? "raffle-mode-button active" : "raffle-mode-button"} onClick={() => setManualMode(false)}>
                Escolher Aleatoriamente
              </button>
            </div>

            <div className="raffle-quick-buttons">
              {[5, 10, 50, 100].map((amount) => (
                <button key={amount} type="button" disabled={!canUseNumbers} onClick={() => autoSelect(amount)}>
                  <strong>+{amount} números</strong>
                  <span>R$ {(amount * raffle.pricePerNumber).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </button>
              ))}
            </div>

            <div className="selected-summary">
              <div>
                <p>Selecionados</p>
                <span>{selected.length ? formatTicketList(selected, displayDigits) : "0 números"}</span>
              </div>
              <div>
                <p>Total</p>
                <strong>R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="selected-summary-actions">
                <Button type="button" disabled={!canPay} onClick={openCheckout} className="bg-gradient-gold text-background font-semibold gold-shine">
                  Ir para pagamento
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
                <Button type="button" disabled={!canPay} onClick={openCheckout} variant="outline" className="border-gold/40 bg-background/30 font-semibold text-primary hover:bg-gold/10">
                  <Ticket className="h-4 w-4 mr-2" />
                  Reservar números
                </Button>
              </div>
            </div>

            {numberLoadError && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                Não foi possível confirmar a disponibilidade dos números agora. Recarregue em instantes antes de escolher.
              </p>
            )}
            {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          </div>
        </section>

        <section className="raffle-lower-grid">
          <div className={manualMode ? "number-section" : "number-section compact"}>
            <div className="number-section-header">
              <div>
                <p>Escolha manual dos números</p>
                <div className="number-legend">
                  <span className="free">Disponível</span>
                  <span className="selected">Selecionado</span>
                  <span className="reserved">Reservado</span>
                  <span className="paid">Vendido</span>
                </div>
              </div>
              <div className="number-tools">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar número..." className="pl-9" />
                </label>
                <label className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select value={filter} onChange={(event) => { setFilter(event.target.value as FilterMode); setPage(1); }} className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm">
                    <option value="all">Todos</option>
                    <option value="free">Livres</option>
                    <option value="reserved">Reservados</option>
                    <option value="paid">Vendidos</option>
                  </select>
                </label>
              </div>
            </div>

            {manualMode ? (
              <>
                <div className="number-grid">
                  {visibleNumbers.map((number) => {
                    const paid = paidSet.has(number);
                    const reserved = reservedSet.has(number);
                    const active = selectedSet.has(number);
                    const tooltipLines = paid
                      ? soldNumberTooltipLines(paidInfoByNumber.get(number))
                      : reserved
                        ? reservedNumberTooltipLines(reservedInfoByNumber.get(number))
                        : active
                          ? ["Selecionado por você"]
                          : [];
                    const statusLabel = tooltipLines.length ? tooltipLines.join("\n") : "Disponível";
                    const tooltipTone = paid ? "paid" : reserved ? "reserved" : active ? "selected" : "free";
                    const hasTooltipDetails = tooltipLines.length > 0;
                    return (
                      <span
                        key={number}
                        className="number-tooltip-anchor"
                        data-tooltip-open={openNumberPopover === number ? "true" : undefined}
                        data-tooltip-tone={tooltipTone}
                        title={hasTooltipDetails ? statusLabel : undefined}
                        tabIndex={hasTooltipDetails ? 0 : undefined}
                        onClick={(event) => {
                          if (!hasTooltipDetails || (!paid && !reserved)) return;
                          event.preventDefault();
                          event.stopPropagation();
                          openNumberDetails(number);
                        }}
                        onPointerDownCapture={(event) => handleNumberPointerDown(number, hasTooltipDetails, event)}
                        onPointerUpCapture={handleNumberPointerEnd}
                        onPointerCancel={handleNumberPointerEnd}
                        onPointerLeave={handleNumberPointerEnd}
                      >
                        <button
                          type="button"
                          disabled={paid || reserved || !canUseNumbers}
                          aria-pressed={active}
                          aria-label={`Número ${formatTicketNumber(number, displayDigits)} - ${statusLabel.replace(/\n/g, " - ")}`}
                          data-selected={active ? "true" : undefined}
                          title={hasTooltipDetails ? undefined : "Disponível"}
                          onClick={(event) => {
                            if (longPressTriggeredRef.current === number) {
                              event.preventDefault();
                              longPressTriggeredRef.current = null;
                              return;
                            }
                            toggleNumber(number);
                          }}
                          className={`number-cell ${paid ? "number-paid" : reserved ? "number-reserved" : active ? "number-selected" : "number-free"}`}
                        >
                          {formatTicketNumber(number, displayDigits)}
                        </button>
                        {hasTooltipDetails && <NumberTooltipCard lines={tooltipLines} tone={tooltipTone} />}
                      </span>
                    );
                  })}
                </div>

                <div className="number-footer">
                  <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
                  <p>Selecionados: <strong>{selected.length} números</strong></p>
                  <p>Total: <strong>R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></p>
                  <Button variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Próxima</Button>
                  <Button type="button" variant="ghost" disabled={!selected.length} onClick={() => setSelected([])} className="number-clear">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar seleção
                  </Button>
                </div>
              </>
            ) : (
              <div className="empty-state">Use os botões de escolha automática acima para selecionar apenas números livres.</div>
            )}
          </div>

          <aside className="raffle-side-panel">
            <div className="recent-buyers-card">
              <div className="side-card-header">
                <h2>Últimos compradores</h2>
                <span>{recentOrders.length || "Novo"}</span>
              </div>
              {recentOrders.length ? (
                recentOrders.map((order) => (
                  <article key={order.id}>
                    <span>{order.buyerName.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{order.buyerName}</strong>
                      <small>Comprou {order.selectedNumbers.length} números</small>
                      <em>{formatTicketList(order.selectedNumbers.slice(0, 6), displayDigits)}</em>
                    </div>
                    <b>R$ {order.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b>
                  </article>
                ))
              ) : (
                <p className="side-empty">Os compradores confirmados vão aparecer aqui assim que o admin aprovar os pagamentos.</p>
              )}
            </div>

            <div className="raffle-security-card">
              <ShieldCheck className="h-10 w-10" />
              <div>
                <h2>Compra 100% segura</h2>
                <p>Seus dados são protegidos e os números só ficam pagos após confirmação manual do admin.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-3xl border-gold/30 bg-card max-md:left-0 max-md:top-0 max-md:max-h-[100dvh] max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:overflow-y-auto max-md:overscroll-contain max-md:rounded-none max-md:p-4 max-md:pb-[calc(env(safe-area-inset-bottom)+2rem)] max-sm:p-3 max-sm:pb-[calc(env(safe-area-inset-bottom)+2.25rem)]">
          <DialogHeader className="max-md:pr-8 max-md:text-left">
            <DialogTitle className="font-display text-3xl max-md:text-2xl">Pagamento Pix</DialogTitle>
          </DialogHeader>

          <form onSubmit={createOrder} noValidate className="grid gap-5 lg:grid-cols-[1fr_0.95fr] max-md:flex max-md:min-h-0 max-md:flex-col max-md:gap-4">
            <div className="space-y-4 max-md:min-h-0">
              <div className="checkout-field">
                <Label htmlFor="buyerName">Nome completo</Label>
                <Input
                  id="buyerName"
                  value={buyer.name}
                  onChange={(event) => setBuyer((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2"
                  placeholder="Digite seu nome completo"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="checkout-field">
                <Label htmlFor="buyerWhatsapp">WhatsApp</Label>
                <Input
                  id="buyerWhatsapp"
                  value={buyer.whatsapp}
                  onChange={(event) => setBuyer((current) => ({ ...current, whatsapp: formatBrazilianWhatsapp(event.target.value) }))}
                  className="mt-2"
                  placeholder="(71) 92929-9927"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              </div>

              <div className="checkout-box">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Resumo</p>
                <p className="mt-2 text-sm">Números: <span className="text-primary">{formatTicketList(createdOrder?.selectedNumbers ?? selected, displayDigits)}</span></p>
                <p className="text-sm">Quantidade: {createdOrder?.selectedNumbers.length ?? selected.length}</p>
                <p className="font-display text-3xl text-gradient-gold">R$ {(createdOrder?.totalAmount ?? total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                {createdOrder?.reservedUntil && (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatReservationCountdown(createdOrder.reservedUntil)}
                  </p>
                )}
                {createdOrder && !createdOrder.reservedUntil && (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-primary">
                    <Clock3 className="h-3.5 w-3.5" />
                    Aguardando decisão do ADM
                  </p>
                )}
              </div>

              {!createdOrder && (
                <Button disabled={!canCreatePix} className="w-full bg-gradient-gold text-background font-semibold max-md:h-auto max-md:min-h-11 max-md:px-3 max-md:py-2 max-md:leading-snug max-md:whitespace-normal">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
                  Gerar Pix
                </Button>
              )}
              {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </div>

            <div className="checkout-box space-y-4 max-md:flex max-md:min-h-0 max-md:flex-col max-md:gap-3 max-md:space-y-0">
              <div className="max-md:order-2">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Chave Pix</p>
                <p className="mt-1 font-semibold text-primary">{raffle.pixKey}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Instituicao</p>
                <p className="mt-1 text-sm font-semibold">Mercado Pago</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Titular</p>
                <p className="mt-1 text-sm font-semibold">DA MAFIA IMPORTS</p>
              </div>

              {createdOrder ? (
                <>
                  <div className="max-md:order-1">
                    <PixQr value={createdOrder.pixCopyPaste} />
                  </div>
                  <div className="max-md:order-3">
                    <Label>Dados do pedido</Label>
                    <textarea readOnly value={createdOrder.pixCopyPaste} className="mt-2 min-h-24 w-full rounded-md border border-input bg-background p-3 text-xs max-md:min-h-20" />
                  </div>
                  <Button type="button" onClick={copyPix} variant="outline" className="w-full border-gold/40 max-md:order-5 max-md:h-auto max-md:min-h-11 max-md:px-3 max-md:py-2 max-md:leading-snug max-md:whitespace-normal">
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? "Chave Pix copiada!" : "Copiar chave Pix"}
                  </Button>
                  <Button asChild className="w-full bg-gradient-gold text-background font-semibold max-md:order-6 max-md:h-auto max-md:min-h-11 max-md:px-3 max-md:py-2 max-md:leading-snug max-md:whitespace-normal">
                    <a href={whatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Enviar comprovante pelo WhatsApp
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground max-md:order-4">
                    {reservationModeFromOrder(createdOrder) === "auto_24h"
                      ? "Os números ficam reservados por 24 horas e só viram PAGO quando o admin confirmar o pagamento no painel."
                      : "Os números ficam reservados até decisão do ADM e só viram PAGO quando o pagamento for confirmado no painel."}
                  </p>
                </>
              ) : (
                <div className="empty-state max-md:order-3 max-md:min-h-40">Preencha seus dados e gere o Pix para concluir pelo WhatsApp.</div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Ticket; label: string; value: string; tone?: "free" | "paid" }) {
  return (
    <div className={`raffle-metric ${tone ? `raffle-metric-${tone}` : ""}`}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NumberTooltipCard({ lines, tone }: { lines: string[]; tone: NumberTooltipTone }) {
  return (
    <span className="number-tooltip-card" role="tooltip" data-tone={tone}>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`} className={index === 0 ? "number-tooltip-title" : "number-tooltip-line"}>
          {line}
        </span>
      ))}
    </span>
  );
}

function PixQr({ value }: { value: string }) {
  const bits = Array.from({ length: 121 }, (_, index) => {
    const code = value.charCodeAt(index % value.length) + index * 17;
    return code % 3 === 0 || code % 7 === 0;
  });
  return (
    <div className="pix-qr" aria-label="QR Code Pix">
      {bits.map((active, index) => (
        <span key={index} className={active ? "active" : ""} />
      ))}
    </div>
  );
}

function RaffleNotFound() {
  return (
    <div className="raffle-detail-premium">
      <div className="raffle-shell">
        <div className="mx-auto flex min-h-[58vh] max-w-2xl flex-col items-center justify-center text-center">
          <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold shadow-[0_0_32px_rgba(245,177,42,0.22)]">
            <Ticket className="h-8 w-8" />
          </span>
          <p className="raffles-eyebrow">Rifa nao encontrada</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-cream md:text-6xl">
            Essa rifa nao esta disponivel
          </h1>
          <p className="mt-4 max-w-xl text-cream/70">
            O link pode ter sido removido, encerrado ou o banco local esta sem esse registro. Volte para a lista e escolha uma rifa ativa.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-gradient-gold text-background font-semibold gold-shine">
              <Link to="/rifas">
                Ver rifas ativas
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-gold/35 text-cream hover:bg-gold/10">
              <Link to="/">Voltar ao inicio</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


