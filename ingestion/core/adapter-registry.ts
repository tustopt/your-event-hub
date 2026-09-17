import type { SourceAdapter } from "./contracts.js";
import { getSourceDefinition, type SourceDefinition } from "./source-registry.js";

/** Registry of implemented source adapters. Source definitions may exist without an adapter. */
export type AdapterRegistry = ReadonlyMap<string, SourceAdapter<any>>;

export function createAdapterRegistry(adapters: readonly SourceAdapter<any>[]): AdapterRegistry {
  const registry = new Map<string, SourceAdapter<any>>();
  for (const adapter of adapters) {
    if (registry.has(adapter.key)) throw new Error(`Duplicate source adapter key: ${adapter.key}`);
    registry.set(adapter.key, adapter);
  }
  return registry;
}

export function resolveSourceAdapter(
  source: SourceDefinition | string,
  adapters: AdapterRegistry,
): SourceAdapter<any> {
  const sourceKey = typeof source === "string" ? source : source.key;
  const definition = typeof source === "string" ? getSourceDefinition(source) : source;

  // Adapter wiring is independently testable and can exist before the
  // metadata entry is added to the canonical source registry.
  if (!definition) {
    const standaloneAdapter = adapters.get(sourceKey);
    if (standaloneAdapter) return standaloneAdapter;
    throw new Error(`Unknown DocuEvents source: ${sourceKey}`);
  }

  if (!definition.adapterKey) throw new Error(`Source has no adapter: ${definition.key}`);
  const adapter = adapters.get(definition.adapterKey);
  if (!adapter) throw new Error(`Adapter not installed for source: ${definition.key}`);
  return adapter;
}
