-- =============================================================================
-- GOLD LAYER: Weekly weather risk profile by station
-- Target schema: gsethi.emergency_gold
-- Serves: Risk correlation, fire danger monitoring
-- =============================================================================
USE SCHEMA emergency_gold;

CREATE OR REFRESH MATERIALIZED VIEW gold_weather_risk
COMMENT 'Weekly weather risk indicators including fire danger index and alert frequency'
AS
SELECT
  station_id,
  station_name,
  state,
  country,
  date_trunc('week', observation_time)                     AS week,
  round(avg(fire_danger_index), 1)                         AS avg_fdi,
  round(max(fire_danger_index), 1)                         AS max_fdi,
  round(sum(rainfall_mm), 1)                               AS total_rainfall_mm,
  round(avg(temperature_c), 1)                             AS avg_temp,
  round(max(temperature_c), 1)                             AS max_temp,
  count(CASE WHEN alert_category != 'none' THEN 1 END)    AS alert_days
FROM gsethi.emergency_silver.silver_weather
GROUP BY ALL;
