
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule sync-orchestrator every 6 hours
SELECT cron.schedule(
  'sync-orchestrator-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kuxpsfxkumbfuqsvcucx.supabase.co/functions/v1/sync-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1eHBzZnhrdW1iZnVxc3ZjdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTMwMDcsImV4cCI6MjA4NTU4OTAwN30.Ow_rO5MmbE-6fRYQ-E5Bxbd_0zXr70qURQAgqIGGm5s"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
