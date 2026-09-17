# DocuEvents Source Registry

The source registry is the canonical inventory of external data providers used by DocuEvents.

It deliberately separates **source discovery** from **source implementation**. A source may be registered before its adapter exists.

## Source categories

| Category | Examples of source types | Initial role |
|---|---|---|
| Cinemas | website, API, iCal | screenings and venues |
| Festivals | website, API, RSS | editions, events and screenings |
| Cinematheques / archives | website, API | screenings and film metadata |
| Television | EPG, API, website | TV programmes |
| Streaming / VOD | API, website, catalogue feed | availability |
| Cultural institutions | website, RSS, iCal | screenings and cultural events |
| Manual / institutional | CSV, API, manual | controlled fallback |

## Initial registry

### Portugal — cinema / film institutions

| Source key | Category | Country | Data expected | Adapter status |
|---|---|---|---|---|
| `cinemateca_pt` | cinemateque | PT | screenings, films, venues, cycles | implemented first adapter |
| `cinema_sao_jorge` | cinema | PT | screenings, venue, films | planned |
| `culturgest` | cultural | PT | screenings, events, films | planned |
| `fundacao_gulbenkian` | cultural | PT | screenings, events | planned |
| `maat` | cultural | PT | film/cultural events where applicable | planned |

The registry entries above are implementation candidates, not claims that every provider currently exposes a stable machine-readable feed. Each source must be validated before an adapter is built.

### Portugal — festivals

Festival ingestion is edition-aware. A festival is a persistent entity; each annual/dated edition is a separate entity.

Candidate source families include Portuguese documentary, short-film, animation and general film festivals. The first festival adapter should be selected after validating the availability and stability of its programme data.

### Portugal — television

TV sources will be represented separately from cinema/festival programming because broadcast schedules have different temporal and availability semantics.

The target normalized entity is `tv_programs`, linked to canonical films where resolution is sufficiently reliable.

### Portugal — streaming / VOD

Streaming availability is treated as a distribution/availability signal rather than as a screening event. Source adapters should preserve the provider, URL, territory and observation time when those fields are available.

## Adapter contract

Every source adapter must:

1. have a stable `sourceKey`;
2. expose its source type;
3. keep selectors/API-specific logic inside the adapter;
4. produce the shared normalized contracts;
5. preserve source provenance;
6. produce deterministic external IDs whenever possible;
7. preserve compound programmes instead of silently dropping items;
8. report warnings rather than hiding ambiguous data;
9. retain enough raw input to support reprocessing.

## Source lifecycle

```text
candidate
   ↓
validated
   ↓
registered
   ↓
adapter implemented
   ↓
fixture coverage
   ↓
production enabled
   ↓
monitored
   ↓
paused / retired
```

A source must not be enabled for production ingestion merely because its adapter parses one fixture successfully. At minimum, its external identifier strategy, date/time interpretation, entity mapping and failure behaviour must be understood.

## Prioritization criteria

Source implementation order should be based on:

- relevance to documentary discovery;
- breadth of useful programming;
- geographic coverage;
- data completeness;
- source stability;
- machine-readability;
- ability to establish reliable external IDs;
- legal/technical access constraints;
- maintenance cost.

These are engineering prioritization criteria, not user-facing recommendation scores.

## Important architectural rule

No application component should contain logic such as `if source == cinemateca_pt`. Source-specific behaviour belongs in `ingestion/sources/<source-key>/` and shared behaviour belongs in `ingestion/core/`.

This keeps DocuEvents independent from any individual provider and allows new sources to be added without changing the recommendation or UI layers.
