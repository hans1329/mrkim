
-- transactions 테이블에 external_tx_id 기반 unique 제약 추가 (upsert용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_external_tx 
ON public.transactions (user_id, external_tx_id) 
WHERE external_tx_id IS NOT NULL;
