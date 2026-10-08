import { appPath } from "@/lib/app-path";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Search } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { FilmCard } from "@/components/film-card";
import { SiteHeader } from "@/components/site-header";
import {
  matchesExploreFilter,
  matchesExploreQuery,
  matchesFilmQuery,
  getDateFilterRange,
  type ExploreFilter,
} from "@/lib/explore/filters";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/explorar")({ component: Explore });

type ExploreEvent = {
  id: string; title: string; description: string | null; type: string;
  start_at: string | null; end_at: string | null; source_url: string | null;
  venues: { name: string; city: string | null } | null;
  festivals: { name: string } | null;
};
type ExploreFilm = { id: string; title: string; year: number | null; synopsis: string | null; poster_url: string | null };
type FilmScreening = {
  id: string; start_at: string; end_at: string | null;
  venues: { name: string; city: string | null } | null;
  events: { id: string; type: string; festivals: { name: string } | null } | null;
  screening_films: { film_id: string }[];
};

const filterLabels: Record<ExploreFilter, string> = {
  today: "Hoje", weekend: "Este fim de semana", "city-lisboa": "Lisboa",
  "city-porto": "Porto", festivals: "Festivais",
};

function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const filter = params.get("filter");
  return {
    query: params.get("q") ?? "",
    filter: filter && filter in filterLabels ? (filter as ExploreFilter) : null,
  };
}

