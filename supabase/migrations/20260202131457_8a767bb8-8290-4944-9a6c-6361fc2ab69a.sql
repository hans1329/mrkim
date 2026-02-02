-- 1. 공지사항 테이블
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'notice' CHECK (type IN ('notice', 'update', 'event', 'maintenance')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_popup BOOLEAN NOT NULL DEFAULT false,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements"
  ON public.announcements FOR SELECT
  USING (is_active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()));

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. 푸시 알림 캠페인 테이블
CREATE TABLE public.push_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'role', 'specific')),
  target_roles TEXT[],
  target_user_ids UUID[],
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  sent_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage push campaigns"
  ON public.push_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_push_campaigns_updated_at
  BEFORE UPDATE ON public.push_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. 사용자 피드백/문의 테이블
CREATE TABLE public.user_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature', 'billing', 'other')),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  admin_notes TEXT,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all feedback"
  ON public.user_feedback FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. API 사용량 로그 테이블
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL CHECK (service IN ('gemini', 'elevenlabs', 'twilio')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  duration_ms INTEGER,
  cost_estimate NUMERIC(10, 6) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all API logs"
  ON public.api_usage_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert API logs"
  ON public.api_usage_logs FOR INSERT
  WITH CHECK (true);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_api_usage_logs_service_created ON public.api_usage_logs(service, created_at DESC);
CREATE INDEX idx_api_usage_logs_user_created ON public.api_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_announcements_active ON public.announcements(is_active, start_at, end_at);
CREATE INDEX idx_user_feedback_status ON public.user_feedback(status, created_at DESC);