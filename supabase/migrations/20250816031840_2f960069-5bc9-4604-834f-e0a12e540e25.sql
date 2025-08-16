-- Add missing environment variable support for edge function URLs
-- This is handled at the application level, no database changes needed

-- Ensure process_inbox edge function can be called via HTTP GET/POST
-- This will be handled in the edge function code

-- No database migration needed for this functionality