import type { SourceAdapter } from "./contracts.js";
import { createAdapterRegistry, type AdapterRegistry } from "./adapter-registry.js";
import { cinematecaAdapter } from "../sources/cinemateca_pt/parser.js";
import { cinemaSaoJorgeAdapter } from "../sources/cinema_sao_jorge/parser.js";
import { cinemaFernandoLopesAdapter } from "../sources/cinema_fernando_lopes/parser.js";

/**
 * Single application registry for implemented adapters.
 *
 * Source-specific modules register themselves here; the ingestion core only
 * consumes the generic AdapterRegistry contract.
 */
export const productionAdapters: readonly SourceAdapter<any>[] = [
  cinematecaAdapter,
  cinemaSaoJorgeAdapter,
  cinemaFernandoLopesAdapter,
];

export function createProductionAdapterRegistry(): AdapterRegistry {
  return createAdapterRegistry(productionAdapters);
}
