import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Search, UserRound } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/explorar")({ component: Explore });
type ExploreEvent = { id: string; title: string; description: string | null; type: string; start_at: string | null; end_at: string | null; source_url: string | null; venues: { name: string; city: string | null } | null };

function Explore() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ExploreEvent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      if (!sessionData.session) { setAuthenticated(false); setLoading(false); return; }
      setAuthenticated(true);
      const { data, error: queryError } = await supabase.from("events").select("id,title,description,type,start_at,end_at,source_url,venues(name,city)").order("start_at", { ascending: true, nullsFirst: false }).limit(100);
      if (!active) return;
      if (queryError) setError(queryError.message); else setEvents((data ?? []) as ExploreEvent[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-PT");
    if (!term) return events;
    return events.filter((event) => [event.title, event.description, event.type, event.venues?.name, event.venues?.city].filter(Boolean).some((value) => value!.toLocaleLowerCase("pt-PT").includes(term)));
  }, [events, query]);

  async function signOut() { await supabase.auth.signOut(); await navigate({ to: "/" }); }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 lg:px-8">
        <Link to="/" className="shrink-0 text-xl font-semibold tracking-tight">Docu<span className="text-muted-foreground">Events</span></Link>
        <div className="relative hidden max-w-xl flex-1 md:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Pesquisar no catálogo" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar filmes, eventos, locais..." className="w-full rounded-lg border bg-muted/30 py-2 pl-9 pr-3 text-sm outline-none" /></div>
        <div className="ml-auto flex items-center gap-2"><button onClick={() => void signOut()} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Sair</button><UserRound className="size-5" /></div>
      </div></header>
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {!loading && !authenticated ? <section className="max-w-xl rounded-2xl border bg-card p-8"><h1 className="text-2xl font-semibold">Explore o DocuEvents</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">O catálogo e a agenda estão protegidos para utilizadores autenticados. Entre para consultar os dados reais do DocuEvents.</p><Link to="/login" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Entrar</Link></section> : <>
          <div><p className="text-sm font-medium text-muted-foreground">Explorar</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Agenda documental</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Eventos reais provenientes das fontes integradas no catálogo.</p></div>
          {error && <div className="mt-8 rounded-xl border p-4 text-sm text-muted-foreground">Não foi possível carregar a agenda: {error}</div>}
          {!loading && !error && filtered.length === 0 && <div className="mt-8 rounded-2xl border bg-card p-10 text-center"><CalendarDays className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 font-semibold">Ainda não há eventos para mostrar</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">A estrutura de catálogo está ligada ao Supabase. À medida que as fontes forem ingeridas, os eventos aparecerão aqui automaticamente.</p></div>}
          <div className="mt-8 grid gap-4 md:grid-cols-2">{filtered.map((event) => <article key={event.id} className="rounded-2xl border bg-card p-6"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{event.type}</p><h2 className="mt-2 text-lg font-semibold">{event.title}</h2>{event.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{event.description}</p>}<div className="mt-5 space-y-2 text-sm text-muted-foreground">{event.start_at && <div className="flex items-center gap-2"><CalendarDays className="size-4" />{new Date(event.start_at).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}</div>}{event.venues && <div className="flex items-center gap-2"><MapPin className="size-4" />{event.venues.name}{event.venues.city ? " · " + event.venues.city : ""}</div>}</div></article>)}</div>
        </>}
      </main>
    </div>
  );
}
