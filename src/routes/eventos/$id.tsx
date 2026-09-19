import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, Film, MapPin, Ticket, UserRound } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/eventos/$id")({ component: EventDetail });

type EventData = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  start_at: string;
  end_at: string | null;
  source_url: string | null;
  status: string;
  venues: { name: string; city: string | null; address: string | null; website: string | null } | null;
  festivals: { name: string; website: string | null } | null;
};

type Screening = {
  id: string;
  start_at: string;
  end_at: string | null;
  ticket_url: string | null;
  price: number | null;
  currency: string;
  language: string | null;
  subtitle_language: string | null;
  format: string | null;
  venue: { name: string; city: string | null } | null;
};

type EventFilm = { id: string; title: string; year: number | null; poster_url: string | null };

function EventDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [films, setFilms] = useState<EventFilm[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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

      const eventResult = await supabase
        .from("events")
        .select("id,title,description,type,start_at,end_at,source_url,status,venues(name,city,address,website),festivals(name,website)")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;
      if (eventResult.error) {
        setError(eventResult.error.message);
        setLoading(false);
        return;
      }
      if (!eventResult.data) {
        setLoading(false);
        return;
      }

      setEvent(eventResult.data as EventData);

      const screeningResult = await supabase
        .from("screenings")
        .select("id,start_at,end_at,ticket_url,price,currency,language,subtitle_language,format,venue:venues(name,city)")
        .eq("event_id", id)
        .maybeSingle();

      if (!active) return;
      if (screeningResult.error) {
        setError(screeningResult.error.message);
        setLoading(false);
        return;
      }

      if (screeningResult.data) {
        setScreening(screeningResult.data as Screening);

        const linksResult = await supabase
          .from("screening_films")
          .select("film_id,position")
          .eq("screening_id", screeningResult.data.id)
          .order("position", { ascending: true });

        if (!active) return;
        if (linksResult.error) {
          setError(linksResult.error.message);
          setLoading(false);
          return;
        }

        const filmIds = (linksResult.data ?? []).map((item) => item.film_id);
        if (filmIds.length) {
          const filmsResult = await supabase
            .from("films")
            .select("id,title,year,poster_url")
            .in("id", filmIds);

          if (!active) return;
          if (filmsResult.error) setError(filmsResult.error.message);
          else {
            const byId = new Map((filmsResult.data ?? []).map((film) => [film.id, film]));
            setFilms(filmIds.map((filmId) => byId.get(filmId)).filter(Boolean) as EventFilm[]);
          }
        }
      }

      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [id]);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  if (!loading && !authenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
          <section className="rounded-2xl border bg-card p-8">
            <h1 className="text-2xl font-semibold">Entre para ver o evento</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Os dados da agenda estão disponíveis para utilizadores autenticados.</p>
            <Link to="/login" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Entrar</Link>
          </section>
        </main>
      </div>
    );
  }

  if (!loading && !event) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
          <Link to="/explorar" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Voltar à agenda</Link>
          <h1 className="mt-8 text-2xl font-semibold">Evento não encontrado</h1>
        </main>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-background" />;

  const displayScreening = screening;
  const date = displayScreening?.start_at ?? event!.start_at;
  const venue = displayScreening?.venue ?? event!.venues;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5 lg:px-8">
          <Link to="/explorar" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Agenda</Link>
          <Link to="/" className="ml-auto text-xl font-semibold tracking-tight">Docu<span className="text-muted-foreground">Events</span></Link>
          <button onClick={() => void signOut()} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Sair</button>
          <UserRound className="size-5" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{event!.type}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{event!.title}</h1>
          {event!.description && <p className="mt-5 text-base leading-7 text-muted-foreground">{event!.description}</p>}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="space-y-5">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="font-semibold">Data e local</h2>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex gap-3"><CalendarDays className="mt-0.5 size-5 text-muted-foreground" /><div><p className="font-medium">{new Date(date).toLocaleString("pt-PT", { dateStyle: "full", timeStyle: "short" })}</p>{displayScreening?.end_at && <p className="mt-1 text-muted-foreground">Termina às {new Date(displayScreening.end_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</p>}</div></div>
                {venue && <div className="flex gap-3"><MapPin className="mt-0.5 size-5 text-muted-foreground" /><div><p className="font-medium">{venue.name}</p>{venue.address && "address" in venue && <p className="mt-1 text-muted-foreground">{venue.address}</p>}{venue.city && <p className="text-muted-foreground">{venue.city}</p>}</div></div>}
              </div>
            </div>

            {films.length > 0 && <div className="rounded-2xl border bg-card p-6">
              <h2 className="font-semibold">Filmes</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">{films.map((film) => <Link key={film.id} to="/filmes/$id" params={{ id: film.id }} className="flex gap-4 rounded-xl border p-3 hover:bg-muted/40">{film.poster_url ? <img src={film.poster_url} alt="" className="h-24 w-16 rounded object-cover" /> : <div className="flex h-24 w-16 items-center justify-center rounded bg-muted"><Film className="size-6 text-muted-foreground" /></div>}<div><h3 className="font-medium">{film.title}</h3>{film.year && <p className="mt-1 text-sm text-muted-foreground">{film.year}</p>}</div></Link>)}</div>
            </div>}

            {event!.festivals && <div className="rounded-2xl border bg-card p-6"><h2 className="font-semibold">Festival</h2><p className="mt-2 text-sm text-muted-foreground">{event!.festivals.name}</p></div>}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="font-semibold">Sessão</h2>
              {displayScreening?.format && <p className="mt-4 text-sm text-muted-foreground">Formato: {displayScreening.format}</p>}
              {displayScreening?.language && <p className="mt-2 text-sm text-muted-foreground">Idioma: {displayScreening.language}</p>}
              {displayScreening?.subtitle_language && <p className="mt-2 text-sm text-muted-foreground">Legendas: {displayScreening.subtitle_language}</p>}
              {displayScreening?.price !== null && displayScreening?.price !== undefined && <p className="mt-4 text-lg font-semibold">{displayScreening.price.toLocaleString("pt-PT", { style: "currency", currency: displayScreening.currency || "EUR" })}</p>}
              {displayScreening?.ticket_url && <a href={displayScreening.ticket_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"><Ticket className="size-4" />Bilhetes <ExternalLink className="size-3.5" /></a>}
              {event!.source_url && <a href={event!.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium"><ExternalLink className="size-4" />Fonte do evento</a>}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
