-- Event logs table for analytics and debug tracking
CREATE TABLE IF NOT EXISTS public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ DEFAULT now(),
  level TEXT CHECK (level IN ('info','warn','error','debug')) DEFAULT 'info',
  event TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  page TEXT,
  user_agent TEXT,
  ip INET,
  workspace_id UUID NULL
);

-- Index for efficient querying by timestamp
CREATE INDEX IF NOT EXISTS event_logs_ts_idx ON public.event_logs (ts DESC);

-- Cron status table for monitoring scheduled jobs
CREATE TABLE IF NOT EXISTS public.cron_status (
  name TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ,
  last_ok BOOLEAN DEFAULT false,
  last_message TEXT
);

-- Enable RLS on event_logs (allow public insert for analytics)
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert events (for public analytics)
CREATE POLICY "Allow public insert on event_logs" 
ON public.event_logs 
FOR INSERT 
WITH CHECK (true);

-- Allow workspace members to view their events
CREATE POLICY "Users can view events in their workspaces" 
ON public.event_logs 
FOR SELECT 
USING (workspace_id IS NULL OR is_workspace_member(workspace_id, auth.uid()));

-- Enable RLS on cron_status
ALTER TABLE public.cron_status ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view cron status
CREATE POLICY "Users can view cron status" 
ON public.cron_status 
FOR SELECT 
USING (true);

-- Allow system to update cron status
CREATE POLICY "System can update cron status" 
ON public.cron_status 
FOR ALL 
USING (true);