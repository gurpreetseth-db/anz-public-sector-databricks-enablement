-- =============================================================================
-- GOLD LAYER: Resource pressure indicators by region, type, and month
-- Target schema: gsethi.emergency_gold
-- Serves: Capacity planning, resource allocation decisions
-- =============================================================================
USE SCHEMA emergency_gold;

CREATE OR REFRESH MATERIALIZED VIEW gold_resource_pressure
COMMENT 'Monthly resource deployment intensity and utilisation metrics'
AS
SELECT
  d.region_code,
  d.resource_type,
  d.agency,
  date_trunc('month', d.deployed_at)          AS deployment_month,
  count(*)                                     AS deployments,
  round(avg(d.deployment_duration_hours), 1)   AS avg_duration_hours,
  count(DISTINCT d.resource_id)                AS unique_resources_used
FROM gsethi.emergency_silver.silver_resource_deployments d
JOIN gsethi.emergency_silver.silver_incidents i
  ON d.incident_id = i.incident_id
GROUP BY ALL;
