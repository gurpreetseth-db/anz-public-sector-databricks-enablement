-- =============================================================================
-- SILVER LAYER: Citizen reports with PII masking and validation
-- Target schema: gsethi.emergency_silver
-- PII MASKING: citizen_name, citizen_phone, citizen_email → 'REDACTED'
-- =============================================================================
USE SCHEMA emergency_silver;

CREATE OR REFRESH STREAMING TABLE silver_citizen_reports (
  CONSTRAINT valid_report_id   EXPECT (report_id IS NOT NULL)                   ON VIOLATION DROP ROW,
  CONSTRAINT valid_reported_at EXPECT (reported_at IS NOT NULL)                 ON VIOLATION DROP ROW,
  CONSTRAINT valid_urgency     EXPECT (urgency IN ('low', 'medium', 'high'))
)
COMMENT 'Citizen emergency reports with PII redacted for governance compliance'
AS
SELECT
  report_id,

  -- PII masking: redact citizen identity fields
  'REDACTED' AS citizen_name,
  'REDACTED' AS citizen_phone,
  'REDACTED' AS citizen_email,

  location_description,
  latitude,
  longitude,
  incident_type_reported,
  description,
  CAST(reported_at AS TIMESTAMP) AS reported_at,
  urgency,
  photo_url,

  -- Schema v2 fields (NULL for v1 records, populated for v2)
  video_url,
  number_of_people_affected,
  accessibility_needs
FROM STREAM(gsethi.emergency_bronze.bronze_citizen_reports);
