-- 카드/계좌 거래 내역 테이블
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- 거래 기본 정보
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  
  -- 출처 정보 (카드/계좌)
  source_type TEXT NOT NULL CHECK (source_type IN ('card', 'bank')),
  source_name TEXT, -- 카드사명 또는 은행명
  source_account TEXT, -- 카드번호 또는 계좌번호 (마스킹)
  
  -- AI 자동 분류
  category TEXT, -- 복리후생비, 여비교통비, 접대비 등
  sub_category TEXT, -- 세부 카테고리
  category_icon TEXT, -- 이모지 아이콘
  classification_confidence TEXT CHECK (classification_confidence IN ('high', 'medium', 'low')),
  is_manually_classified BOOLEAN DEFAULT false,
  
  -- 외부 연동 정보
  external_tx_id TEXT, -- 코드에프 거래 ID
  synced_at TIMESTAMP WITH TIME ZONE,
  
  -- 메타데이터
  merchant_name TEXT, -- 가맹점명
  merchant_category TEXT, -- 가맹점 업종
  memo TEXT, -- 사용자 메모
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON public.transactions(user_id, category);
CREATE INDEX idx_transactions_type ON public.transactions(user_id, type);
CREATE INDEX idx_transactions_external_id ON public.transactions(external_tx_id);

-- RLS 활성화
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON public.transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 트리거
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();