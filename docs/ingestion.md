# Ingestion Architecture

## Pipeline

```text
Source configuration
      ↓
Fetcher
      ↓
Raw source item
      ↓
Parser / adapter
      ↓
Normalized record
      ↓
Entity resolution
      ↓
Persistence
```

## Shared contract

All adapters produce source-independent normalized records from `ingestion/core/contracts.ts`.

A screening/programming item can expose, where available:

- source external identifier and URL
- date and time
- venue
- cycle
- title and original title
- director / people
- country
- year
- duration
- language and subtitles
- event type
- provenance

## Adapter isolation

HTML selectors and source-specific assumptions belong inside the source adapter. Do not spread source-specific parsing logic into the application or shared domain code.

Suggested adapter structure:

```text
ingestion/sources/<source-key>/
├── parser.ts
├── types.ts
├── selectors.ts
├── normalizer.ts
├── README.md
└── fixtures/
```

## Provenance

Every persisted entity originating from an external source should preserve enough information to answer:

- where did this record come from?
- what external identifier was used?
- what source URL produced it?
- when was it first/last seen?
- what raw data was received?

## Error handling

A failed source item must be observable and reprocessable. Parsing errors should not discard the original source payload.

## Compound screenings

A screening can contain multiple films. The adapter must preserve film order and must not silently select a single film from a compound programme.

## Cinemateca Portuguesa

Cinemateca is the first adapter. The current implementation establishes the contract, source-specific types, selector boundary and deterministic normalization. It deliberately does not claim production-ready HTML extraction until a real source page has been captured as a fixture and the selectors validated.

The implementation sequence is:

```text
real source page
  → fixture
  → selector validation
  → HTML extraction
  → normalized contract
  → fixture tests
  → entity resolution
  → persistence
```
