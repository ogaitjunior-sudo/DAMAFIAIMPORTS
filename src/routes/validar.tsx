import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Info,
  LockKeyhole,
  Search,
  Shield,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateRaffleTicket } from "@/lib/api";
import { publicErrorMessage } from "@/lib/client-errors";
import { formatTicketList } from "@/lib/raffle-numbers";

export const Route = createFileRoute("/validar")({
  component: ValidarPage,
  head: () => ({ meta: [{ title: "Validar Rifa - DA MAFIA IMPORTS" }] }),
});

type Result =
  | null
  | { ok: false; message: string }
  | {
      ok: true;
      participant: string;
      email?: string;
      phone?: string;
      cpf?: string;
      raffle: string;
      numbers: number[];
      paid: boolean;
      status: string;
      date: string;
      code: string;
    };

function ValidarPage() {
  const [code, setCode] = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [identity, setIdentity] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const validation = await validateRaffleTicket({ data: { code, identity } });
      setResult(
        validation
          ? { ok: true, ...validation }
          : { ok: false, message: "Código não encontrado ou dados do participante não conferem." },
      );
    } catch (error) {
      setResult({
        ok: false,
        message: publicErrorMessage(error, "Não foi possível validar este código."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="validate-page">
      <div className="validate-page-lines" />

      <section className="validate-hero">
        <div className="validate-lock-badge">
          <ShieldCheck className="h-9 w-9" />
        </div>
        <h1>
          Validar <span className="text-gradient-gold">Rifa</span>
        </h1>
        <p>Consulte os dados da sua rifa para conferir participante, numeros, status e data.</p>
        <div className="validate-title-divider" />
      </section>

      <form onSubmit={onSubmit} className="validate-form">
        <ValidationInput
          id="code"
          label="Código da Validação"
          icon={<Shield className="h-5 w-5" />}
          placeholder="Ex: DMF-20260518-AB12CD34"
          value={code}
          onChange={(value) => setCode(value.toUpperCase())}
          required
        />

        <ValidationInput
          id="drawDate"
          label="Data do Sorteio"
          icon={<CalendarDays className="h-5 w-5" />}
          placeholder="DD / MM / AAAA"
          value={drawDate}
          onChange={setDrawDate}
        />

        <ValidationInput
          id="identity"
          label="CPF, Telefone ou E-mail (opcional)"
          icon={<User className="h-5 w-5" />}
          placeholder="Digite para filtrar (opcional)"
          value={identity}
          onChange={setIdentity}
        />

        <Button type="submit" size="lg" disabled={loading} className="validate-submit gold-shine">
          <ShieldCheck className="h-5 w-5" /> {loading ? "Validando..." : "Validar Rifa"}
        </Button>
      </form>

      {result?.ok && (
        <div className="validate-result validate-result-ok animate-fade-up">
          <div className="validate-result-title">
            <Check className="h-5 w-5" />
            <span>Rifa validada com sucesso</span>
          </div>
          <dl className="validate-result-grid">
            <Field label="Participante" value={result.participant} />
            <Field label="Números" value={formatTicketList(result.numbers)} />
            <Field label="Status" value={result.status} highlight={result.paid} />
            <Field label="Data da compra" value={result.date} />
            <Field label="Rifa" value={result.raffle} />
            <Field label="Código" value={result.code} />
            <Field label="E-mail" value={result.email ?? ""} />
            <Field label="WhatsApp" value={result.phone ?? ""} />
            <Field label="CPF" value={result.cpf ?? ""} />
          </dl>
        </div>
      )}

      {result && !result.ok && (
        <div className="validate-result validate-result-error animate-fade-up">
          <X className="h-5 w-5 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}

      <section className="validate-trust-strip">
        <TrustItem icon={<ShieldCheck />} title="Consulta 100% Segura" text="Seus dados estão protegidos com total segurança." />
        <TrustItem icon={<Search />} title="Transparência Total" text="Acompanhamento completo e confiavel da sua rifa." />
        <TrustItem icon={<BadgeCheck />} title="Rifas Auditadas" text="Todas as rifas seguem processo transparente e acompanhamento seguro." />
      </section>

      <div className="validate-secure-note">
        <span />
        <LockKeyhole className="h-4 w-4" />
        Ambiente seguro e criptografado
        <span />
      </div>
    </main>
  );
}

function ValidationInput({
  id,
  label,
  icon,
  placeholder,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="validate-field">
      <Label htmlFor={id}>
        {label}
        <Info className="h-4 w-4" />
      </Label>
      <div className="validate-input-shell">
        <span>{icon}</span>
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={highlight ? "is-highlighted" : undefined}>{value || "-"}</dd>
    </div>
  );
}

function TrustItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <span className="validate-trust-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

