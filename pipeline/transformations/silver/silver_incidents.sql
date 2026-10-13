-- =============================================================================
-- SILVER LAYER: Cleansed and validated incident records
-- Target schema: gsethi.emergency_silver
-- =============================================================================
USE SCHEMA emergency_silver;

CREATE OR REFRESH MATERIALIZED VIEW silver_incidents (
  -- Critical fields: drop rows missing identity or timestamp
  CONSTRAINT valid_incident_id      EXPECT (incident_id IS NOT NULL)  ON VIOLATION DROP ROW,
  CONSTRAINT valid_reported_at      EXPECT (reported_at IS NOT NULL)  ON VIOLATION DROP ROW,
  -- Value range checks: warn but retain for investigation
  CONSTRAINT valid_incident_type    EXPECT (incident_type IN ('bushfire','flood','storm','cyclone','earthquake','hazmat','rescue','medical_mass_casualty')),
  CONSTRAINT valid_severity         EXPECT (severity IN ('low','medium','high','critical')),
  CONSTRAINT valid_latitude         EXPECT (latitude BETWEEN -50 AND 0),
  CONSTRAINT valid_longitude        EXPECT (longitude BETWEEN 100 AND 180),
  CONSTRAINT non_negative_casualties        EXPECT (casualties >= 0),
  CONSTRAINT non_negative_properties        EXPECT (properties_affected >= 0)
)
COMMENT 'Validated emergency incidents with response time computation'
AS
SELECT
  incident_id,
  incident_type,
  severity,
  reported_at,
  responded_at,
  resolved_at,
  latitude,
  longitude,
  region_code,
  country,
  lead_agency,
  status,
  casualties,
  properties_affected,
  timestampdiff(MINUTE, reported_at, responded_at) AS response_time_minutes
FROM gsethi.emergency_bronze.incidents;
