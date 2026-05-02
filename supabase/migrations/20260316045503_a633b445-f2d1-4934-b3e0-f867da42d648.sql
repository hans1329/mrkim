
-- 이메일 발송 이력 테이블
CREATE TABLE public.email_send_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  recipients text[] NOT NULL DEFAULT '{}',
  recipient_count integer NOT NULL DEFAULT 0,
  template_type text NOT NULL DEFAULT 'custom',
  html_content text,
  reply_to text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  sent_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email history"
  ON public.email_send_history
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 이메일 수신 거부 테이블
CREATE TABLE public.email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text,
  unsubscribed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage unsubscribes"
  ON public.email_unsubscribes
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert unsubscribes"
  ON public.email_unsubscribes
  FOR INSERT
  TO public
  WITH CHECK (true);
