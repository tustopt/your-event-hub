import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) void navigate({ to: "/explorar" });
    });
    return () => { active = false; };
  }, [navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === "signup" && !result.data.session) {
      setMessage("Conta criada. Verifique o seu email para confirmar o acesso.");
      return;
    }
    await navigate({ to: "/explorar" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <Link to="/" className="text-xl font-semibold tracking-tight">Docu<span className="text-muted-foreground">Events</span></Link>
        <h1 className="mt-8 text-2xl font-semibold">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{mode === "login" ? "Entre para explorar a agenda e o catálogo documental." : "Crie uma conta para começar a guardar a sua descoberta documental."}</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium">Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 outline-none" /></label>
          <label className="block text-sm font-medium">Palavra-passe<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5 outline-none" /></label>
          {message && <p className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "A processar..." : mode === "login" ? "Entrar" : "Criar conta"}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} className="mt-5 text-sm font-medium hover:underline">{mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}</button>
      </section>
    </main>
  );
}
