-- Fix Edge Functions to use correct schema fields
-- Update enable_model to use 'status' instead of 'enabled'
-- Add api_dashboard_bundle RPC function for efficient dashboard data fetching

-- Create RPC function for dashboard bundle
CREATE OR REPLACE FUNCTION api_dashboard_bundle(model_ids uuid[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb := '{}';
    seven_days_ago timestamp with time zone;
    thirty_days_ago timestamp with time zone;
    prev_seven_days_ago timestamp with time zone;
    kpis jsonb;
    top_reels jsonb;
    cadence jsonb;
BEGIN
    -- Calculate date ranges
    seven_days_ago := now() - interval '7 days';
    thirty_days_ago := now() - interval '30 days';
    prev_seven_days_ago := now() - interval '14 days';
    
    -- Get KPIs
    WITH reel_data AS (
        SELECT 
            r.*,
            rmd.views,
            rmd.likes,
            rmd.comments,
            CASE 
                WHEN r.posted_at >= seven_days_ago THEN '7d'
                WHEN r.posted_at >= prev_seven_days_ago AND r.posted_at < seven_days_ago THEN 'prev7d'
                ELSE '30d'
            END as period
        FROM reels r
        LEFT JOIN reel_metrics_daily rmd ON rmd.reel_id = r.id
        WHERE r.posted_at >= thirty_days_ago
        AND (model_ids IS NULL OR r.model_id = ANY(model_ids))
    ),
    kpi_calc AS (
        SELECT
            COALESCE(SUM(CASE WHEN period IN ('7d') THEN views END), 0) as views_7d,
            COALESCE(SUM(CASE WHEN period IN ('7d', '30d') THEN views END), 0) as views_30d,
            COALESCE(SUM(CASE WHEN period = 'prev7d' THEN views END), 0) as views_prev_7d,
            COALESCE(SUM(CASE WHEN period IN ('7d', '30d') THEN likes END), 0) as likes_30d,
            COALESCE(SUM(CASE WHEN period IN ('7d', '30d') THEN comments END), 0) as comments_30d,
            COUNT(CASE WHEN period IN ('7d', '30d') THEN 1 END) as reels_count_30d
        FROM reel_data
    )
    SELECT jsonb_build_object(
        'views7d', views_7d,
        'views30d', views_30d,
        'avgViewsPerReel30d', CASE WHEN reels_count_30d > 0 THEN views_30d::float / reels_count_30d ELSE 0 END,
        'engagementPer1k30d', CASE WHEN views_30d > 0 THEN ((likes_30d + comments_30d)::float / views_30d) * 1000 ELSE 0 END,
        'momentumDown', CASE WHEN views_prev_7d > 0 THEN views_7d < (views_prev_7d * 0.75) ELSE false END,
        'reelsCount30d', reels_count_30d
    ) INTO kpis
    FROM kpi_calc;
    
    -- Get top reels
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'caption', r.caption,
            'url', r.url,
            'thumbnail_url', r.thumbnail_url,
            'posted_at', r.posted_at,
            'username', m.username,
            'display_name', m.display_name,
            'views', COALESCE(rmd.views, 0),
            'likes', COALESCE(rmd.likes, 0),
            'comments', COALESCE(rmd.comments, 0)
        ) ORDER BY COALESCE(rmd.views, 0) DESC
    ) INTO top_reels
    FROM reels r
    LEFT JOIN models m ON m.id = r.model_id
    LEFT JOIN reel_metrics_daily rmd ON rmd.reel_id = r.id
    WHERE r.posted_at >= thirty_days_ago
    AND (model_ids IS NULL OR r.model_id = ANY(model_ids))
    ORDER BY COALESCE(rmd.views, 0) DESC
    LIMIT 5;
    
    -- Get cadence data
    WITH cadence_data AS (
        SELECT 
            date_trunc('day', r.posted_at)::date as day,
            COUNT(*) as reel_count
        FROM reels r
        WHERE r.posted_at >= thirty_days_ago
        AND (model_ids IS NULL OR r.model_id = ANY(model_ids))
        GROUP BY date_trunc('day', r.posted_at)::date
    ),
    full_date_range AS (
        SELECT generate_series(
            (now() - interval '29 days')::date,
            now()::date,
            '1 day'::interval
        )::date as day
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'day', fdr.day,
            'reels', COALESCE(cd.reel_count, 0)
        ) ORDER BY fdr.day
    ) INTO cadence
    FROM full_date_range fdr
    LEFT JOIN cadence_data cd ON cd.day = fdr.day;
    
    -- Build final result
    result := jsonb_build_object(
        'kpis', kpis,
        'topReels', COALESCE(top_reels, '[]'::jsonb),
        'cadence', COALESCE(cadence, '[]'::jsonb)
    );
    
    RETURN result;
END;
$$;