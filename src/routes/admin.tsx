import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { BarChart3, Calendar, CheckCircle2, Download, DollarSign, ImagePlus, PackagePlus, Plus, ShieldCheck, Ticket, Trash2, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cancelAdminOrder, confirmAdminOrder, createAdminProduct, createAdminRaffle, createAdminWinner, deleteAdminProduct, deleteAdminRaffle, deleteAdminWinner, getAdminDashboard, getCurrentUser, updateAdminRaffle, updateAdminRaffleStatus } from "@/lib/api";
import { publicErrorMessage } from "@/lib/client-errors";
import { imageFor } from "@/lib/gallery";
import { formatTicketList } from "@/lib/raffle-numbers";
import { announceAdminDataChange } from "@/lib/realtime";
import type { ProductCategory, RaffleStatus, ReservationMode } from "@/lib/types";

const productCategories: ProductCategory[] = ["Perfumes", "Jerseys", "Acessorios", "Sneakers", "Relogios", "Premium"];

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  loader: () => getAdminDashboard(),
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin - DA MAFIA IMPORTS" }] }),
});

function AdminPage() {
  const dashboard = Route.useLoaderData();
  const router = useRouter();
  const raffleFormRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    pricePerNumber: "10",
    totalNumbers: "100",
    drawDate: "",
    image: "gold",
    images: [] as string[],
    pixKey: "71992929927",
    adminWhatsapp: "5522997701093",
    reservationMode: "auto_24h" as ReservationMode,
    status: "ativa" as RaffleStatus,
  });
  const [productForm, setProductForm] = useState({
    name: "",
    category: "Perfumes" as ProductCategory,
    price: "120",
    stock: "1",
    description: "",
    image: "/assets/da-mafia/product-perfume-noir.svg",
  });
  const [winnerForm, setWinnerForm] = useState({
    title: "",
    description: "",
    winnerName: "",
    city: "Salvador, BA",
    date: "",
    image: "",
    video: "",
    status: "confirmado" as "confirmado" | "destaque",
  });
  const [imagePreview, setImagePreview] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [productImageInputKey, setProductImageInputKey] = useState(0);
  const [winnerImagePreview, setWinnerImagePreview] = useState("");
  const [winnerImageInputKey, setWinnerImageInputKey] = useState(0);
  const [winnerVideoInputKey, setWinnerVideoInputKey] = useState(0);
  const [editingRaffleId, setEditingRaffleId] = useState("");
  const [error, setError] = useState("");
  const [productError, setProductError] = useState("");
  const [winnerError, setWinnerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const reservationOrders = (dashboard.reservations?.length ? dashboard.reservations : dashboard.orders).filter((order) =>
    ["pending", "reserved", "confirmed", "cancelled", "canceled", "expired"].includes(order.status),
  );

  const setField = (field: Exclude<keyof typeof form, "images">, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setProductField = (field: keyof typeof productForm, value: string) => {
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const setWinnerField = (field: keyof typeof winnerForm, value: string) => {
    setWinnerForm((current) => ({ ...current, [field]: value }));
  };

  const openDatePicker = (input: HTMLInputElement) => {
    const dateInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof dateInput.showPicker !== "function") return;

    try {
      dateInput.showPicker();
    } catch {
      // Some browsers only allow showPicker during a direct pointer action.
    }
  };

  const reload = async () => {
    announceAdminDataChange();
    await router.invalidate();
  };

  const onImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Envie um arquivo de imagem válido.");
      return;
    }
    if (file.size > 2_500_000) {
      setError("A imagem precisa ter no máximo 2,5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result ?? "");
      setField("image", image);
      setImagePreview(image);
      setError("");
    };
    reader.onerror = () => setError("Não foi possível carregar a imagem.");
    reader.readAsDataURL(file);
  };

  const onProductImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProductError("Envie um arquivo de imagem valido.");
      input.value = "";
      return;
    }
    if (file.size > 2_500_000) {
      setProductError("A imagem precisa ter no maximo 2,5 MB.");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result ?? "");
      setProductField("image", image);
      setProductImagePreview(image);
      setProductError("");
      input.value = "";
    };
    reader.onerror = () => {
      setProductError("Nao foi possivel carregar a imagem.");
      input.value = "";
    };
    reader.readAsDataURL(file);
  };

  const onWinnerImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setWinnerError("Envie uma foto valida do vencedor.");
      return;
    }
    if (file.size > 2_500_000) {
      setWinnerError("A foto precisa ter no maximo 2,5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result ?? "");
      setWinnerField("image", image);
      setWinnerImagePreview(image);
      setWinnerError("");
    };
    reader.onerror = () => setWinnerError("Nao foi possivel carregar a foto.");
    reader.readAsDataURL(file);
  };

  const onWinnerVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setWinnerError("Envie um video valido em MP4 ou WebM.");
      return;
    }
    if (file.size > 15_000_000) {
      setWinnerError("O video precisa ter no maximo 15 MB para salvar no banco local.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setWinnerField("video", String(reader.result ?? ""));
      setWinnerError("");
    };
    reader.onerror = () => setWinnerError("Nao foi possivel carregar o video.");
    reader.readAsDataURL(file);
  };

  const onImagesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith("image/"))) {
      setError("Envie apenas arquivos de imagem validos.");
      return;
    }
    if (files.some((file) => file.size > 2_500_000)) {
      setError("Cada imagem precisa ter no maximo 2,5 MB.");
      return;
    }
    if (form.images.length + files.length > 12) {
      setError("Voce pode upar ate 12 fotos por rifa.");
      return;
    }

    try {
      const uploadedImages = await Promise.all(
        files.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result ?? ""));
              reader.onerror = () => reject(new Error("Nao foi possivel carregar uma das imagens."));
              reader.readAsDataURL(file);
            }),
        ),
      );
      setForm((current) => {
        const images = [...current.images, ...uploadedImages].slice(0, 12);
        return { ...current, images, image: images[0] || current.image };
      });
      setImagePreview(uploadedImages[0] ?? imagePreview);
      setError("");
    } catch (err) {
      setError(publicErrorMessage(err, "Nao foi possivel carregar as imagens."));
    }
  };

  const removeImage = (index: number) => {
    const removed = form.images[index];
    const images = form.images.filter((_, imageIndex) => imageIndex !== index);
    setForm((current) => ({ ...current, images, image: images[0] || "gold" }));
    if (imagePreview === removed || index === 0) {
      setImagePreview(images[0] ?? "");
    }
  };

  const clearImages = () => {
    setForm((current) => ({ ...current, image: "gold", images: [] }));
    setImagePreview("");
    setImageInputKey((current) => current + 1);
  };

  const resetRaffleForm = () => {
    setEditingRaffleId("");
    setForm({
      title: "",
      description: "",
      pricePerNumber: "10",
      totalNumbers: "100",
      drawDate: "",
      image: "gold",
      images: [],
      pixKey: "71992929927",
      adminWhatsapp: "5522997701093",
      reservationMode: "auto_24h",
      status: "ativa",
    });
    setImagePreview("");
    setImageInputKey((current) => current + 1);
  };

  const startEditRaffle = (raffle: (typeof dashboard.raffles)[number]) => {
    const images = (raffle.images?.length ? raffle.images : [raffle.image]).filter(Boolean);
    setEditingRaffleId(raffle.id);
    setForm({
      title: raffle.title,
      description: raffle.description,
      pricePerNumber: String(raffle.pricePerNumber),
      totalNumbers: String(raffle.totalNumbers),
      drawDate: raffle.drawDate,
      image: images[0] || raffle.image || "gold",
      images,
      pixKey: raffle.pixKey,
      adminWhatsapp: raffle.adminWhatsapp,
      reservationMode: raffle.reservationMode ?? "auto_24h",
      status: raffle.status,
    });
    setImagePreview(images[0] ?? "");
    setImageInputKey((current) => current + 1);
    setError("");
    window.setTimeout(() => raffleFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = {
        ...form,
        pricePerNumber: Number(form.pricePerNumber),
        totalNumbers: Number(form.totalNumbers),
      };

      if (editingRaffleId) {
        await updateAdminRaffle({ data: { id: editingRaffleId, ...data } });
      } else {
        await createAdminRaffle({ data });
      }
      resetRaffleForm();
      await reload();
    } catch (err) {
      setError(publicErrorMessage(err, "Nao foi possivel salvar a rifa."));
    } finally {
      setLoading(false);
    }
  };

  const onCreateProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setProductError("");
    setProductLoading(true);
    try {
      await createAdminProduct({
        data: {
          ...productForm,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
        },
      });
      setProductForm({
        name: "",
        category: "Importado Premiums",
        price: "120",
        stock: "1",
        description: "",
        image: "/assets/da-mafia/product-perfume-noir.svg",
      });
      setProductImagePreview("");
      setProductImageInputKey((current) => current + 1);
      await reload();
    } catch (err) {
      setProductError(publicErrorMessage(err, "Nao foi possivel criar o produto."));
    } finally {
      setProductLoading(false);
    }
  };

  const onCreateWinner = async (event: React.FormEvent) => {
    event.preventDefault();
    setWinnerError("");
    setWinnerLoading(true);
    try {
      await createAdminWinner({ data: winnerForm });
      setWinnerForm({
        title: "",
        description: "",
        winnerName: "",
        city: "Salvador, BA",
        date: "",
        image: "",
        video: "",
        status: "confirmado",
      });
      setWinnerImagePreview("");
      setWinnerImageInputKey((current) => current + 1);
      setWinnerVideoInputKey((current) => current + 1);
      await reload();
    } catch (err) {
      setWinnerError(publicErrorMessage(err, "Nao foi possivel publicar o vencedor."));
    } finally {
      setWinnerLoading(false);
    }
  };

  const changeStatus = async (id: string, status: RaffleStatus) => {
    await updateAdminRaffleStatus({ data: { id, status } });
    await reload();
  };

  const deleteRaffle = async (id: string, title: string) => {
    if (!window.confirm(`Excluir a rifa "${title}"? Esta acao tambem remove pedidos e bilhetes dessa rifa.`)) return;
    await deleteAdminRaffle({ data: { id } });
    await reload();
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Excluir o produto "${name}" da loja?`)) return;
    await deleteAdminProduct({ data: { id } });
    await reload();
  };

  const deleteWinner = async (id: string, title: string) => {
    if (!window.confirm(`Excluir o vencedor "${title}" da galeria?`)) return;
    await deleteAdminWinner({ data: { id } });
    await reload();
  };

  const confirmOrder = async (id: string) => {
    if (!window.confirm("Confirmar pagamento e marcar estes números como vendidos?")) return;
    await confirmAdminOrder({ data: { id } });
    await reload();
  };

  const cancelOrder = async (id: string) => {
    if (!window.confirm("Cancelar esta reserva e liberar os números?")) return;
    await cancelAdminOrder({ data: { id } });
    await reload();
  };

  const exportCsv = () => {
    const rows = [
      ["pedido", "rifa", "nome", "whatsapp", "cpf", "numeros", "valor", "status", "criado_em"],
      ...dashboard.orders.map((order) => [
        order.id,
        order.raffle,
        order.buyerName,
        order.buyerWhatsapp,
        order.buyerCpf,
        formatTicketList(order.selectedNumbers).replaceAll(", ", " "),
        String(order.totalAmount),
        order.status,
        order.createdAt,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "da-mafia-rifas.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 py-12 space-y-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">Painel administrativo</p>
          <h1 className="font-display text-4xl lg:text-5xl">Operação <span className="text-gradient-gold">DA MAFIA</span></h1>
        </div>
        <Button onClick={exportCsv} variant="outline" className="border-gold/40">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Stat icon={DollarSign} label="Arrecadado" value={`R$ ${dashboard.stats.revenue.toLocaleString("pt-BR")}`} />
        <Stat icon={Ticket} label="Rifas ativas" value={String(dashboard.stats.activeRaffles)} />
        <Stat icon={ShieldCheck} label="Números vendidos" value={String(dashboard.stats.paidNumbers)} />
        <Stat icon={BarChart3} label="Números livres" value={String(dashboard.stats.freeNumbers)} />
        <Stat icon={Users} label="Pendentes" value={String(dashboard.stats.pendingOrders)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <form ref={raffleFormRef} onSubmit={onCreate} className="rounded-2xl border border-border/60 bg-card p-6 shadow-elegant space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold text-background shadow-gold">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl">{editingRaffleId ? "Editar rifa" : "Nova rifa"}</h2>
              <p className="text-sm text-muted-foreground">{editingRaffleId ? "Altere os dados, fotos e status da campanha." : "Crie uma campanha ativa no banco de dados."}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={form.title} onChange={(event) => setField("title", event.target.value)} className="mt-2" required />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" value={form.description} onChange={(event) => setField("description", event.target.value)} className="mt-2" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Valor por número</Label>
              <Input id="price" type="number" min="1" value={form.pricePerNumber} onChange={(event) => setField("pricePerNumber", event.target.value)} className="mt-2" required />
            </div>
            <div>
              <Label htmlFor="total">Total de números</Label>
              <Input id="total" type="number" min="1" value={form.totalNumbers} onChange={(event) => setField("totalNumbers", event.target.value)} className="mt-2" required />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="drawDate">Data do sorteio</Label>
              <Input
                id="drawDate"
                type="date"
                value={form.drawDate}
                onClick={(event) => openDatePicker(event.currentTarget)}
                onChange={(event) => setField("drawDate", event.target.value)}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" value={form.status} onChange={(event) => setField("status", event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="ativa">Ativa</option>
                <option value="pausada">Pausada</option>
                <option value="encerrada">Encerrada</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="reservationMode">Configuração de reserva</Label>
            <select
              id="reservationMode"
              value={form.reservationMode}
              onChange={(event) => setField("reservationMode", event.target.value as ReservationMode)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="auto_24h">Reserva automática por 24 horas</option>
              <option value="manual_admin">Reserva manual até decisão do ADM</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="pixKey">Chave Pix</Label>
              <Input id="pixKey" value={form.pixKey} onChange={(event) => setField("pixKey", event.target.value)} className="mt-2" required />
            </div>
            <div>
              <Label htmlFor="adminWhatsapp">WhatsApp ADM</Label>
              <Input id="adminWhatsapp" value={form.adminWhatsapp} onChange={(event) => setField("adminWhatsapp", event.target.value)} className="mt-2" required />
            </div>
          </div>
          <div>
            <Label htmlFor="raffleImage">Imagem/banner da rifa</Label>
            <label htmlFor="raffleImage" className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-primary/50 bg-background/45 p-4 text-sm transition hover:border-primary hover:bg-primary/5">
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-gold text-background"><ImagePlus className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold">Upar foto do importado premium</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP até 2,5 MB.</span>
                </span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">Escolher</span>
            </label>
            <Input key={imageInputKey} id="raffleImage" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onImagesChange} className="sr-only" />
            <div className="mt-3 overflow-hidden rounded-xl border border-border/50 bg-background/35">
              <img src={imagePreview || form.images[0] || imageFor(form.image)} alt="Previa da imagem da rifa" className="h-44 w-full object-cover" />
            </div>
            {form.images.length > 0 && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{form.images.length} foto{form.images.length === 1 ? "" : "s"} selecionada{form.images.length === 1 ? "" : "s"}</span>
                  <button type="button" onClick={clearImages} className="font-semibold uppercase tracking-widest text-primary hover:text-gold-light">
                    Limpar fotos
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {form.images.map((image, index) => (
                    <div key={`${image.slice(0, 32)}-${index}`} className="relative overflow-hidden rounded-lg border border-gold/25 bg-background/40">
                      <button type="button" onClick={() => setImagePreview(image)} className="block h-20 w-full">
                        <img src={image} alt={`Foto ${index + 1} da rifa`} className="h-full w-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-destructive shadow"
                        aria-label={`Remover foto ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={loading} className="flex-1 bg-gradient-gold text-background font-semibold gold-shine">
              {loading ? (editingRaffleId ? "Salvando..." : "Criando...") : editingRaffleId ? "Salvar alterações" : "Criar rifa"}
            </Button>
            {editingRaffleId && (
              <Button type="button" variant="outline" onClick={resetRaffleForm} className="border-gold/40">
                Cancelar edição
              </Button>
            )}
          </div>
        </form>

        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-elegant">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl">Reservas e pagamentos</h2>
              <p className="text-sm text-muted-foreground">Reserva automática 24h ou manual ADM, sempre com confirmação no painel.</p>
            </div>
            <Calendar className="h-5 w-5 text-primary" />
          </div>

          <div className="space-y-3">
            {reservationOrders.length ? reservationOrders.map((order) => (
              <article key={order.id} className="rounded-xl border border-gold/25 bg-background/35 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-xl">{order.buyerName}</p>
                      <span className="rounded-full border border-gold/25 px-2 py-1 text-[10px] uppercase tracking-widest text-primary">
                        {adminReservationStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.raffle}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-primary">{adminReservationModeLabel(order)}</p>
                    <p className="mt-1 text-sm">Números: <span className="text-primary">{formatTicketList(order.selectedNumbers)}</span></p>
                    <p className="text-sm">WhatsApp: {order.buyerWhatsapp} | Total: R$ {order.totalAmount.toLocaleString("pt-BR")}</p>
                    {order.reservedUntil && (order.status === "pending" || order.status === "reserved") && (
                      <p className="text-xs text-muted-foreground">Reserva expira em {new Date(order.reservedUntil).toLocaleString("pt-BR")}</p>
                    )}
                    {!order.reservedUntil && (order.status === "pending" || order.status === "reserved") && (
                      <p className="text-xs text-muted-foreground">Aguardando decisão do ADM</p>
                    )}
                  </div>
                  {(order.status === "pending" || order.status === "reserved") && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={() => confirmOrder(order.id)} className="bg-gradient-gold text-background font-semibold">
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar pagamento
                    </Button>
                    <Button onClick={() => cancelOrder(order.id)} variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 mr-2" /> Cancelar reserva
                    </Button>
                  </div>
                  )}
                </div>
              </article>
            )) : (
              <div className="rounded-xl border border-border/50 bg-background/35 p-8 text-center text-muted-foreground">Nenhuma reserva registrada agora.</div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-elegant">
        <h2 className="font-display text-2xl mb-4">Produtos da loja</h2>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={onCreateProduct} className="rounded-xl border border-gold/20 bg-background/35 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-background shadow-gold">
                <PackagePlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl">Novo produto</h3>
                <p className="text-sm text-muted-foreground">Publique em qualquer secao da loja.</p>
              </div>
            </div>

            <div>
              <Label htmlFor="productName">Nome</Label>
              <Input id="productName" value={productForm.name} onChange={(event) => setProductField("name", event.target.value)} className="mt-2" required />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="productCategory">Secao</Label>
                <select
                  id="productCategory"
                  value={productForm.category}
                  onChange={(event) => setProductField("category", event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {productCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="productStock">Estoque</Label>
                <Input id="productStock" type="number" min="0" value={productForm.stock} onChange={(event) => setProductField("stock", event.target.value)} className="mt-2" required />
              </div>
            </div>
            <div>
              <Label htmlFor="productDescription">Descricao</Label>
              <Input id="productDescription" value={productForm.description} onChange={(event) => setProductField("description", event.target.value)} className="mt-2" required />
            </div>
            <div>
              <Label htmlFor="productPrice">Preco</Label>
              <Input id="productPrice" type="number" min="1" step="0.01" value={productForm.price} onChange={(event) => setProductField("price", event.target.value)} className="mt-2" required />
            </div>
            <div>
              <Label htmlFor="productImage">Imagem do produto</Label>
              <label htmlFor="productImage" className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-primary/50 bg-background/45 p-4 text-sm transition hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-gold text-background"><ImagePlus className="h-5 w-5" /></span>
                  <span>
                    <span className="block font-semibold">Upar foto do produto</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP ate 2,5 MB.</span>
                  </span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Escolher</span>
              </label>
              <Input key={productImageInputKey} id="productImage" type="file" accept="image/png,image/jpeg,image/webp" onChange={onProductImageChange} className="sr-only" />
              <div className="mt-3 grid min-h-36 place-items-center overflow-hidden rounded-xl border border-border/50 bg-background/35 p-2">
                <img src={productImagePreview || imageFor(productForm.image)} alt="Previa do produto" className="max-h-60 w-full object-contain" />
              </div>
            </div>
            {productError && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{productError}</p>}
            <Button disabled={productLoading} className="w-full bg-gradient-gold text-background font-semibold gold-shine">
              {productLoading ? "Publicando..." : "Publicar produto"}
            </Button>
          </form>

          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.products.map((product) => (
              <article key={product.id} className="rounded-xl border border-border/50 bg-background/35 p-3">
                <div className="flex gap-3">
                  <img src={imageFor(product.image)} alt={product.name} className="h-20 w-20 rounded-lg bg-background/40 object-contain p-1" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg">{product.name}</p>
                    <p className="text-xs uppercase tracking-widest text-primary">{product.category}</p>
                    <p className="text-sm text-muted-foreground">R$ {product.price.toLocaleString("pt-BR")} | {product.stock} em estoque</p>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => deleteProduct(product.id, product.name)} className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10" aria-label={`Excluir ${product.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-elegant">
        <h2 className="font-display text-2xl mb-4">Entregas</h2>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={onCreateWinner} className="rounded-xl border border-gold/20 bg-background/35 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-background shadow-gold">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl">Novo vencedor</h3>
                <p className="text-sm text-muted-foreground">Publique fotos e videos na aba Entregas.</p>
              </div>
            </div>

            <div>
              <Label htmlFor="winnerTitle">Titulo</Label>
              <Input id="winnerTitle" value={winnerForm.title} onChange={(event) => setWinnerField("title", event.target.value)} className="mt-2" required />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="winnerName">Nome do vencedor</Label>
                <Input id="winnerName" value={winnerForm.winnerName} onChange={(event) => setWinnerField("winnerName", event.target.value)} className="mt-2" required />
              </div>
              <div>
                <Label htmlFor="winnerCity">Cidade/UF</Label>
                <Input id="winnerCity" value={winnerForm.city} onChange={(event) => setWinnerField("city", event.target.value)} className="mt-2" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="winnerDate">Data da entrega</Label>
                <Input
                  id="winnerDate"
                  type="date"
                  value={winnerForm.date}
                  onClick={(event) => openDatePicker(event.currentTarget)}
                  onChange={(event) => setWinnerField("date", event.target.value)}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="winnerStatus">Status</Label>
                <select
                  id="winnerStatus"
                  value={winnerForm.status}
                  onChange={(event) => setWinnerField("status", event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="confirmado">Confirmado</option>
                  <option value="destaque">Destaque da pagina</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="winnerDescription">Descricao</Label>
              <Input id="winnerDescription" value={winnerForm.description} onChange={(event) => setWinnerField("description", event.target.value)} className="mt-2" required />
            </div>
            <div>
              <Label htmlFor="winnerImage">Foto do vencedor</Label>
              <label htmlFor="winnerImage" className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-primary/50 bg-background/45 p-4 text-sm transition hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-gold text-background"><ImagePlus className="h-5 w-5" /></span>
                  <span>
                    <span className="block font-semibold">Upar foto do vencedor</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP ate 2,5 MB.</span>
                  </span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Escolher</span>
              </label>
              <Input key={winnerImageInputKey} id="winnerImage" type="file" accept="image/png,image/jpeg,image/webp" onChange={onWinnerImageChange} className="sr-only" />
              {(winnerImagePreview || winnerForm.image) && (
                <div className="mt-3 overflow-hidden rounded-xl border border-border/50 bg-background/35">
                  <img src={winnerImagePreview || winnerForm.image} alt="Previa do vencedor" className="h-36 w-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="winnerVideo">Video da entrega (opcional)</Label>
              <label htmlFor="winnerVideo" className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-primary/35 bg-background/45 p-4 text-sm transition hover:border-primary hover:bg-primary/5">
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg border border-primary/35 text-primary"><Trophy className="h-5 w-5" /></span>
                  <span>
                    <span className="block font-semibold">Upar video da entrega</span>
                    <span className="text-xs text-muted-foreground">MP4 ou WEBM ate 15 MB.</span>
                  </span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Escolher</span>
              </label>
              <Input key={winnerVideoInputKey} id="winnerVideo" type="file" accept="video/mp4,video/webm" onChange={onWinnerVideoChange} className="sr-only" />
              {winnerForm.video && <p className="mt-2 text-xs text-primary">Video selecionado para a publicacao.</p>}
            </div>
            {winnerError && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{winnerError}</p>}
            <Button disabled={winnerLoading} className="w-full bg-gradient-gold text-background font-semibold gold-shine">
              {winnerLoading ? "Publicando..." : "Publicar vencedor"}
            </Button>
          </form>

          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.winners.map((winner) => (
              <article key={winner.id} className="rounded-xl border border-border/50 bg-background/35 p-3">
                <div className="flex gap-3">
                  <img src={winner.image} alt={winner.title} className="h-20 w-20 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg">{winner.title}</p>
                    <p className="text-xs uppercase tracking-widest text-primary">{winner.status === "destaque" ? "Destaque" : "Confirmado"}</p>
                    <p className="text-sm text-muted-foreground">{winner.winnerName} | {winner.city || "Brasil"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(`${winner.date}T12:00:00`).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={() => deleteWinner(winner.id, winner.title)} className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10" aria-label={`Excluir ${winner.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-elegant">
        <h2 className="font-display text-2xl mb-4">Rifas</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {dashboard.raffles.map((raffle) => (
            <article key={raffle.id} className="rounded-xl border border-border/50 bg-background/35 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-display text-lg">{raffle.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {raffle.soldNumbers}/{raffle.totalNumbers} vendidos - Sorteio {new Date(raffle.drawDate).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground">Pix: {raffle.pixKey} | ADM: {raffle.adminWhatsapp}</p>
                </div>
                <select
                  value={raffle.status}
                  onChange={(event) => {
                    if (event.target.value === "editar") {
                      startEditRaffle(raffle);
                      return;
                    }
                    if (event.target.value === "excluir") {
                      void deleteRaffle(raffle.id, raffle.title);
                      return;
                    }
                    void changeStatus(raffle.id, event.target.value as RaffleStatus);
                  }}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ativa">Ativa</option>
                  <option value="pausada">Pausada</option>
                  <option value="encerrada">Encerrada</option>
                  <option value="editar">Editar</option>
                  <option value="excluir">Excluir</option>
                </select>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-elegant">
        <h2 className="font-display text-2xl mb-4">Compradores confirmados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-3 pr-4">Código</th>
                <th className="py-3 pr-4">Participante</th>
                <th className="py-3 pr-4">Contato</th>
                <th className="py-3 pr-4">Rifa</th>
                <th className="py-3 pr-4">Números</th>
                <th className="py-3 pr-4">Pago em</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-border/30">
                  <td className="py-3 pr-4 font-medium text-primary">{ticket.code}</td>
                  <td className="py-3 pr-4">{ticket.participant}</td>
                  <td className="py-3 pr-4">{ticket.participantPhone}</td>
                  <td className="py-3 pr-4">{ticket.raffle}</td>
                  <td className="py-3 pr-4">{formatTicketList(ticket.numbers)}</td>
                  <td className="py-3 pr-4">{new Date(ticket.paidAt ?? ticket.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function adminReservationStatusLabel(status: string) {
  if (status === "pending" || status === "reserved") return "Reservado";
  if (status === "paid" || status === "confirmed") return "Confirmado";
  if (status === "canceled" || status === "cancelled") return "Cancelado";
  if (status === "expired") return "Expirado";
  return status;
}

function adminReservationModeLabel(order: { reservationMode?: ReservationMode; reservedUntil?: string | null }) {
  const mode = order.reservationMode ?? (order.reservedUntil ? "auto_24h" : "manual_admin");
  return mode === "manual_admin" ? "Reserva manual ADM" : "Reserva automática 24h";
}

function Stat({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-elegant">
      <Icon className="mb-4 h-5 w-5 text-primary" />
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl text-gradient-gold">{value}</p>
    </div>
  );
}

