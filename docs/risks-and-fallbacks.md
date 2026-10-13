# Risks and Fallbacks

## Principle

A strong enablement session should feel live, but it should not depend on everything working perfectly in real time. Prepare every act with both a live path and a safe fallback.

## Main risks

| Risk | Likely impact | Mitigation |
| --- | --- | --- |
| Source connectivity issues | Breaks the opening confidence moment | Keep a curated mirror or snapshot ready for the same incident data |
| Ingestion delays or schema surprises | Interrupts flow and burns time | Pre-stage representative files and keep a completed state ready |
| Pipeline runtime issues | Stops the narrative at the trust-building stage | Keep prebuilt silver and gold tables available |
| Model training instability | Makes AI feel fragile | Precompute scored output and treat training as optional live content |
| Genie response variability | Risks awkward answers in front of the room | Pretest prompts, tighten instructions, and keep backup prompts ready |
| Dashboard or app glitches | Weakens the closing landing | Use screenshots or a backup app state if needed |

## Fallback design by act

### Governed source access
* live: query the connected operational source
* fallback: switch to a prepared relational snapshot and narrate the same pattern

### Ingestion
* live: drop files into the landing area and show new records arriving
* fallback: show pre-landed files and a completed bronze table state

### Transformation and data quality
* live: run or review the latest pipeline output
* fallback: move directly to prebuilt silver and gold assets and explain the validations already applied

### Modelling
* live: show training or scoring
* fallback: use pre-scored outputs and focus on operational interpretation

### Ontology
* live: navigate the published pages and terms
* fallback: use exported markdown or screenshots if publishing is unavailable

### Genie
* live: use tested natural-language prompts in a controlled sequence
* fallback: keep one dashboard and one saved result ready for each key question

### Application
* live: drive the app with current scored data
* fallback: use a stable application state or screenshots for the final message

## Rehearsal checklist

* rehearse the full story end to end at least twice
* time each act and note where explanations drift long
* test every prompt and navigation path in presentation order
* verify permissions for all assets from the same user context you will present with
* keep a copy of key screenshots in presentation notes as an emergency backup

## Non-negotiables

* never debug extensively in front of the audience
* if a live step stalls, switch quickly and confidently to the fallback
* preserve the story momentum above all else
