-- =============================================================================
-- BRONZE LAYER: Auto Loader ingestion from UC Volume landing zone
-- Target schema: gsethi.emergency_bronze (pipeline default)
-- =============================================================================

-- Weather observations: 12 monthly CSV files from Bureau of Meteorology / NIWA
CREATE OR REFRESH STREAMING TABLE bronze_weather_landing
COMMENT 'Raw weather observations ingested via Auto Loader from CSV landing zone'
AS SELECT * FROM STREAM(read_files(
  '/Volumes/gsethi/emergency_bronze/landing_zone/weather/',
  format => 'csv',
  header => true,
  rescuedDataColumn => '_rescued_data',
  schemaEvolutionMode => 'addNewColumns'
));

-- Citizen emergency reports: JSON lines files with schema evolution
-- v1 (Jan-Jun): base fields + optional photo_url
-- v2 (Jul-Sep): adds video_url, number_of_people_affected, accessibility_needs
CREATE OR REFRESH STREAMING TABLE bronze_citizen_reports
COMMENT 'Raw citizen emergency reports ingested via Auto Loader from JSON landing zone'
AS SELECT * FROM STREAM(read_files(
  '/Volumes/gsethi/emergency_bronze/landing_zone/citizen_reports/',
  format => 'json',
  multiLine => false,
  rescuedDataColumn => '_rescued_data',
  schemaEvolutionMode => 'addNewColumns'
));
