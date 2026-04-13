import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input } from "@brp/ui";
import { ApiError } from "../api/client.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { AuthLayout } from "../layouts/AuthLayout.tsx";

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password, businessName);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registrering mislykkedes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold text-slate-900">Opret konto</h1>
      <p className="mt-1 text-sm text-slate-500">Start din online butik</p>
      <form className="mt-6 space-y-4" onSubmit={(e) => void submit(e)}>
        <Input label="Virksomhedsnavn" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        <Input label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          label="Adgangskode"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Mindst 8 tegn"
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Opretter…" : "Opret konto"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Har du allerede en konto?{" "}
        <Link className="font-medium text-slate-900 underline" to="/login">
          Log ind
        </Link>
      </p>
    </AuthLayout>
  );
}
