export interface ImageResolverOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function absoluteUrl(value: string, baseUrl: string): string | undefined {
  try {
    return new URL(decodeHtml(value), baseUrl).toString();
  } catch {
    return undefined;
  }
}

function isLikelySiteChromeImage(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return /(?:^|[/_-])(logo|favicon|icon|sprite)(?:[._/-]|$)/i.test(path);
  } catch {
    return false;
  }
}

/** Extracts the most useful public image URL from a source page. */
export function extractSourceImageUrl(html: string, baseUrl: string): string | undefined {
  const candidates: string[] = [];

  const metaPatterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]*>/gi,
  ];
  for (const pattern of metaPatterns) {
    for (const match of html.matchAll(pattern)) {
      if (match[1]) candidates.push(match[1]);
    }
  }

  const imagePatterns = [
    /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["'][^>]*>/gi,
    /<img[^>]+srcset=["']([^"']+)["'][^>]*>/gi,
  ];
  for (const pattern of imagePatterns) {
    for (const match of html.matchAll(pattern)) {
      if (!match[1]) continue;
      const candidate = match[1].split(",")[0]?.trim().split(/\s+/)[0];
      if (candidate) candidates.push(candidate);
    }
  }

  for (const candidate of candidates) {
    const url = absoluteUrl(candidate, baseUrl);
    if (url && !isLikelySiteChromeImage(url)) return url;
  }

  return undefined;
}

export async function resolveSourceImageUrl(
  sourceUrl: string | undefined,
  options: ImageResolverOptions = {},
): Promise<string | undefined> {
  if (!sourceUrl) return undefined;
  const fetchImpl = options.fetchImpl || fetch;
  try {
    const response = await fetchImpl(sourceUrl, {
      headers: { "User-Agent": options.userAgent || "Mozilla/5.0 (compatible; DocuEvents/1.0)" },
    });
    if (!response.ok) return undefined;
    return extractSourceImageUrl(await response.text(), sourceUrl);
  } catch {
    return undefined;
  }
}

/** Fills missing images without replacing images explicitly supplied by a source. */
export async function enrichAdapterResultImages<
  T extends {
    screenings: Array<{
      films: Array<{ film: { imageUrl?: string; provenance: { sourceUrl?: string } } }>;
    }>;
    tvPrograms?: Array<{
      imageUrl?: string;
      sourceUrl?: string;
      provenance: { sourceUrl?: string };
    }>;
  },
>(result: T, options: ImageResolverOptions = {}): Promise<T> {
  for (const program of result.tvPrograms || []) {
    if (!program.imageUrl) {
      program.imageUrl = await resolveSourceImageUrl(
        program.sourceUrl || program.provenance.sourceUrl,
        options,
      );
    }
  }
  for (const screening of result.screenings) {
    for (const item of screening.films ?? []) {
      if (!item.film.imageUrl) {
        item.film.imageUrl = await resolveSourceImageUrl(item.film.provenance.sourceUrl, options);
      }
    }
  }
  return result;
}
