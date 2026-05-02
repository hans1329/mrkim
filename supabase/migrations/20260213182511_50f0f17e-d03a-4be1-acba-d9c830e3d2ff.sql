
-- 디바이스 푸시 토큰 저장 테이블
CREATE TABLE public.device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'web',  -- 'web' | 'android' | 'ios'
  device_info jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- RLS 활성화
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- 사용자 자신의 토큰만 관리
CREATE POLICY "Users can view their own tokens"
  ON public.device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON public.device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON public.device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 관리자는 푸시 발송을 위해 모든 토큰 조회 가능
CREATE POLICY "Admins can view all tokens"
  ON public.device_tokens FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 인덱스
CREATE INDEX idx_device_tokens_user_id ON public.device_tokens(user_id);
CREATE INDEX idx_device_tokens_platform ON public.device_tokens(platform);
CREATE INDEX idx_device_tokens_active ON public.device_tokens(is_active) WHERE is_active = true;
