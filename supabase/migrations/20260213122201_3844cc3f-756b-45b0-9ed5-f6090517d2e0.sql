-- transactions 테이블 복합 인덱스 (대시보드 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, transaction_date DESC);

-- transactions 타입별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions (user_id, type);

-- chat_messages 유저별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON public.chat_messages (user_id, created_at DESC);

-- tax_invoices 유저별 날짜 조회 최적화
CREATE INDEX IF NOT EXISTS idx_tax_invoices_user_date ON public.tax_invoices (user_id, invoice_date DESC);

-- employees 유저별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_employees_user_status ON public.employees (user_id, status);

-- notifications 유저별 미읽음 조회 최적화
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read, created_at DESC);