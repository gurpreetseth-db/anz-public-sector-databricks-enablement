-- =============================================================================
-- SILVER LAYER: Validated resource deployment records
-- Target schema: gsethi.emergency_silver
-- =============================================================================
USE SCHEMA emergency_silver;

CREATE OR REFRESH MATERIALIZED VIEW silver_resource_deployments (
  CONSTRAINT valid_deployment_id  EXPECT (deployment_id IS NOT NULL)  ON VIOLATION DROP ROW,
  CONSTRAINT valid_incident_id    EXPECT (incident_id IS NOT NULL)    ON VIOLATION DROP ROW,
  CONSTRAINT valid_resource_type  EXPECT (resource_type IS NOT NULL)
)
COMMENT 'Validated resource deployments with duration computation'
AS
SELECT
  deployment_id,
  resource_type,
  resource_id,
  agency,
  incident_id,
  deployed_at,
  released_at,
  status,
  base_station,
  region_code,
  CASE
    WHEN released_at IS NOT NULL
    THEN ROUND(timestampdiff(MINUTE, deployed_at, released_at) / 60.0, 1)
    ELSE NULL
  END AS deployment_duration_hours
FROM gsethi.emergency_bronze.resource_deployments;
