
-- 전화 긴급 알림 설정 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_alert_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_alert_items jsonb DEFAULT '["tax_deadline", "large_transaction", "salary_reminder", "sales_spike"]'::jsonb,
  ADD COLUMN IF NOT EXISTS phone_alert_times jsonb DEFAULT '["10"]'::jsonb,
  ADD COLUMN IF NOT EXISTS phone_alert_custom_message text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phone_alert_custom_time text DEFAULT NULL;
