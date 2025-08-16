-- Fix security warnings: Disable RLS and API access for materialized views
-- These views should only be accessed through the api_dashboard_bundle RPC

-- Disable API access for materialized views by creating policies that deny all access
-- This prevents direct access via PostgREST while still allowing RPC functions to use them

ALTER TABLE mv_model_stats_7d ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_model_stats_30d ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_top_reels_30d ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_reels_cadence_30d ENABLE ROW LEVEL SECURITY;

-- Create policies that deny all direct access to materialized views
-- These views should only be accessed through the api_dashboard_bundle RPC function

CREATE POLICY "Deny all access to mv_model_stats_7d" ON mv_model_stats_7d
FOR ALL USING (false);

CREATE POLICY "Deny all access to mv_model_stats_30d" ON mv_model_stats_30d
FOR ALL USING (false);

CREATE POLICY "Deny all access to mv_top_reels_30d" ON mv_top_reels_30d
FOR ALL USING (false);

CREATE POLICY "Deny all access to mv_reels_cadence_30d" ON mv_reels_cadence_30d
FOR ALL USING (false);