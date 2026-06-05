import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";
import { publicErrorMessage } from "@/lib/client-errors";
import { formatBrazilianWhatsapp, saveStoredWhatsapp } from "@/lib/whatsapp";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar - DA MAFIA IMPORTS" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login({ data: { email: identifier, password } });
      saveStoredWhatsapp(user.phone || identifier);
      window.dispatchEvent(new CustomEvent("lsb-auth-changed", { detail: { user } }));
      await navigate({ to: user.role === "admin" ? "/admin" : "/rifas" });
    } catch (err) {
      console.error("Nao foi possivel entrar.", err);
      setError(publicErrorMessage(err, "Nao foi possivel entrar. Tente novamente em instantes."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="text-center mb-8">
        <Logo size="lg" />
      </div>

      <form onSubmit={onSubmit} className="p-8 rounded-2xl bg-card border border-border/60 shadow-elegant space-y-5">
        <div className="text-center space-y-1">
          <h1 className="font-display text-3xl">Bem-vindo de volta</h1>
          <p className="text-sm text-muted-foreground">Acesse sua conta DA MAFIA</p>
        </div>

        <div>
          <Label htmlFor="identifier">WhatsApp</Label>
          <Input
            id="identifier"
            type="tel"
            inputMode="tel"
            value={identifier}
            onChange={(event) => setIdentifier(formatBrazilianWhatsapp(event.target.value))}
            className="mt-2"
            autoComplete="tel"
            required
          />
        </div>

        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2"
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={loading} className="w-full bg-gradient-gold text-background font-semibold gold-shine">
          <LogIn className="h-4 w-4 mr-2" /> {loading ? "Entrando..." : "Entrar"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Nao tem conta?{" "}
          <Link to="/cadastro" className="text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  );
}

