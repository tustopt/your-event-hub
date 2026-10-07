import { CalendarDays, ExternalLink, MapPin, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
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
      if (filmResult.error || creditResult.error) { setError((filmResult.error || creditResult.error)!.message); setLoading(false); return; }
      if (!filmResult.data) { setError("Documentário não encontrado."); setLoading(false); return; }
      setFilm(filmResult.data); setCredits((creditResult.data ?? []) as PersonCredit[]);
      const { data: links, error: linkError } = await supabase.from("screening_films").select("screening_id").eq("film_id", id);
      if (linkError) { setError(linkError.message); setLoading(false); return; }
      const ids = (links ?? []).map((item) => item.screening_id);
      if (ids.length) {
        const { data: rows, error: screeningError } = await supabase.from("screenings").select("id,start_at,end_at,ticket_url,venue:venues(name,city)").in("id", ids).gte("start_at", new Date().toISOString()).order("start_at").limit(50);
        if (screeningError) setError(screeningError.message); else setScreenings((rows ?? []) as Screening[]);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [id, navigate]);

  if (loading) return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">A carregar…</main>;
  if (error || !film) return <main className="mx-auto max-w-3xl px-5 py-12"><Link to="/explorar" className="text-sm hover:underline">← Voltar</Link><div className="mt-8 border-t pt-6"><h1 className="text-xl font-semibold">{error || "Documentário não encontrado"}</h1></div></main>;

  const directors = credits.filter((credit) => credit.role.toLowerCase().includes("director") || credit.role.toLowerCase().includes("realizador"));
  const otherCredits = credits.filter((credit) => !directors.includes(credit));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <Link to="/explorar" className="inline-flex text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground">← Voltar à exploração</Link>

        <section className="mt-8 grid gap-10 lg:grid-cols-[minmax(230px,320px)_1fr] lg:gap-16">
          <div>
            {film.poster_url ? <img src={film.poster_url} alt={film.title} className="w-full object-cover" /> : <div className="flex aspect-[2/3] items-center justify-center bg-muted text-sm text-muted-foreground">Sem imagem</div>}
          </div>
          <div className="max-w-4xl">
            <p className="eyebrow">Documentário</p>
            <h1 className="display-serif mt-3 text-5xl leading-[.98] sm:text-6xl lg:text-7xl">{film.title}</h1>
            {film.original_title && film.original_title !== film.title && <p className="mt-3 text-lg text-muted-foreground">{film.original_title}</p>}
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
              {film.year && <span>{film.year}</span>}
              {film.duration_minutes && <span>{film.duration_minutes} min</span>}
            </div>
            {film.synopsis && <p className="mt-9 max-w-3xl text-base leading-8 text-muted-foreground">{film.synopsis}</p>}

            {directors.length > 0 && (
              <div className="mt-10 border-t pt-5">
                <p className="eyebrow">Realização</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {directors.map((credit) => <span key={credit.person?.id ?? credit.role} className="inline-flex items-center gap-2 text-sm font-semibold"><UserRound className="size-4 text-primary" />{credit.person?.name ?? "Nome desconhecido"}</span>)}
                </div>
              </div>
            )}

            {film.trailer_url && <a href={film.trailer_url} target="_blank" rel="noreferrer" className="mt-9 inline-flex items-center gap-2 bg-primary px-5 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground">Ver trailer <ExternalLink className="size-3.5" /></a>}
          </div>
        </section>

        {otherCredits.length > 0 && (
          <section className="mt-16 border-t pt-7">
            <p className="eyebrow">Créditos</p>
            <div className="mt-5 grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {otherCredits.map((credit, index) => <div key={credit.person?.id ?? index} className="text-sm text-muted-foreground"><strong className="text-foreground">{credit.role}:</strong> {credit.person?.name ?? "Nome desconhecido"}</div>)}
            </div>
          </section>
        )}

        <section className="mt-20 border-t pt-7">
          <div className="flex items-end justify-between">
            <div><p className="eyebrow">Agenda</p><h2 className="display-serif mt-2 text-3xl sm:text-4xl">Próximas sessões</h2></div>
            <span className="text-xs text-muted-foreground">{screenings.length} sessões</span>
          </div>
          {screenings.length === 0 ? (
            <div className="mt-6 border-t py-8 text-sm text-muted-foreground">Não há sessões futuras registadas para este documentário.</div>
          ) : (
            <div className="mt-2">
              {screenings.map((screening) => (
                <article key={screening.id} className="grid gap-3 border-t py-5 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
                  <div className="font-semibold">{new Date(screening.start_at).toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short" })}</div>
                  <div>
                    <p className="font-bold">{new Date(screening.start_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</p>
                    {screening.venue && <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5" />{screening.venue.name}{screening.venue.city ? ` · ${screening.venue.city}` : ""}</p>}
                  </div>
                  {screening.ticket_url && <a href={screening.ticket_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider hover:text-primary">Bilhetes <ExternalLink className="size-3.5" /></a>}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
