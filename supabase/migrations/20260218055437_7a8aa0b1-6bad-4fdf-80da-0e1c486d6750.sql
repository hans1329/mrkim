-- briefing_times 컬럼 추가 (선택한 시간대 배열: ["9", "12", "18", "22"])
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS briefing_times jsonb DEFAULT '["9"]'::jsonb;

-- 기존 briefing_frequency 값을 briefing_times로 마이그레이션
UPDATE public.profiles
SET briefing_times = CASE
  WHEN briefing_frequency = 'realtime' THEN '["9", "12", "18", "22"]'::jsonb
  WHEN briefing_frequency = 'daily' THEN '["9"]'::jsonb
  WHEN briefing_frequency = 'weekly' THEN '["9"]'::jsonb
  ELSE '["9"]'::jsonb
END
WHERE briefing_times IS NULL OR briefing_times = '["9"]'::jsonb;