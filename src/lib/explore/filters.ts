export type ExploreFilter = "today" | "weekend" | "city-lisboa" | "city-porto" | "festivals";

export type ExploreEventLike = {
  title: string;
  description: string | null;
  type: string;
  start_at: string | null;
  venues?: { name: string; city: string | null } | null;
  festivals?: { name: string } | null;
};

export type ExploreFilmLike = {
  title: string;
  synopsis: string | null;
  year: number | null;
};

export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("pt-PT");
}

export function matchesExploreQuery(event: ExploreEventLike, query: string): boolean {
  const term = normalizeSearch(query);
  if (!term) return true;

  return [
    event.title,
    event.description,
    event.type,
    event.venues?.name,
    event.venues?.city,
    event.festivals?.name,
  ].filter(Boolean).some((value) => normalizeSearch(value!).includes(term));
}

export function matchesFilmQuery(film: ExploreFilmLike, query: string): boolean {
  const term = normalizeSearch(query);
  if (!term) return true;

  return [film.title, film.synopsis, film.year?.toString()]
    .filter(Boolean)
    .some((value) => normalizeSearch(value!).includes(term));
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getDateFilterRange(filter: Extract<ExploreFilter, "today" | "weekend">, now = new Date()): { from: Date; to: Date } {
  const today = startOfDay(now);

  if (filter === "today") {
    return { from: today, to: addDays(today, 1) };
  }

  const day = today.getDay();
  const daysUntilSaturday = day === 0 ? -1 : 6 - day;
  const from = addDays(today, daysUntilSaturday);
  return { from, to: addDays(from, 2) };
}

export function matchesExploreFilter(
  event: ExploreEventLike,
  filter: ExploreFilter | null,
  now = new Date(),
): boolean {
  if (!filter) return true;

  if (filter === "city-lisboa") {
    return normalizeSearch(event.venues?.city ?? "") === "lisboa";
  }

  if (filter === "city-porto") {
    return normalizeSearch(event.venues?.city ?? "") === "porto";
  }

  if (filter === "festivals") {
    return Boolean(event.festivals) || normalizeSearch(event.type).includes("festival");
  }

  if (!event.start_at) return false;

  const { from, to } = getDateFilterRange(filter, now);
  const start = new Date(event.start_at);
  return start >= from && start < to;
}
