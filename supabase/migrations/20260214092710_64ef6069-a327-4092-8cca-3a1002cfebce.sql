INSERT INTO public.site_settings (key, value, description)
VALUES ('daily_chat_quota', '{"limit": 100}'::jsonb, '사용자 일일 AI 채팅 할당량')
ON CONFLICT (key) DO NOTHING;