import { CalendarDays, Clapperboard, MapPin, Search, Star, Tv, UserRound } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

const featured = [
  {
    title: "Cinema documental",
    description: "Sessões, ciclos e retrospectivas em salas e espaços culturais.",
    icon: Clapperboard,
  },
  {
    title: "Festivais",
    description: "Descubra festivais e programas documentais em Portugal.",
    icon: CalendarDays,
  },
  {
    title: "Televisão",
    description: "Documentários e programas documentais a acompanhar na televisão.",
    icon: Tv,
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5 lg:px-8">
          <a href="/" className="shrink-0 text-xl font-semibold tracking-tight">
            Docu<span className="text-muted-foreground">Events</span>
          </a>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#descobrir" className="text-foreground/80 transition-colors hover:text-foreground">
              Descobrir
            </a>
            <a href="#agenda" className="text-foreground/80 transition-colors hover:text-foreground">
              Agenda
            </a>
            <a href="#fontes" className="text-foreground/80 transition-colors hover:text-foreground">
              Fontes
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <a
              href="#pesquisa"
              aria-label="Pesquisar"
              className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
            >
              <Search className="size-5" />
            </a>
            <a
              href="#perfil"
              aria-label="Perfil"
              className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
            >
              <UserRound className="size-5" />
            </a>
          </div>
        </div>
      </header>

      <main>
        <section id="pesquisa" className="border-b">
          <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 lg:px-8 lg:pb-20 lg:pt-24">
            <div className="max-w-4xl">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Cinema documental em Portugal
              </p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                O que vale a pena descobrir agora?
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Sessões, filmes, festivais e televisão documental reunidos num só lugar,
                organizados para encontrar rapidamente aquilo que lhe interessa.
              </p>

              <div className="mt-8 flex max-w-2xl items-center gap-3 rounded-xl border bg-card p-2 shadow-sm">
                <Search className="ml-3 size-5 shrink-0 text-muted-foreground" />
                <input
                  aria-label="Pesquisar documentários, filmes, realizadores ou eventos"
                  placeholder="Filmes, realizadores, festivais, locais..."
                  className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                  Pesquisar
                </button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-sm">
                {["Hoje", "Este fim de semana", "Lisboa", "Porto", "Festivais"].map((item) => (
                  <button
                    key={item}
                    className="rounded-full border px-4 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="descobrir" className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Explorar</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Descubra por onde começar</h2>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {featured.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                <a href="#agenda" className="mt-6 inline-flex text-sm font-medium hover:underline">
                  Explorar →
                </a>
              </article>
            ))}
          </div>
        </section>

        <section id="agenda" className="border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agenda</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Próximos eventos</h2>
              </div>
              <p className="text-sm text-muted-foreground">A agenda será alimentada pelas fontes do DocuEvents.</p>
            </div>

            <div className="mt-8 rounded-2xl border bg-card p-8 text-center">
              <CalendarDays className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">A agenda está a ser preparada</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Os dados dos adaptadores de Cinemateca, Doclisboa, São Jorge, Fernando Lopes e RTP
                serão apresentados aqui à medida que ligarmos a aplicação ao catálogo.
              </p>
            </div>
          </div>
        </section>

        <section id="fontes" className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">Fontes</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Uma base construída a partir de fontes reais</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              O catálogo será consolidado a partir de fontes culturais, cinemas, festivais e televisão,
              mantendo a proveniência de cada informação.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {["Cinemateca Portuguesa", "Doclisboa", "Cinema São Jorge", "Cinema Fernando Lopes", "RTP"].map((source) => (
              <span key={source} className="rounded-full border px-4 py-2 text-sm">
                {source}
              </span>
            ))}
          </div>
        </section>
      </main>

      <footer id="perfil" className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-2">
            <Star className="size-4" />
            <span>DocuEvents</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> Portugal</span>
            <span>Descoberta documental</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
