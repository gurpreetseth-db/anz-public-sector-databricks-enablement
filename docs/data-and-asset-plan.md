# Data and Asset Plan

## Design principle

Use synthetic but plausible emergency-management data so the demo feels realistic without creating privacy, sovereignty, or operational sensitivity concerns.

## Core demo datasets

| Dataset | Purpose in the story | Suggested storage pattern | Notes |
| --- | --- | --- | --- |
| Historical incidents | Seed operational truth and legacy-system access | operational source exposed through governed gateway pattern | Use several years of incident history across states or regions |
| Weather observations | Enrich risk and severity features | file landing zone then curated tables | Include wind, rainfall, temperature, humidity, and alert category |
| Citizen or field reports | Show semi-structured ingestion and schema drift | JSON landing zone | Include optional fields to demonstrate evolution and rescued data |
| Resource deployments | Support response analysis and application experience | relational source or curated table | Track crew, vehicle, aircraft, and current assignment |
| Geographic reference data | Join to regions and service boundaries | curated reference table | Useful for maps and regional rollups |

## Proposed medallion progression

### Bronze
* raw incident snapshots or foreign access surface
* raw weather file ingestion
* raw JSON field reports
* raw resource deployment extracts

### Silver
* conformed incident records
* parsed and normalised weather observations
* parsed citizen reports with sensitive fields tagged or masked
* validated resource records
* enriched joins to region and agency dimensions

### Gold
* incident command summary by region and time window
* response time and SLA metrics
* resource pressure indicators
* severity prediction output table
* executive dashboard facts for Genie and app consumption

## Data quality checks to demonstrate

* mandatory incident identifier and timestamp
* allowed incident categories and agency codes
* latitude and longitude in valid range
* non-negative response durations
* weather timestamps aligned to observation window
* null handling for optional citizen-reported attributes

## Asset stack to prepare

| Asset type | Role in the session |
| --- | --- |
| Gateway-connected source or equivalent governed access pattern | Opens the story with existing systems |
| Ingestion flow | Brings in new landing-zone data |
| Transformation pipeline | Turns raw feeds into trusted tables |
| Curated tables | Power dashboards, Genie, modelling, and app views |
| Model or scored output | Demonstrates predictive prioritisation |
| Discover domains and pages | Publish shared language and meaning |
| Genie space | Natural-language exploration surface |
| AI/BI dashboard | Executive situational awareness |
| Databricks app | Operational end-state |

## Dependency order

1. finalise table design and naming
2. prepare synthetic source data
3. stand up governed source access and ingestion inputs
4. build transformation and quality flow
5. create gold metrics and scored outputs
6. publish ontology content
7. configure Genie over curated assets
8. assemble the final dashboard and app experience

## Implementation note

The gold layer should be the common serving surface for ontology references, Genie, dashboards, and the app. This keeps the story simple and avoids explaining multiple overlapping semantic layers during the session.
