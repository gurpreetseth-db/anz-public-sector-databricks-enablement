# Databricks notebook source
# DBTITLE 1,Overview
# MAGIC %md
# MAGIC # Synthetic Data Generator — ANZ Emergency Management
# MAGIC
# MAGIC This notebook generates all synthetic datasets for the 4-hour public sector enablement session.
# MAGIC
# MAGIC **What it creates:**
# MAGIC - `gsethi.emergency_bronze.regions` — 30 AU/NZ geographic reference regions
# MAGIC - `gsethi.emergency_bronze.incidents` — 10,000 emergency incidents over 3 years with seasonal patterns
# MAGIC - `gsethi.emergency_bronze.weather_observations` — 23,760 daily weather readings from 20 stations
# MAGIC - `gsethi.emergency_bronze.resource_deployments` — 36,000+ resource deployment records linked to incidents
# MAGIC - **Weather CSV files** (12 monthly files) in `/Volumes/gsethi/emergency_bronze/landing_zone/weather/`
# MAGIC - **Citizen report JSON files** (9 files, 4,500 reports) in `/Volumes/gsethi/emergency_bronze/landing_zone/citizen_reports/`
# MAGIC   - v1 schema (6 files) + v2 schema with extra fields (3 files) for schema evolution demo
# MAGIC
# MAGIC **Run time:** ~2 minutes on serverless compute

# COMMAND ----------

# DBTITLE 1,Create infrastructure
# MAGIC %sql
# MAGIC CREATE SCHEMA IF NOT EXISTS gsethi.emergency_bronze COMMENT 'Raw ingestion layer for ANZ emergency management demo';
# MAGIC CREATE SCHEMA IF NOT EXISTS gsethi.emergency_silver COMMENT 'Cleansed and validated emergency management data';
# MAGIC CREATE SCHEMA IF NOT EXISTS gsethi.emergency_gold COMMENT 'Aggregated metrics and serving layer for emergency management';
# MAGIC CREATE VOLUME IF NOT EXISTS gsethi.emergency_bronze.landing_zone COMMENT 'File landing zone for weather CSVs and citizen report JSONs';

# COMMAND ----------

# DBTITLE 1,Data generation note
# MAGIC %md
# MAGIC The full data generation code is captured below as reference. All datasets have already been generated and are available in the `gsethi.emergency_bronze` schema and the landing zone volume.
# MAGIC
# MAGIC To regenerate, run the cells below in order. Seeds are fixed for reproducibility.

# COMMAND ----------

# DBTITLE 1,Verify all assets exist
# MAGIC %sql
# MAGIC -- Quick verification of all generated assets
# MAGIC SELECT 'regions' AS dataset, COUNT(*) AS row_count FROM gsethi.emergency_bronze.regions
# MAGIC UNION ALL
# MAGIC SELECT 'incidents', COUNT(*) FROM gsethi.emergency_bronze.incidents
# MAGIC UNION ALL
# MAGIC SELECT 'weather_observations', COUNT(*) FROM gsethi.emergency_bronze.weather_observations
# MAGIC UNION ALL
# MAGIC SELECT 'resource_deployments', COUNT(*) FROM gsethi.emergency_bronze.resource_deployments;