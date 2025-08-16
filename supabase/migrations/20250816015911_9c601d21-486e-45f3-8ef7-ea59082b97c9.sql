-- Phase 1: Database Schema Updates for ModelFlow

-- Update models table with Apify-related fields
ALTER TABLE public.models 
ADD COLUMN IF NOT EXISTS apify_task_id text,
ADD COLUMN IF NOT EXISTS secure_blob jsonb,
ADD COLUMN IF NOT EXISTS last_backfill_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_daily_scrape_at timestamp with time zone;

-- Update reels table with missing fields
ALTER TABLE public.reels
ADD COLUMN IF NOT EXISTS platform_post_id text,
ADD COLUMN IF NOT EXISTS duration_seconds integer,
ADD COLUMN IF NOT EXISTS hashtags text[],
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add unique constraint for platform_post_id per workspace
CREATE UNIQUE INDEX IF NOT EXISTS reels_workspace_platform_post_id_unique 
ON public.reels (workspace_id, platform_post_id);

-- Update reel_metrics_daily to use day field and add missing metrics
ALTER TABLE public.reel_metrics_daily
ADD COLUMN IF NOT EXISTS day date,
ADD COLUMN IF NOT EXISTS watch_time_seconds integer;

-- Migrate existing data from date column to day column if needed
UPDATE public.reel_metrics_daily 
SET day = date::date 
WHERE day IS NULL AND date IS NOT NULL;

-- Drop the old date column and make day NOT NULL
ALTER TABLE public.reel_metrics_daily 
DROP COLUMN IF EXISTS date,
ALTER COLUMN day SET NOT NULL;

-- Update primary key for reel_metrics_daily
ALTER TABLE public.reel_metrics_daily 
DROP CONSTRAINT IF EXISTS reel_metrics_daily_pkey;

ALTER TABLE public.reel_metrics_daily 
ADD CONSTRAINT reel_metrics_daily_pkey PRIMARY KEY (day, reel_id);

-- Update webhooks_inbox with proper dedupe_key and unique constraints
ALTER TABLE public.webhooks_inbox
ADD COLUMN IF NOT EXISTS dedupe_key text;

-- Create unique constraint for source + dedupe_key
CREATE UNIQUE INDEX IF NOT EXISTS webhooks_inbox_source_dedupe_key_unique 
ON public.webhooks_inbox (source, dedupe_key);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS reels_workspace_posted_at_idx 
ON public.reels (workspace_id, posted_at DESC);

CREATE INDEX IF NOT EXISTS reel_metrics_daily_workspace_day_idx 
ON public.reel_metrics_daily (workspace_id, day DESC);

CREATE INDEX IF NOT EXISTS reel_metrics_daily_model_day_idx 
ON public.reel_metrics_daily (model_id, day DESC);

CREATE INDEX IF NOT EXISTS models_workspace_enabled_idx 
ON public.models (workspace_id, status) WHERE status = 'enabled';

-- Create helper function for workspace membership checking
CREATE OR REPLACE FUNCTION public.user_in_workspace(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = target_workspace_id 
    AND user_id = auth.uid()
  );
$$;