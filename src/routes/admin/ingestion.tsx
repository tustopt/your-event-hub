import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/ingestion")({
  component: AdminIngestion,
});

type Result = {
  source?: string;
  dryRun?: boolean;
  fetched?: number;
  processed?: number;
  persisted?: number;
  failed?: number;
  warnings?: string[];
  errors?: Array<{ index: number; sourceExternalId: string | null; message: string }>;
  error?: string;
};

function AdminIngestion() {
  const [sessionReady, setSessionReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [limit, setLimit] = useState("1");
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setSessionReady(true);
    });
  }, []);

  async function runIngestion() {
    setBusy(true);
    setResult(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setAuthenticated(false);
      setBusy(false);
      setResult({ error: "Sessão não autenticada." });
      return;
    }

    const response = await fetch("/api/admin/ingest/source/cinemateca_pt", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dryRun,
        limit: Number.parseInt(limit, 10),
      }),
    });

    const payload = (await response.json()) as Result;
    setResult(payload);
    setBusy(false);
  }

  if (!sessionReady) {
    return <main className="mx-auto max-w-3xl px-5 py-16">A verificar a sessão...</main>;
  }

  if (!authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-2xl font-semibold">Ingestão manual</h1>
        <p className="mt-3 text-muted-foreground">
          Entre na sua conta para executar uma ingestão manual.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Entrar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Administração</p>
          <h1 className="mt-1 text-2xl font-semibold">Ingestão manual</h1>
        </div>
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          Voltar
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Cinemateca Portuguesa</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Executa o adaptador de produção contra o programa completo da Cinemateca.
          O limite serve para o primeiro teste controlado.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Máximo de itens
            <input
              type="number"
              min="1"
              max="25"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2.5"
            />
          </label>

          <label className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
            />
            <span>
              <strong>Dry run</strong>
              <span className="block text-xs text-muted-foreground">
                Analisa sem gravar na base de dados.
              </span>
            </span>
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={runIngestion}
          className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "A executar..." : dryRun ? "Testar ingestão" : "Executar ingestão"}
        </button>
      </section>

      {result && (
        <section className="mt-6 rounded-2xl border bg-muted/30 p-6">
          <h2 className="font-semibold">Resultado</h2>
          <pre className="mt-4 overflow-auto text-xs leading-5">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
