-- auto_transfers 테이블에 하이픈 연동을 위한 필드 추가
ALTER TABLE public.auto_transfers 
  ADD COLUMN IF NOT EXISTS transfer_type text NOT NULL DEFAULT 'fixed',  -- fixed | percentage
  ADD COLUMN IF NOT EXISTS amount_percentage numeric,                      -- 비율이체 시 % 값 (0~100)
  ADD COLUMN IF NOT EXISTS source_account_id uuid,                        -- 출금 계좌 (connected_accounts.id)
  ADD COLUMN IF NOT EXISTS target_account_number text,                    -- 입금 계좌번호
  ADD COLUMN IF NOT EXISTS target_bank_name text,                         -- 입금 은행명
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'manual',  -- manual | on_income | daily | weekly | monthly
  ADD COLUMN IF NOT EXISTS schedule_day integer,                          -- 월별 실행일 (1~31) 또는 주별 (1~7)
  ADD COLUMN IF NOT EXISTS hyphen_transfer_id text,                       -- 하이픈 이체 ID (연동 후 사용)
  ADD COLUMN IF NOT EXISTS description text;                              -- 메모/설명

-- 기존 condition 컬럼을 schedule_type과 별도로 유지 (하위 호환)
-- source_account_id 외래키는 soft 참조 (connected_accounts 삭제 시 null 처리)
COMMENT ON COLUMN public.auto_transfers.transfer_type IS 'fixed: 고정금액, percentage: 비율';
COMMENT ON COLUMN public.auto_transfers.schedule_type IS 'manual: 수동, on_income: 매출 발생 시, daily: 매일, weekly: 매주, monthly: 매월';
COMMENT ON COLUMN public.auto_transfers.hyphen_transfer_id IS '하이픈 API 이체 실행 ID (향후 연동 시 사용)';