function Explore() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ExploreEvent[]>([]);
  const [films, setFilms] = useState<ExploreFilm[]>([]);
  const [filmScreenings, setFilmScreenings] = useState<FilmScreening[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ExploreFilter | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const initial = readFiltersFromUrl();
    setQuery(initial.query); setFilter(initial.filter);
    let active = true;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      if (!sessionData.session) { setAuthenticated(false); setLoading(false); return; }
      setAuthenticated(true);
      const todayStart = getDateFilterRange("today").from.toISOString();
      const [eventsResult, filmsResult, upcoming, past] = await Promise.all([
        supabase.from("events").select("id,title,description,type,start_at,end_at,source_url,venues(name,city),festivals(name)").gte("start_at", todayStart).order("start_at", { ascending: true, nullsFirst: false }).limit(500),
        supabase.from("films").select("id,title,year,synopsis,poster_url").order("updated_at", { ascending: false }).limit(500),
        supabase.from("screenings").select("id,start_at,end_at,venues(name,city),events(id,type,festivals(name)),screening_films(film_id)").gte("start_at", todayStart).order("start_at", { ascending: true }).limit(500),
        supabase.from("screenings").select("id,start_at,end_at,venues(name,city),events(id,type,festivals(name)),screening_films(film_id)").lt("start_at", todayStart).order("start_at", { ascending: false }).limit(500),
      ]);
      if (!active) return;
      const firstError = eventsResult.error || filmsResult.error || upcoming.error || past.error;
      if (firstError) setError(firstError.message);
      else {
        setEvents((eventsResult.data ?? []) as ExploreEvent[]);
        setFilms((filmsResult.data ?? []) as ExploreFilm[]);
        setFilmScreenings([...((upcoming.data ?? []) as unknown as FilmScreening[]), ...((past.data ?? []) as unknown as FilmScreening[])]);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  function replaceUrl(nextQuery: string, nextFilter: ExploreFilter | null) {
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextFilter) params.set("filter", nextFilter);
    const suffix = params.toString();
    window.history.replaceState(null, "", appPath(suffix ? `/explorar?${suffix}` : "/explorar"));
  }
  function updateSearch(value: string) { setQuery(value); replaceUrl(value, filter); }
  function updateFilter(value: ExploreFilter | null) { setFilter(value); replaceUrl(query, value); }

  const filtered = useMemo(
    () => events.filter((event) => matchesExploreQuery(event, query) && matchesExploreFilter(event, filter)),
    [events, query, filter],
  );

  const screeningsByFilm = useMemo(() => {
    const result = new Map<string, FilmScreening[]>();
    for (const screening of filmScreenings) for (const relation of screening.screening_films ?? []) {
      result.set(relation.film_id, [...(result.get(relation.film_id) ?? []), screening]);
    }
    return result;
  }, [filmScreenings]);

  const filteredFilms = useMemo(() => films.filter((film) => {
    if (!matchesFilmQuery(film, query)) return false;
    if (!filter) return true;
    return (screeningsByFilm.get(film.id) ?? []).some((screening) =>
      matchesExploreFilter({
        title: film.title, description: null, type: screening.events?.type ?? "screening",
        start_at: screening.start_at, venues: screening.venues, festivals: screening.events?.festivals ?? null,
      }, filter),
    );
  }), [films, query, filter, screeningsByFilm]);

  const nextScreeningByFilm = useMemo(() => {
    const result = new Map<string, FilmScreening>();
    const now = Date.now();
    for (const screening of filmScreenings) for (const relation of screening.screening_films ?? []) {
      const current = result.get(relation.film_id);
      if (!current || new Date(screening.start_at).getTime() >= now && new Date(screening.start_at).getTime() < new Date(current.start_at).getTime()) result.set(relation.film_id, screening);
    }
    return result;
  }, [filmScreenings]);

  async function signOut() { await supabase.auth.signOut(); await navigate({ to: "/" }); }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader search />
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="mb-10 flex max-w-3xl items-center border-b-2 border-foreground pb-2">
          <Search className="mr-3 size-4 shrink-0" />
          <input aria-label="Pesquisar no catálogo" value={query} onChange={(event) => updateSearch(event.target.value)} placeholder="Pesquisar filmes, eventos, locais..." className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        {!loading && !authenticated ? (
          <section className="max-w-xl border-t pt-7">
            <p className="eyebrow">Acesso</p>
            <h1 className="display-serif mt-3 text-4xl">Explore o docradar</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Entre para consultar o catálogo e a agenda com dados reais.</p>
            <Link to="/login" className="mt-6 inline-flex bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Entrar</Link>
          </section>
        ) : (
          <>
            <header className="max-w-3xl">
              <p className="eyebrow">Explorar</p>
              <h1 className="display-serif mt-3 text-5xl sm:text-6xl">Agenda documental</h1>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">Pesquise filmes, eventos, locais e festivais, ou filtre a agenda por data e cidade.</p>
            </header>

            <div className="mt-9 flex flex-wrap gap-2 border-y py-4">
              {(Object.keys(filterLabels) as ExploreFilter[]).map((item) => (
                <button key={item} onClick={() => updateFilter(filter === item ? null : item)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${filter === item ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  aria-pressed={filter === item}>{filterLabels[item]}</button>
              ))}
              <div className="ml-auto hidden text-xs text-muted-foreground sm:flex sm:items-center">{filteredFilms.length} filmes · {filtered.length} eventos</div>
            </div>

            {error && <div className="mt-8 border border-primary/30 p-4 text-sm text-muted-foreground">Não foi possível carregar a agenda: {error}</div>}

            <section className="mt-14">
              <div className="flex items-end justify-between border-b pb-4">
                <div><p className="eyebrow">Cinema</p><h2 className="display-serif mt-2 text-3xl">Documentários</h2></div>
                <span className="text-xs text-muted-foreground">{filteredFilms.length} títulos</span>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {filteredFilms.map((film) => {
                  const screening = nextScreeningByFilm.get(film.id);
                  return <FilmCard key={film.id} id={film.id} title={film.title} year={film.year} posterUrl={film.poster_url}
                    screening={screening ? { startAt: screening.start_at, venueName: screening.venues?.name, city: screening.venues?.city } : undefined} />;
                })}
              </div>
            </section>

            <section className="mt-20">
              <div className="flex items-end justify-between border-b pb-4">
                <div><p className="eyebrow">Agenda</p><h2 className="display-serif mt-2 text-3xl">Próximas sessões</h2></div>
                <span className="text-xs text-muted-foreground">{filtered.length} eventos</span>
              </div>
              <div className="mt-2 grid gap-x-8 md:grid-cols-2">
                {filtered.map((event) => (
                  <Link key={event.id} to="/eventos/$id" params={{ id: event.id }} className="group border-b py-5 transition-colors hover:bg-muted/40">
                    <div className="grid grid-cols-[4.5rem_1fr_auto] gap-4">
                      <div className="text-xs font-bold uppercase text-primary">{event.start_at ? new Date(event.start_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }) : "—"}</div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{event.type}</p>
                        <h3 className="mt-1 font-bold">{event.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {event.venues && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{event.venues.name}{event.venues.city ? ` · ${event.venues.city}` : ""}</span>}
                          {event.festivals && <span>{event.festivals.name}</span>}
                        </div>
                      </div>
                      {event.start_at && <span className="text-xs font-bold">{new Date(event.start_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {!loading && !error && filtered.length === 0 && <div className="mt-8 border-t py-12 text-center text-sm text-muted-foreground"><CalendarDays className="mx-auto mb-3 size-7" />Não foram encontrados eventos.</div>}
            <div className="mt-10 flex justify-end"><button onClick={() => void signOut()} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Sair</button></div>
          </>
        )}
      </main>
    </div>
  );
}
