# DocuEvents Source Strategy

## Principle

DocuEvents is a multi-source discovery platform. No individual provider is a product dependency or canonical authority for the catalogue.

Cinemateca Portuguesa is the first implemented adapter because it provides a concrete real-world case for validating the ingestion pipeline. It is not the reference architecture for other sources.

## Source families

The ingestion layer must support these source families without changing the canonical application model:

- cinemas and screening venues
- film festivals and festival editions
- cinematheques and film archives
- television channels and TV programmes
- streaming and video-on-demand platforms
- cultural institutions, museums, theatres and universities
- documentary-focused organisations and film communities
- general event/cultural calendars when they contain useful documentary-film data

## Acquisition methods

A source may expose data through:

- website / HTML
- RSS / Atom
- API
- iCal / ICS
- CSV or other structured exports
- manual administration

The acquisition method is an implementation detail of the source adapter. The rest of the system consumes the same normalized contracts.

## Source registry

Every source must be represented in the source registry with at least:

- stable `sourceKey`
- human-readable name
- source type
- acquisition method
- country and language where relevant
- canonical URL
- parser/adapter key
- active status
- fetch interval
- configuration

The registry must allow new sources to be added without modifying the recommendation engine or presentation layer.

## Source onboarding process

Each new source follows the same sequence:

```text
source discovery
  → source assessment
  → source adapter
  → fixture capture
  → parser tests
  → normalization tests
  → entity-resolution tests
  → persistence integration
  → operational monitoring
```

## Source assessment

Before implementing an adapter, assess:

1. data quality and completeness;
2. stability of the source format;
3. availability of dates, times and venues;
4. film identifiers such as IMDb/TMDb when available;
5. director and people information;
6. source terms/access constraints;
7. update frequency;
8. deduplication risk;
9. whether the source provides an API, feed or structured data;
10. whether ingestion can be performed reliably without brittle scraping.

## Provenance and deduplication

Multiple sources may describe the same film, festival, venue or screening. Source identity must remain separate from canonical identity.

For example:

```text
Film: The Example Documentary
  ├── source: cinema_a
  ├── source: festival_b
  ├── source: tv_c
  └── source: streaming_d
```

The canonical catalogue entity is shared, while source-specific identifiers, URLs and observations remain traceable.

Title-only similarity must never silently merge records.

## Initial source roadmap

The first production-oriented source set should contain representatives from more than one source family. The exact providers should be selected after source assessment rather than hard-coded into the application architecture.

Suggested progression:

1. Cinemateca Portuguesa — first implemented adapter
2. one independent Portuguese cinema/venue source
3. one Portuguese documentary/film festival
4. one television source
5. one streaming/VOD source
6. additional festivals, cinemas and cultural institutions

This progression validates that the ingestion contracts work across materially different source formats.
