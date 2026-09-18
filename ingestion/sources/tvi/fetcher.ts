import type { TviProgrammeItem } from "./types";

export const TVI_SOURCE_KEY = "tvi";
export const TVI_PROGRAMMES_URL = "https://tvi.iol.pt/";

export interface FetchTviOptions {
  url?: string;
  fetchImpl?: typeof fetch;
  limit?: number;
}

/**
 * Candidate adapter only. The currently discoverable EPG data is external
 * to TVI and does not expose a reliable documentary genre classification.
 * No programme is ingested until that condition is met.
 */
export async function fetchTviProgramme(
  options: FetchTviOptions = {},
): Promise<readonly TviProgrammeItem[]> {
  void options;
  return [];
}
