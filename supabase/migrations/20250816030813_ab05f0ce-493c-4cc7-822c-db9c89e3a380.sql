-- Create materialized views for dashboard performance

-- 1) mv_model_stats_7d: 7-day stats per model
CREATE MATERIALIZED VIEW mv_model_stats_7d AS
SELECT 
    r.model_id,
    SUM(rmd.views) as total_views,
    SUM(rmd.likes) as total_likes,
    SUM(rmd.comments) as total_comments,
    COUNT(DISTINCT r.id) as reels_count
FROM reels r
LEFT JOIN reel_metrics_daily rmd ON r.id = rmd.reel_id
WHERE r.posted_at >= NOW() - INTERVAL '7 days'
GROUP BY r.model_id;

-- 2) mv_model_stats_30d: 30-day stats per model with username
CREATE MATERIALIZED VIEW mv_model_stats_30d AS
SELECT 
    r.model_id,
    m.username as instagram_username,
    SUM(rmd.views) as total_views,
    SUM(rmd.likes) as total_likes,
    SUM(rmd.comments) as total_comments,
    COUNT(DISTINCT r.id) as reels_count
FROM reels r
LEFT JOIN reel_metrics_daily rmd ON r.id = rmd.reel_id
LEFT JOIN models m ON r.model_id = m.id
WHERE r.posted_at >= NOW() - INTERVAL '30 days'
GROUP BY r.model_id, m.username;

-- 3) mv_top_reels_30d: Top reels in last 30 days
CREATE MATERIALIZED VIEW mv_top_reels_30d AS
SELECT 
    r.id as reel_id,
    r.model_id,
    r.caption,
    r.url,
    r.thumbnail_url,
    r.posted_at,
    m.username,
    m.display_name,
    SUM(rmd.views) as total_views,
    SUM(rmd.likes) as total_likes,
    SUM(rmd.comments) as total_comments
FROM reels r
LEFT JOIN reel_metrics_daily rmd ON r.id = rmd.reel_id
LEFT JOIN models m ON r.model_id = m.id
WHERE r.posted_at >= NOW() - INTERVAL '30 days'
GROUP BY r.id, r.model_id, r.caption, r.url, r.thumbnail_url, r.posted_at, m.username, m.display_name
ORDER BY SUM(rmd.views) DESC;

-- 4) mv_reels_cadence_30d: Daily posting cadence per model
CREATE MATERIALIZED VIEW mv_reels_cadence_30d AS
SELECT 
    r.model_id,
    DATE(r.posted_at) as post_date,
    COUNT(*) as reels_count
FROM reels r
WHERE r.posted_at >= NOW() - INTERVAL '30 days'
GROUP BY r.model_id, DATE(r.posted_at)
ORDER BY post_date;

-- Create indexes for better performance
CREATE INDEX idx_mv_model_stats_7d_model_id ON mv_model_stats_7d(model_id);
CREATE INDEX idx_mv_model_stats_30d_model_id ON mv_model_stats_30d(model_id);
CREATE INDEX idx_mv_top_reels_30d_views ON mv_top_reels_30d(total_views DESC);
CREATE INDEX idx_mv_reels_cadence_30d_model_date ON mv_reels_cadence_30d(model_id, post_date);

