import type { AdapterResult, ParsedSourceItem, SourceAdapter } from "./contracts.js";
import { resolveSourceAdapter, type AdapterRegistry } from "./adapter-registry.js";

export interface SourceIngestionInput {
  sourceKey: string;
  input: ParsedSourceItem;
}

export interface SourceIngestionResult {
  sourceKey: string;
  adapterKey: string;
  result: AdapterResult;
}

/**
 * Runs a source through the registered adapter without knowing anything about
 * the concrete provider. Persistence is intentionally handled by a separate
 * layer so parsing can be tested and reprocessed independently.
 */
export function ingestSource(
  input: SourceIngestionInput,
  adapters: AdapterRegistry,
): SourceIngestionResult {
  const adapter = resolveSourceAdapter(input.sourceKey, adapters);

  if (adapter.key !== input.sourceKey) {
    throw new Error(
      `Adapter/source key mismatch: source=${input.sourceKey}, adapter=${adapter.key}`,
    );
  }

  if (adapter.sourceType !== input.input.sourceType) {
    throw new Error(
      `Source type mismatch for ${input.sourceKey}: expected=${adapter.sourceType}, received=${input.input.sourceType}`,
    );
  }

  return {
    sourceKey: input.sourceKey,
    adapterKey: adapter.key,
    result: adapter.parse(input.input),
  };
}

/** Convenience factory for a registry from adapter implementations. */
export function createIngestionRunner(adapters: readonly SourceAdapter[]) {
  const registry = new Map(adapters.map((adapter) => [adapter.key, adapter]));
  if (registry.size !== adapters.length) {
    throw new Error("Duplicate source adapter key");
  }

  return (input: SourceIngestionInput) => ingestSource(input, registry);
}
