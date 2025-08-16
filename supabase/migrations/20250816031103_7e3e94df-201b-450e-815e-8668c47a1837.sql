-- Create helper function to refresh all materialized views
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $$
BEGIN
    -- Refresh all materialized views in order
    REFRESH MATERIALIZED VIEW private.mv_model_stats_7d;
    REFRESH MATERIALIZED VIEW private.mv_model_stats_30d;
    REFRESH MATERIALIZED VIEW private.mv_top_reels_30d;
    REFRESH MATERIALIZED VIEW private.mv_reels_cadence_30d;
    
    -- Log the refresh for monitoring
    INSERT INTO public.event_logs (event, level, context, page)
    VALUES ('materialized_views:refreshed', 'info', '{"views": ["mv_model_stats_7d", "mv_model_stats_30d", "mv_top_reels_30d", "mv_reels_cadence_30d"]}'::jsonb, 'system');
END;
$$;