-- 5) Create api_dashboard_bundle RPC function
CREATE OR REPLACE FUNCTION api_dashboard_bundle(model_ids uuid[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{}';
    s7_data jsonb;
    s30_data jsonb;
    top_data jsonb;
    cad_data jsonb;
    seven_days_ago timestamp with time zone;
    prev_seven_days_ago timestamp with time zone;
BEGIN
    seven_days_ago := NOW() - INTERVAL '7 days';
    prev_seven_days_ago := NOW() - INTERVAL '14 days';
    
    -- Get 7-day aggregated stats (s7)
    WITH filtered_7d AS (
        SELECT * FROM mv_model_stats_7d 
        WHERE (model_ids IS NULL OR model_id = ANY(model_ids))
    ),
    prev_7d_stats AS (
        SELECT 
            SUM(rmd.views) as prev_views
        FROM reels r
        LEFT JOIN reel_metrics_daily rmd ON r.id = rmd.reel_id
        WHERE r.posted_at >= prev_seven_days_ago 
        AND r.posted_at < seven_days_ago
        AND (model_ids IS NULL OR r.model_id = ANY(model_ids))
    )
    SELECT jsonb_build_object(
        'views7d', COALESCE(SUM(f.total_views), 0),
        'likes7d', COALESCE(SUM(f.total_likes), 0),
        'comments7d', COALESCE(SUM(f.total_comments), 0),
        'reelsCount7d', COALESCE(SUM(f.reels_count), 0),
        'momentumDown', CASE 
            WHEN p.prev_views > 0 THEN COALESCE(SUM(f.total_views), 0) < (p.prev_views * 0.75)
            ELSE false 
        END
    ) INTO s7_data
    FROM filtered_7d f
    CROSS JOIN prev_7d_stats p;
    
    -- Get 30-day aggregated stats (s30)
    WITH filtered_30d AS (
        SELECT * FROM mv_model_stats_30d 
        WHERE (model_ids IS NULL OR model_id = ANY(model_ids))
    )
    SELECT jsonb_build_object(
        'views30d', COALESCE(SUM(total_views), 0),
        'likes30d', COALESCE(SUM(total_likes), 0),
        'comments30d', COALESCE(SUM(total_comments), 0),
        'reelsCount30d', COALESCE(SUM(reels_count), 0),
        'avgViewsPerReel30d', CASE 
            WHEN COALESCE(SUM(reels_count), 0) > 0 
            THEN COALESCE(SUM(total_views), 0)::float / COALESCE(SUM(reels_count), 1)
            ELSE 0 
        END,
        'engagementPer1k30d', CASE 
            WHEN COALESCE(SUM(total_views), 0) > 0 
            THEN ((COALESCE(SUM(total_likes), 0) + COALESCE(SUM(total_comments), 0))::float / COALESCE(SUM(total_views), 1)) * 1000
            ELSE 0 
        END
    ) INTO s30_data
    FROM filtered_30d;
    
    -- Get top 10 reels (top)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', reel_id,
            'caption', caption,
            'url', url,
            'thumbnail_url', thumbnail_url,
            'posted_at', posted_at,
            'username', username,
            'display_name', display_name,
            'views', COALESCE(total_views, 0),
            'likes', COALESCE(total_likes, 0),
            'comments', COALESCE(total_comments, 0)
        )
    ) INTO top_data
    FROM (
        SELECT * FROM mv_top_reels_30d 
        WHERE (model_ids IS NULL OR model_id = ANY(model_ids))
        ORDER BY total_views DESC NULLS LAST
        LIMIT 10
    ) top_reels;
    
    -- Get cadence data (cad) - fill missing dates with 0
    WITH date_series AS (
        SELECT generate_series(
            (NOW() - INTERVAL '29 days')::date,
            NOW()::date,
            '1 day'::interval
        )::date as day
    ),
    cadence_data AS (
        SELECT 
            post_date,
            SUM(reels_count) as daily_reels
        FROM mv_reels_cadence_30d 
        WHERE (model_ids IS NULL OR model_id = ANY(model_ids))
        GROUP BY post_date
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'day', ds.day,
            'reels', COALESCE(cd.daily_reels, 0)
        ) ORDER BY ds.day
    ) INTO cad_data
    FROM date_series ds
    LEFT JOIN cadence_data cd ON ds.day = cd.post_date;
    
    -- Build final result combining s7 and s30 into kpis
    result := jsonb_build_object(
        'kpis', s7_data || s30_data,
        'topReels', COALESCE(top_data, '[]'::jsonb),
        'cadence', COALESCE(cad_data, '[]'::jsonb)
    );
    
    RETURN result;
END;
$$;