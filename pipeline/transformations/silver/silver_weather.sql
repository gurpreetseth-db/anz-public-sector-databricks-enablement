-- =============================================================================
-- SILVER LAYER: Validated weather observations
-- Target schema: gsethi.emergency_silver
-- =============================================================================
USE SCHEMA emergency_silver;

CREATE OR REFRESH STREAMING TABLE silver_weather (
  CONSTRAINT valid_station_id   EXPECT (station_id IS NOT NULL)         ON VIOLATION DROP ROW,
  CONSTRAINT valid_temperature  EXPECT (temperature_c BETWEEN -20 AND 55),
  CONSTRAINT valid_humidity     EXPECT (humidity_pct BETWEEN 0 AND 100),
  CONSTRAINT valid_wind_speed   EXPECT (wind_speed_kmh >= 0),
  CONSTRAINT valid_fdi          EXPECT (fire_danger_index >= 0)
)
COMMENT 'Validated weather observations with type-safe columns'
AS
SELECT
  station_id,
  station_name,
  CAST(observation_time AS TIMESTAMP) AS observation_time,
  CAST(temperature_c AS DOUBLE)       AS temperature_c,
  CAST(humidity_pct AS INT)           AS humidity_pct,
  CAST(wind_speed_kmh AS DOUBLE)      AS wind_speed_kmh,
  wind_direction,
  CAST(rainfall_mm AS DOUBLE)         AS rainfall_mm,
  CAST(pressure_hpa AS DOUBLE)        AS pressure_hpa,
  CAST(fire_danger_index AS DOUBLE)   AS fire_danger_index,
  alert_category,
  CAST(latitude AS DOUBLE)            AS latitude,
  CAST(longitude AS DOUBLE)           AS longitude,
  state,
  country
FROM STREAM(gsethi.emergency_bronze.bronze_weather_landing);
