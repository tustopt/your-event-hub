import { CalendarDays, Clapperboard, MapPin, Search, Tv } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({ component: Index });

const featured = [
  { title: "Cinema documental", description: "Sessões, ciclos e retrospectivas em salas e espaços culturais.", icon: Clapperboard },
  { title: "Festivais", description: "Descubra festivais e programas documentais em Portugal.", icon: CalendarDays },
  { title: "Televisão", description: "Documentários e programas documentais a acompanhar na televisão.", icon: Tv },
];

const quickFilters = [
  { label: "Hoje", filter: "today" },
  { label: "Este fim de semana", filter: "weekend" },
  { label: "Lisboa", filter: "city-lisboa" },
  { label: "Porto", filter: "city-porto" },
  { label: "Festivais", filter: "festivals" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b">
          <div className="mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
            <div className="max-w-5xl">
              <p className="eyebrow">Cinema documental em Portugal</p>
              <h1 className="display-serif mt-5 max-w-4xl text-5xl leading-[.96] sm:text-6xl lg:text-8xl">
                O que está a acontecer<br className="hidden sm:block" /> agora?
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Filmes, sessões, festivais e televisão documental reunidos num só lugar.
                Descubra o que ver, onde e quando.
              </p>
              <form action="/explorar" method="get" className="mt-9 flex max-w-3xl items-center border-b-2 border-foreground pb-2">
                <Search className="mr-3 size-5 shrink-0" />
                <input
                  name="q"
                  aria-label="Pesquisar documentários, filmes, realizadores ou eventos"
                  placeholder="Filmes, realizadores, festivais, locais..."
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button type="submit" className="bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  Pesquisar
                </button>
              </form>
              <div className="mt-5 flex flex-wrap gap-2">
                {quickFilters.map((item) => (
                  <a key={item.filter} href={`/explorar?filter=${item.filter}`} className="rounded-full border px-4 py-2 text-xs font-semibold transition-colors hover:bg-muted">
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="descobrir" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="flex items-end justify-between border-b pb-4">
            <div>
              <p className="eyebrow">Descobrir</p>
              <h2 className="display-serif mt-2 text-3xl sm:text-4xl">Por onde quer começar?</h2>
            </div>
            <a href="/explorar" className="hidden text-xs font-bold uppercase tracking-wider sm:block">Ver tudo →</a>
          </div>
          <div className="mt-8 grid border-l border-t md:grid-cols-3">
            {featured.map(({ title, description, icon: Icon }) => (
              <a key={title} href="/explorar" className="group border-b border-r p-7 transition-colors hover:bg-muted/50 lg:p-9">
                <Icon className="size-5 text-primary" />
                <h3 className="mt-14 text-xl font-bold tracking-tight">{title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
                <span className="mt-7 inline-block text-xs font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform">Explorar →</span>
              </a>
            ))}
          </div>
        </section>

        <section id="agenda" className="bg-foreground text-background">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            <div className="flex flex-col gap-4 border-b border-background/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Agenda</p>
                <h2 className="display-serif mt-2 text-3xl sm:text-4xl">Próximos eventos</h2>
              </div>
              <a href="/explorar" className="text-xs font-bold uppercase tracking-wider opacity-75 hover:opacity-100">Abrir agenda →</a>
            </div>
            <div className="py-7">
              <div className="grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <CalendarDays className="size-7 text-primary" />
                <div>
                  <h3 className="text-xl font-bold">A programação real começa aqui.</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 opacity-65">
                    Sessões, festivais e televisão documental provenientes das fontes já validadas.
                    O catálogo cresce continuamente à medida que novas fontes são integradas.
                  </p>
                </div>
                <a href="/explorar" className="border border-background/30 px-5 py-3 text-xs font-bold uppercase tracking-wider hover:bg-background hover:text-foreground">Explorar</a>
              </div>
            </div>
          </div>
        </section>

        <section id="fontes" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Fontes</p>
            <h2 className="display-serif mt-2 text-3xl sm:text-4xl">Informação com proveniência.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              O catálogo é consolidado a partir de fontes culturais, cinemas, festivais e televisão,
              mantendo a origem de cada informação.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 border-l border-t sm:grid-cols-3 lg:grid-cols-5">
            {["Cinemateca Portuguesa", "Doclisboa", "Cinema São Jorge", "Cinema Fernando Lopes", "RTP"].map((source) => (
              <div key={source} className="border-b border-r p-5">
                <span className="mb-4 block size-2 rounded-full bg-primary" />
                <span className="text-sm font-semibold">{source}</span>
                <p className="mt-2 text-xs text-muted-foreground">Fonte validada</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl justify-between px-5 py-8 text-xs text-muted-foreground lg:px-8">
          <span>docradar</span><span>Portugal · Descoberta documental</span>
        </div>
      </footer>
    </div>
  );
}
