import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Clapperboard, ExternalLink, MapPin, UserRound } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/filmes/$id")({ component: FilmDetail });

type Film = {
  id: string; title: string; original_title: string | null; year: number | null;
  duration_minutes: number | null; synopsis: string | null; poster_url: string | null;
  trailer_url: string | null; source_url?: string | null;
};
type PersonCredit = { role: string; person: { id: string; name: string; photo_url: string | null } | null };
type Screening = { id: string; start_at: string; end_at: string | null; ticket_url: string | null; venue: { name: string; city: string | null } | null };

function FilmDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [film, setFilm] = useState<Film | null>(null);
  const [credits, setCredits] = useState<PersonCredit[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { await navigate({ to: "/login" }); return; }

      const [filmResult, creditResult] = await Promise.all([
        supabase.from("films").select("id,title,original_title,year,duration_minutes,synopsis,poster_url,trailer_url").eq("id", id).maybeSingle(),
        supabase.from("film_people").select("role,person:people(id,name,photo_url)").eq("film_id", id).order("role"),
      ]);
      if (!active) return;
      if (filmResult.error || creditResult.error) {
        setError((filmResult.error || creditResult.error)!.message);
        setLoading(false);
        return;
      }
      if (!filmResult.data) {
        setError("Documentário não encontrado.");
        setLoading(false);
        return;
      }
      setFilm(filmResult.data);
      setCredits((creditResult.data ?? []) as PersonCredit[]);

      const { data: links, error: linkError } = await supabase.from("screening_films").select("screening_id").eq("film_id", id);
      if (linkError) { setError(linkError.message); setLoading(false); return; }
      const ids = (links ?? []).map((item) => item.screening_id);
      if (ids.length) {
        const { data: rows, error: screeningError } = await supabase.from("screenings").select("id,start_at,end_at,ticket_url,venue:venues(name,city)").in("id", ids).gte("start_at", new Date().toISOString()).order("start_at").limit(50);
        if (screeningError) setError(screeningError.message);
        else setScreenings(((rows ?? []) as Screening[]).filter((row) => new Date(row.start_at).getTime() >= Date.now()));
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [id, navigate]);

  if (loading) return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">A carregar…</main>;
  if (error || !film) return <main className="mx-auto max-w-3xl px-5 py-12"><Link to="/explorar" className="text-sm hover:underline">← Voltar</Link><div className="mt-8 rounded-2xl border p-8"><h1 className="text-xl font-semibold">{error || "Documentário não encontrado"}</h1></div></main>;

  const directors = credits.filter((credit) => credit.role.toLowerCase().includes("director") || credit.role.toLowerCase().includes("realizador"));
  const otherCredits = credits.filter((credit) => !directors.includes(credit));

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b"><div className="mx-auto flex h-16 max-w-7xl items-center px-5 lg:px-8">
      <Link to="/explorar" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Explorar</Link>
      <Link to="/" className="ml-auto text-xl font-semibold tracking-tight">Docu<span className="text-muted-foreground">Events</span></Link>
    </div></header>
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-[280px_1fr]">
        <div>{film.poster_url ? <img src={film.poster_url} alt={film.title} className="w-full rounded-2xl border object-cover shadow-sm" /> : <div className="flex aspect-[2/3] items-center justify-center rounded-2xl border bg-muted"><Clapperboard className="size-14 text-muted-foreground" /></div>}</div>
        <div className="max-w-3xl"><p className="text-sm font-medium text-muted-foreground">Documentário</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">{film.title}</h1>{film.original_title && film.original_title !== film.title && <p className="mt-2 text-lg text-muted-foreground">{film.original_title}</p>}<div className="mt-5 flex flex-wrap gap-2 text-sm text-muted-foreground">{film.year && <span>{film.year}</span>}{film.duration_minutes && <span>· {film.duration_minutes} min</span>}</div>{film.synopsis && <p className="mt-8 text-base leading-8 text-muted-foreground">{film.synopsis}</p>}{directors.length > 0 && <div className="mt-8"><h2 className="font-semibold">Realização</h2><div className="mt-3 flex flex-wrap gap-3">{directors.map((credit) => <span key={credit.person?.id ?? credit.role} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm"><UserRound className="size-4" />{credit.person?.name ?? "Nome desconhecido"}</span>)}</div></div>}{otherCredits.length > 0 && <div className="mt-8"><h2 className="font-semibold">Créditos</h2><div className="mt-3 space-y-2 text-sm text-muted-foreground">{otherCredits.map((credit, index) => <div key={credit.person?.id ?? index}>{credit.role}: {credit.person?.name ?? "Nome desconhecido"}</div>)}</div></div>}{film.trailer_url && <a href={film.trailer_url} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted">Ver trailer <ExternalLink className="size-4" /></a>}</div>
      </section>
      <section className="mt-16"><div className="flex items-end justify-between"><div><p className="text-sm font-medium text-muted-foreground">Agenda</p><h2 className="mt-1 text-2xl font-semibold">Próximas sessões</h2></div></div>{screenings.length === 0 ? <div className="mt-6 rounded-2xl border bg-card p-8 text-sm text-muted-foreground">Não há sessões futuras registadas para este documentário.</div> : <div className="mt-6 grid gap-4 md:grid-cols-2">{screenings.map((screening) => <article key={screening.id} className="rounded-2xl border bg-card p-5"><div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-5 text-muted-foreground" /><div><p className="font-medium">{new Date(screening.start_at).toLocaleString("pt-PT",{dateStyle:"medium",timeStyle:"short"})}</p>{screening.venue && <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4" />{screening.venue.name}{screening.venue.city ? " · "+screening.venue.city : ""}</p>}{screening.ticket_url && <a href={screening.ticket_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium hover:underline">Bilhetes <ExternalLink className="ml-1 size-3.5" /></a>}</div></div></article>)}</div>}</section>
    </main>
  </div>;
}
