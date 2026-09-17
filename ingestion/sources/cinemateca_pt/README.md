# Cinemateca Portuguesa adapter

Source key: `cinemateca_pt`

This is the first source adapter for DocuEvents.

## Current state

The adapter has three deliberate layers:

1. `types.ts` — source-specific input/output shapes.
2. `selectors.ts` — isolated HTML selector candidates.
3. `normalizer.ts` — deterministic conversion into the shared ingestion contract.

`parser.ts` currently exposes the parsing boundary but does **not** claim that guessed HTML selectors are production-ready. A real Cinemateca HTML fixture must be captured and reviewed before implementing extraction logic.

## Why this matters

The source can contain compound programmes. One screening session may contain several films. The normalized model therefore represents films as an ordered `films[]` collection rather than silently choosing one title.

## Validation sequence

```text
real source page
   ↓
captured fixture
   ↓
selector validation
   ↓
HTML extraction
   ↓
normalization
   ↓
fixture tests
   ↓
entity resolution
   ↓
persistence
```

No database persistence is performed by this adapter.
