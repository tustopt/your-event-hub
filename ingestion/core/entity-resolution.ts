export interface FilmIdentityInput {
  title: string;
  originalTitle?: string;
  year?: number;
  director?: string;
  imdbId?: string;
  tmdbId?: string;
}

export interface FilmIdentity {
  canonicalKey: string;
  confidence: "strong" | "probable" | "weak";
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Build a deterministic matching key. External IDs are preferred because
 * they are stronger identifiers than titles. The generated title-based key
 * is only a matching aid and must never silently merge records by itself.
 */
export function buildFilmIdentity(input: FilmIdentityInput): FilmIdentity {
  if (input.imdbId?.trim()) {
    return { canonicalKey: `imdb:${input.imdbId.trim()}`, confidence: "strong" };
  }

  if (input.tmdbId?.trim()) {
    return { canonicalKey: `tmdb:${input.tmdbId.trim()}`, confidence: "strong" };
  }

  const title = normalizeText(input.originalTitle || input.title);
  const director = input.director ? normalizeText(input.director) : "";
  const year = input.year ? String(input.year) : "";

  if (title && year && director) {
    return {
      canonicalKey: `title:${title}|year:${year}|director:${director}`,
      confidence: "probable",
    };
  }

  return {
    canonicalKey: `title:${title}|year:${year}`,
    confidence: "weak",
  };
}

export function filmIdentitiesMatch(a: FilmIdentityInput, b: FilmIdentityInput): boolean {
  if (a.imdbId && b.imdbId) return a.imdbId.trim() === b.imdbId.trim();
  if (a.tmdbId && b.tmdbId) return a.tmdbId.trim() === b.tmdbId.trim();

  const left = buildFilmIdentity(a);
  const right = buildFilmIdentity(b);

  return left.confidence !== "weak" &&
    right.confidence !== "weak" &&
    left.canonicalKey === right.canonicalKey;
}
