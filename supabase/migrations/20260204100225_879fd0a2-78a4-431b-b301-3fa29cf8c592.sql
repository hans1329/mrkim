-- 세금계산서 데이터 저장 테이블
CREATE TABLE public.tax_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_type TEXT NOT NULL, -- 'sales' (매출) or 'purchase' (매입)
  invoice_date DATE NOT NULL,
  supplier_name TEXT, -- 공급자 상호
  supplier_business_number TEXT, -- 공급자 사업자번호
  buyer_name TEXT, -- 공급받는자 상호
  buyer_business_number TEXT, -- 공급받는자 사업자번호
  supply_amount BIGINT NOT NULL DEFAULT 0, -- 공급가액
  tax_amount BIGINT NOT NULL DEFAULT 0, -- 세액
  total_amount BIGINT NOT NULL DEFAULT 0, -- 합계
  item_name TEXT, -- 품목명
  issue_id TEXT, -- 세금계산서 발급 ID (중복 방지)
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX idx_tax_invoices_user_id ON public.tax_invoices(user_id);
CREATE INDEX idx_tax_invoices_invoice_date ON public.tax_invoices(invoice_date);
CREATE INDEX idx_tax_invoices_type ON public.tax_invoices(invoice_type);
CREATE UNIQUE INDEX idx_tax_invoices_issue_id ON public.tax_invoices(user_id, issue_id) WHERE issue_id IS NOT NULL;

-- RLS 활성화
ALTER TABLE public.tax_invoices ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own invoices"
  ON public.tax_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON public.tax_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.tax_invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON public.tax_invoices FOR DELETE
  USING (auth.uid() = user_id);

-- 홈택스 동기화 상태 테이블
CREATE TABLE public.hometax_sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'completed', 'failed'
  sync_error TEXT,
  sales_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  total_sales_amount BIGINT DEFAULT 0,
  total_purchase_amount BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.hometax_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own sync status"
  ON public.hometax_sync_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync status"
  ON public.hometax_sync_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync status"
  ON public.hometax_sync_status FOR UPDATE
  USING (auth.uid() = user_id);

-- updated_at 트리거
CREATE TRIGGER update_tax_invoices_updated_at
  BEFORE UPDATE ON public.tax_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hometax_sync_status_updated_at
  BEFORE UPDATE ON public.hometax_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();