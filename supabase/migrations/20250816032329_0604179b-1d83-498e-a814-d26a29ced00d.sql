-- Fix the api_dashboard_bundle function SQL GROUP BY error
-- The issue is with the prev_7d_stats subquery in the s7 section

CREATE OR REPLACE FUNCTION public.api_dashboard_bundle(model_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
DECLARE
    result jsonb := '{}';
    s7_data jsonb;
    s30_data jsonb;
    top_data jsonb;
    cad_data jsonb;
    seven_days_ago timestamp with time zone;
    prev_seven_days_ago timestamp with time zone;
    prev_views_total bigint;
BEGIN
    seven_days_ago := NOW() - INTERVAL '7 days';
    prev_seven_days_ago := NOW() - INTERVAL '14 days';
    
    -- Calculate previous 7-day views total first
    SELECT COALESCE(SUM(rmd.views), 0) INTO prev_views_total
    FROM public.reels r
    LEFT JOIN public.reel_metrics_daily rmd ON r.id = rmd.reel_id
    WHERE r.posted_at >= prev_seven_days_ago 
    AND r.posted_at < seven_days_ago
    AND (model_ids IS NULL OR r.model_id = ANY(model_ids));
    
    -- Get 7-day aggregated stats (s7)
    WITH filtered_7d AS (
        SELECT * FROM private.mv_model_stats_7d 
        WHERE (model_ids IS NULL OR model_id = ANY(model_ids))
    )
    SELECT jsonb_build_object(
        'views7d', COALESCE(SUM(f.total_views), 0),
        'likes7d', COALESCE(SUM(f.total_likes), 0),
        'comments7d', COALESCE(SUM(f.total_comments), 0),
        'reelsCount7d', COALESCE(SUM(f.reels_count), 0),
        'momentumDown', CASE 
            WHEN prev_views_total > 0 THEN COALESCE(SUM(f.total_views), 0) < (prev_views_total * 0.75)
            ELSE false 
        END
    ) INTO s7_data
    FROM filtered_7d f;
    
    -- Get 30-day aggregated stats (s30)
    WITH filtered_30d AS (
        SELECT * FROM private.mv_model_stats_30d 
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
        SELECT * FROM private.mv_top_reels_30d 
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
        FROM private.mv_reels_cadence_30d 
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
$function$;