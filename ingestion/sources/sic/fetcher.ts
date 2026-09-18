import type { SicProgrammeItem } from "./types";

export const SIC_SOURCE_KEY = "sic";
export const SIC_PROGRAMMES_URL = "https://opto.sic.pt/";

export interface FetchSicOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  limit?: number;
}

/**
 * SIC is intentionally kept as a source adapter shell until a stable public
 * linear-programming endpoint is identified. Opto exposes documentary content,
 * but catalogue availability is not equivalent to a scheduled TV emission.
 */
export async function fetchSicProgramme(
  options: FetchSicOptions = {},
): Promise<readonly SicProgrammeItem[]> {
  void options;
  return [];
}
