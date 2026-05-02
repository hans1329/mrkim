
ALTER TABLE public.profiles
ADD COLUMN large_transaction_threshold bigint NOT NULL DEFAULT 1000000;

COMMENT ON COLUMN public.profiles.large_transaction_threshold IS '대규모 입출금 감지 기준 금액 (기본 100만원)';
