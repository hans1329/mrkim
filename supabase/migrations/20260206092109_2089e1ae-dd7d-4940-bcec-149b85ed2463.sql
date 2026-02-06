-- AI 인사이트 캐시 테이블
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('suggestion', 'warning', 'positive', 'action')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT,
  data_snapshot JSONB,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 day'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_ai_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_ai_insights_expires_at ON public.ai_insights(expires_at);

-- RLS 활성화
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- 사용자별 정책
CREATE POLICY "Users can view their own insights"
ON public.ai_insights FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights"
ON public.ai_insights FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights"
ON public.ai_insights FOR DELETE
USING (auth.uid() = user_id);