# Ingestion

This directory contains source acquisition, parsing, normalization and entity-resolution code.

It is intentionally separated from the application UI and domain presentation layer.

## Structure

```text
ingestion/
├── core/
│   └── shared ingestion contracts and pipeline primitives
└── sources/
    └── one adapter per external source
```

Adapters should be deterministic, fixture-tested and preserve source provenance.
