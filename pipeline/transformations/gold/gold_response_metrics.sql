-- =============================================================================
-- GOLD LAYER: Response time metrics by region, agency, type, and quarter
-- Target schema: gsethi.emergency_gold
-- Serves: SLA monitoring, agency performance comparison
-- =============================================================================
USE SCHEMA emergency_gold;

CREATE OR REFRESH MATERIALIZED VIEW gold_response_metrics
COMMENT 'Quarterly response time statistics including SLA compliance by agency and incident type'
AS
SELECT
  region_code,
  lead_agency,
  incident_type,
  date_trunc('quarter', reported_at)                              AS quarter,
  count(*)                                                        AS incidents,
  round(avg(response_time_minutes), 1)                            AS avg_response_min,
  percentile_approx(response_time_minutes, 0.5)                   AS median_response_min,
  percentile_approx(response_time_minutes, 0.9)                   AS p90_response_min,
  sum(CASE WHEN response_time_minutes <= 15 THEN 1 ELSE 0 END)   AS within_sla_count
FROM gsethi.emergency_silver.silver_incidents
GROUP BY ALL;
