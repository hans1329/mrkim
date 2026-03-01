
-- 프로필에 밴 상태 컬럼 추가
ALTER TABLE public.profiles
ADD COLUMN is_banned boolean NOT NULL DEFAULT false,
ADD COLUMN banned_at timestamp with time zone,
ADD COLUMN ban_reason text;
