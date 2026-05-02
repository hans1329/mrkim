-- 기존 type 체크 제약 조건 삭제 후 transfer_in을 포함하여 재생성
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer_in'));