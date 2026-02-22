
-- AI 대리 통화 로그 테이블
CREATE TABLE public.ai_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'briefing',
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  script TEXT NOT NULL,
  tts_audio_url TEXT,
  twilio_call_sid TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  duration_seconds INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;

-- 사용자 본인 통화 기록만 조회
CREATE POLICY "Users can view their own call logs"
  ON public.ai_call_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자 본인 통화 요청만 생성
CREATE POLICY "Users can create their own call logs"
  ON public.ai_call_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 서비스 롤에서 업데이트 (엣지 함수용)
CREATE POLICY "Service role can update call logs"
  ON public.ai_call_logs FOR UPDATE
  USING (true);

-- updated_at 자동 갱신
CREATE TRIGGER update_ai_call_logs_updated_at
  BEFORE UPDATE ON public.ai_call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 인덱스
CREATE INDEX idx_ai_call_logs_user_id ON public.ai_call_logs(user_id);
CREATE INDEX idx_ai_call_logs_status ON public.ai_call_logs(status);
