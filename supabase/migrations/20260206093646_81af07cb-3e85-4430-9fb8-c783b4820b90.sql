-- 저축/파킹 계좌 테이블 생성
CREATE TABLE public.savings_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('parking', 'savings', 'deposit')),
  bank_name TEXT,
  amount BIGINT NOT NULL DEFAULT 0,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own savings_accounts"
  ON public.savings_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings_accounts"
  ON public.savings_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings_accounts"
  ON public.savings_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings_accounts"
  ON public.savings_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 트리거
CREATE TRIGGER update_savings_accounts_updated_at
  BEFORE UPDATE ON public.savings_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();