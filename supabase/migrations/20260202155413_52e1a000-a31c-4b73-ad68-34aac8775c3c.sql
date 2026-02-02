-- 연결된 계좌 정보 테이블
CREATE TABLE public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- 계좌 기본 정보
  bank_code VARCHAR(3) NOT NULL,
  bank_name VARCHAR(50) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder VARCHAR(50),
  account_alias VARCHAR(50),
  
  -- 계좌 용도: primary(주거래), parking(파킹), salary(급여)
  account_type VARCHAR(20) NOT NULL DEFAULT 'primary',
  
  -- 하이픈 연동 상태 (출금 계좌용)
  hyphen_connected BOOLEAN DEFAULT false,
  hyphen_consent_at TIMESTAMPTZ,
  
  -- 코드에프 연동 상태 (조회용)
  codef_connected BOOLEAN DEFAULT false,
  codef_account_id VARCHAR(100),
  
  -- 상태
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 계좌만 조회
CREATE POLICY "Users can view their own accounts"
ON public.connected_accounts
FOR SELECT
USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 계좌 등록
CREATE POLICY "Users can insert their own accounts"
ON public.connected_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 계좌 수정
CREATE POLICY "Users can update their own accounts"
ON public.connected_accounts
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 계좌 삭제
CREATE POLICY "Users can delete their own accounts"
ON public.connected_accounts
FOR DELETE
USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_connected_accounts_user_id ON public.connected_accounts(user_id);
CREATE INDEX idx_connected_accounts_type ON public.connected_accounts(account_type);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_connected_accounts_updated_at
BEFORE UPDATE ON public.connected_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 코멘트
COMMENT ON TABLE public.connected_accounts IS '사용자 연결 계좌 정보 (주거래, 파킹, 급여)';
COMMENT ON COLUMN public.connected_accounts.account_type IS 'primary: 주거래(출금), parking: 파킹(입금), salary: 급여지급용';