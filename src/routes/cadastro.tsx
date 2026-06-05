import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAndLogin } from "@/lib/api";
import { publicErrorMessage } from "@/lib/client-errors";
import { formatBrazilianWhatsapp, saveStoredWhatsapp } from "@/lib/whatsapp";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
  head: () => ({ meta: [{ title: "Criar Conta - DA MAFIA IMPORTS" }] }),
});

function CadastroPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await registerAndLogin({ data: form });
      saveStoredWhatsapp(user.phone || form.phone);
      window.dispatchEvent(new CustomEvent("lsb-auth-changed", { detail: { user } }));
      await navigate({ to: "/rifas" });
    } catch (err) {
      console.error("Nao foi possivel criar a conta.", err);
      setError(publicErrorMessage(err, "Nao foi possivel criar a conta. Tente novamente em instantes."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="text-center mb-8">
        <Logo size="lg" />
      </div>

      <form onSubmit={onSubmit} className="p-8 rounded-2xl bg-card border border-border/60 shadow-elegant space-y-4">
        <div className="text-center space-y-1 mb-2">
          <h1 className="font-display text-3xl">Criar sua conta</h1>
          <p className="text-sm text-muted-foreground">Participe das rifas e acompanhe tudo</p>
        </div>

        <div>
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            className="mt-2"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">WhatsApp</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(event) => setField("phone", formatBrazilianWhatsapp(event.target.value))}
            className="mt-2"
            autoComplete="tel"
            inputMode="tel"
            required
          />
        </div>

        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(event) => setField("password", event.target.value)}
            className="mt-2"
            autoComplete="new-password"
            required
          />
        </div>

        {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={loading} className="w-full bg-gradient-gold text-background font-semibold gold-shine">
          <UserPlus className="h-4 w-4 mr-2" /> {loading ? "Criando..." : "Criar conta"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Ja tem conta?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}

