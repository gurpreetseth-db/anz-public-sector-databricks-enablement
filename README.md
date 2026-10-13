# ANZ Public Sector Databricks Enablement

This repository packages a 4-hour public sector enablement session for Australia and New Zealand. The aim is to win hearts and minds by walking the audience through a coherent product story rather than presenting a disconnected feature tour.

## Session theme

**Story:** Modern emergency management and disaster response across agencies.

Why this works for ANZ public sector:
* immediately relevant to bushfires, floods, storms, and cross-agency coordination
* emotionally resonant without being sensational
* naturally showcases siloed systems, governance, data quality, analytics, AI, and operational applications
* gives each Databricks capability a clear reason to exist

## Capability arc

The walkthrough is designed to show a single platform journey across:
* ingestion
* transformation
* data quality
* modelling
* business context and ontology
* natural language analytics with Genie
* secure access through Unity Catalog and gateway patterns
* operational application experience

## Repository structure

* `docs/session-strategy.md` — audience framing, narrative choices, and why this storyline fits ANZ public sector
* `docs/run-of-show.md` — minute-by-minute facilitation plan for the 4-hour session
* `docs/data-and-asset-plan.md` — demo datasets, assets to prebuild, and dependency mapping
* `docs/demo-talk-track.md` — speaking points and transitions between acts
* `docs/risks-and-fallbacks.md` — failure modes, backups, and rehearsal guidance
* `notebooks/README.md` — proposed notebook sequence and expected purpose of each
* `ontology/README.md` — glossary and domain structure to support Discover and semantic alignment
* `genie/README.md` — Genie space design, example questions, and guardrails
* `app/README.md` — operational application concept for the final act

## Recommended session flow

1. Set the mission and public sector problem statement
2. Bring in legacy and streaming data sources
3. Clean, validate, and govern the data pipeline
4. Build predictive intelligence for incident prioritisation
5. Publish business meaning through ontology and discoverability
6. Let business users interrogate data with Genie
7. End with an operational app that turns insights into action

## Build philosophy

This repository intentionally starts with planning and content scaffolding first. Implementation assets such as notebooks, tables, dashboards, a Genie space, ontology pages, and an app can be added incrementally once the story and sequencing are locked.
