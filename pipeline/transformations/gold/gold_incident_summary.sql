-- =============================================================================
-- GOLD LAYER: Incident summary by region, type, severity, and month
-- Target schema: gsethi.emergency_gold
-- Serves: Genie, executive dashboard, operational app
-- =============================================================================
USE SCHEMA emergency_gold;

CREATE OR REFRESH MATERIALIZED VIEW gold_incident_summary
COMMENT 'Monthly incident counts and impact metrics by region, type, and severity'
AS
SELECT
  i.region_code,
  r.region_name,
  r.state,
  r.country,
  i.incident_type,
  i.severity,
  date_trunc('month', i.reported_at)     AS incident_month,
  count(*)                                AS incident_count,
  sum(i.casualties)                       AS total_casualties,
  sum(i.properties_affected)              AS total_properties_affected,
  round(avg(i.response_time_minutes), 1)  AS avg_response_minutes
FROM gsethi.emergency_silver.silver_incidents i
JOIN gsethi.emergency_bronze.regions r
  ON i.region_code = r.region_code
GROUP BY ALL;
