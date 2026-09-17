# Doclisboa source

Doclisboa is an independent festival source in the DocuEvents source registry.

## Current validation

The official 2026 site confirms:

- festival edition: XXIV
- edition year: 2026
- festival dates: 2026-10-15 through 2026-10-25
- source website: https://doclisboa.org/
- programme venues include Culturgest, Cinema São Jorge, Cinemateca Portuguesa and Cinema Ideal

The 2026 programme is being released progressively. The official site states that the complete programme will be presented on 1 October 2026. Until the programme/session endpoint is stable and its fields are verified, the source remains `candidate` and must not be enabled for production ingestion.

## Adapter requirements

The eventual adapter must be edition-aware and preserve:

1. festival identity (`doclisboa`);
2. festival edition (`2026`);
3. screening date/time;
4. screening venue;
5. film title and available film metadata;
6. section/cycle;
7. source URL and deterministic source external ID;
8. warnings for incomplete or ambiguous programme data.

A festival edition is not a cinema source and must not depend on the Cinemateca, Cinema São Jorge or any other venue adapter. Those providers remain independent sources.

## Implementation status

`candidate` — registry entry created; live programme adapter intentionally not enabled yet.
