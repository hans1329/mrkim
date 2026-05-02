-- 예치금 테이블 생성
CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'emergency', -- vat, salary, emergency
  name TEXT NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  target_amount BIGINT,
  due_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 자동이체 규칙 테이블 생성
CREATE TABLE public.auto_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount BIGINT NOT NULL,
  recipient TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT '수동 실행', -- 매월 말일, 매월 5일, 납품 완료 시, 수동 실행
  status TEXT NOT NULL DEFAULT 'pending', -- pending, scheduled, completed
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_transfers ENABLE ROW LEVEL SECURITY;

-- Deposits RLS policies
CREATE POLICY "Users can view their own deposits"
ON public.deposits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deposits"
ON public.deposits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deposits"
ON public.deposits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deposits"
ON public.deposits FOR DELETE
USING (auth.uid() = user_id);

-- Auto transfers RLS policies
CREATE POLICY "Users can view their own auto_transfers"
ON public.auto_transfers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own auto_transfers"
ON public.auto_transfers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auto_transfers"
ON public.auto_transfers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own auto_transfers"
ON public.auto_transfers FOR DELETE
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_deposits_updated_at
BEFORE UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auto_transfers_updated_at
BEFORE UPDATE ON public.auto_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();