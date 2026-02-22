SELECT cron.schedule(
  'phone-alert-scheduler-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kuxpsfxkumbfuqsvcucx.supabase.co/functions/v1/phone-alert-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1eHBzZnhrdW1iZnVxc3ZjdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTMwMDcsImV4cCI6MjA4NTU4OTAwN30.Ow_rO5MmbE-6fRYQ-E5Bxbd_0zXr70qURQAgqIGGm5s"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);