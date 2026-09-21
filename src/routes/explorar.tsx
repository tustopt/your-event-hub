import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clapperboard, MapPin, Search, UserRound } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  matchesExploreFilter,
  matchesExploreQuery,
  matchesFilmQuery,
  type ExploreFilter,
} from "@/lib/explore/filters";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/explorar")({ component: Explore });

type ExploreEvent = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  start_at: string | null;
  end_at: string | null;
  source_url: string | null;
  venues: { name: string; city: string | null } | null;
  festivals: { name: string } | null;
};

type ExploreFilm = {
  id: string;
  title: string;
  year: number | null;
  synopsis: string | null;
  poster_url: string | null;
};

type FilmScreening = {
  id: string;
  start_at: string;
  end_at: string | null;
  venues: { name: string; city: string | null } | null;
  events: {
    id: string;
    type: string;
    festivals: { name: string } | null;
  } | null;
  screening_films: { film_id: string }[];
};

const filterLabels: Record<ExploreFilter, string> = {
  today: "Hoje",
  weekend: "Este fim de semana",
  "city-lisboa": "Lisboa",
  "city-porto": "Porto",
  festivals: "Festivais",
};

function readFiltersFromUrl(): { query: string; filter: ExploreFilter | null } {
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
    setQuery(initial.query);
    setFilter(initial.filter);

    let active = true;
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      if (!sessionData.session) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      setAuthenticated(true);

      const now = new Date().toISOString();

      const [eventsResult, filmsResult, screeningsResult] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id,title,description,type,start_at,end_at,source_url,venues(name,city),festivals(name)",
          )
          .gte("start_at", now)
          .order("start_at", { ascending: true, nullsFirst: false })
          .limit(500),
        supabase
          .from("films")
          .select("id,title,year,synopsis,poster_url")
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase
          .from("screenings")
          .select(
            "id,start_at,end_at,venues(name,city),events(id,type,festivals(name)),screening_films(film_id)",
          )
          .gte("start_at", now)
          .order("start_at", { ascending: true })
          .limit(500),
      ]);

      if (!active) return;
      if (eventsResult.error || filmsResult.error || screeningsResult.error) {
        setError(
          (eventsResult.error || filmsResult.error || screeningsResult.error)!
            .message,
        );
      } else {
        setEvents((eventsResult.data ?? []) as ExploreEvent[]);
        setFilms((filmsResult.data ?? []) as ExploreFilm[]);
        setFilmScreenings(
          (screeningsResult.data ?? []) as unknown as FilmScreening[],
        );
      }
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function replaceUrl(nextQuery: string, nextFilter: ExploreFilter | null) {
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextFilter) params.set("filter", nextFilter);
    const suffix = params.toString();
    window.history.replaceState(
      null,
      "",
      suffix ? `/explorar?${suffix}` : "/explorar",
    );
  }

  function updateSearch(nextQuery: string) {
    setQuery(nextQuery);
    replaceUrl(nextQuery, filter);
  }

  function updateFilter(nextFilter: ExploreFilter | null) {
    setFilter(nextFilter);
    replaceUrl(query, nextFilter);
  }

  const filtered = useMemo(
    () =>
      events.filter(
        (event) =>
          matchesExploreQuery(event, query) &&
          matchesExploreFilter(event, filter),
      ),
    [events, query, filter],
  );

  const screeningsByFilm = useMemo(() => {
    const result = new Map<string, FilmScreening[]>();

    for (const screening of filmScreenings) {
      for (const relation of screening.screening_films ?? []) {
        const current = result.get(relation.film_id) ?? [];
        current.push(screening);
        result.set(relation.film_id, current);
      }
    }

    return result;
  }, [filmScreenings]);

  const filteredFilms = useMemo(
    () =>
      films.filter((film) => {
        if (!matchesFilmQuery(film, query)) return false;
        if (!filter) return true;

        return (screeningsByFilm.get(film.id) ?? []).some((screening) =>
          matchesExploreFilter(
            {
              title: film.title,
              description: null,
              type: screening.events?.type ?? "screening",
              start_at: screening.start_at,
              venues: screening.venues,
              festivals: screening.events?.festivals ?? null,
            },
            filter,
          ),
        );
      }),
    [films, query, filter, screeningsByFilm],
  );

  const nextScreeningByFilm = useMemo(() => {
    const result = new Map<string, FilmScreening>();

    for (const screening of filmScreenings) {
      for (const relation of screening.screening_films ?? []) {
        if (!result.has(relation.film_id)) {
          result.set(relation.film_id, screening);
        }
      }
    }

    return result;
  }, [filmScreenings]);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 lg:px-8">
          <Link to="/" className="shrink-0 text-xl font-semibold tracking-tight">
            Docu<span className="text-muted-foreground">Events</span>
          </Link>
          <div className="relative flex max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Pesquisar no catálogo"
              value={query}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Pesquisar filmes, eventos, locais..."
              className="w-full rounded-lg border bg-muted/30 py-2 pl-9 pr-3 text-sm outline-none"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => void signOut()}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Sair
            </button>
            <UserRound className="size-5" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {!loading && !authenticated ? (
          <section className="max-w-xl rounded-2xl border bg-card p-8">
            <h1 className="text-2xl font-semibold">Explore o DocuEvents</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              O catálogo e a agenda estão protegidos para utilizadores autenticados. Entre para consultar os dados reais do DocuEvents.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Entrar
            </Link>
          </section>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Explorar</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Agenda documental</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Pesquise filmes, eventos, locais e festivais, ou filtre a agenda por data e cidade.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {(Object.keys(filterLabels) as ExploreFilter[]).map((item) => (
                <button
                  key={item}
                  onClick={() => updateFilter(filter === item ? null : item)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${filter === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  aria-pressed={filter === item}
                >
                  {filterLabels[item]}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-8 rounded-xl border p-4 text-sm text-muted-foreground">
                Não foi possível carregar a agenda: {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="mt-8 rounded-2xl border bg-card p-10 text-center">
                <CalendarDays className="mx-auto size-8 text-muted-foreground" />
                <h2 className="mt-4 font-semibold">Não foram encontrados eventos</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                  Tente alterar a pesquisa ou remover os filtros. À medida que as fontes forem ingeridas, os eventos aparecerão aqui automaticamente.
                </p>
              </div>
            )}

            <section className="mt-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cinema</p>
                  <h2 className="mt-1 text-2xl font-semibold">Documentários</h2>
                </div>
                <span className="text-sm text-muted-foreground">{filteredFilms.length} títulos</span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {filteredFilms.map((film) => {
                  const screening = nextScreeningByFilm.get(film.id);

                  return (
                    <Link
                      key={film.id}
                      to="/filmes/$id"
                      params={{ id: film.id }}
                      className="block overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md"
                    >
                      {film.poster_url ? (
                        <img src={film.poster_url} alt="" className="aspect-[2/3] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted">
                          <Clapperboard className="size-10 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold">{film.title}</h3>
                        {film.year && <p className="mt-1 text-sm text-muted-foreground">{film.year}</p>}

                        {screening && (
                          <div className="mt-3 space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
                            <p className="font-medium text-foreground">Próxima sessão</p>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CalendarDays className="size-4 shrink-0" />
                              {new Date(screening.start_at).toLocaleString("pt-PT", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </div>
                            {screening.venues?.name && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="size-4 shrink-0" />
                                <span>
                                  {screening.venues.name}
                                  {screening.venues.city ? ` · ${screening.venues.city}` : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {film.synopsis && (
                          <p className="mt-3 line-clamp-3 text-sm leading-5 text-muted-foreground">
                            {film.synopsis}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="mt-14">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agenda</p>
                  <h2 className="mt-1 text-2xl font-semibold">Próximas sessões</h2>
                </div>
                <span className="text-sm text-muted-foreground">{filtered.length} eventos</span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {filtered.map((event) => (
                  <Link
                    key={event.id}
                    to="/eventos/$id"
                    params={{ id: event.id }}
                    className="block rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{event.type}</p>
                    <h2 className="mt-2 text-lg font-semibold">{event.title}</h2>
                    {event.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{event.description}</p>}
                    <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                      {event.start_at && (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="size-4" />
                          {new Date(event.start_at).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      )}
                      {event.venues && (
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4" />
                          {event.venues.name}{event.venues.city ? " · " + event.venues.city : ""}
                        </div>
                      )}
                      {event.festivals && <div className="text-xs">Festival: {event.festivals.name}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
