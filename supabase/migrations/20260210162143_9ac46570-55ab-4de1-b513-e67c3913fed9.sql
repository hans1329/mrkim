
-- ============================================
-- 데이터 연동 플랫폼: 공통 뼈대 구조
-- ============================================

-- 1. 커넥터 레지스트리 (연동 가능한 서비스 목록)
CREATE TABLE public.connectors (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('hometax', 'bank', 'card', 'delivery', 'pg', 'shopping', 'giro', 'credit_finance')),
  provider text NOT NULL DEFAULT 'codef' CHECK (provider IN ('codef', 'hyphen', 'manual')),
  icon text,
  config_schema jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 초기 커넥터 데이터 시드
INSERT INTO connectors (id, name, description, category, provider, display_order) VALUES
  ('codef_hometax_tax_invoice', '홈택스 세금계산서', '매출/매입 세금계산서 조회', 'hometax', 'codef', 1),
  ('codef_hometax_cash_receipt', '홈택스 현금영수증', '현금영수증 발급/조회', 'hometax', 'codef', 2),
  ('codef_bank_account', '은행 계좌', '계좌 잔액 및 거래내역 조회', 'bank', 'codef', 3),
  ('codef_card_sales', '여신금융협회 카드매출', '카드 매출 내역 조회', 'card', 'codef', 4),
  ('codef_card_usage', '카드 사용내역', '법인/개인 카드 사용 내역', 'card', 'codef', 5),
  ('codef_giro', '인터넷지로', '고지서 조회 및 납부', 'giro', 'codef', 6);

-- RLS: 커넥터 목록은 누구나 조회 가능
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read connectors" ON public.connectors FOR SELECT USING (true);

-- 2. 커넥터 인스턴스 (사용자별 연동 상태)
CREATE TYPE public.connector_status AS ENUM ('pending', 'connected', 'failed', 'expired', 'disconnected');

CREATE TABLE public.connector_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL REFERENCES public.connectors(id),
  status public.connector_status NOT NULL DEFAULT 'pending',
  status_message text,
  connected_id text,
  credentials_meta jsonb DEFAULT '{}',
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  token_expires_at timestamptz,
  sync_interval_minutes integer DEFAULT 360,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, connector_id)
);

ALTER TABLE public.connector_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own instances" ON public.connector_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own instances" ON public.connector_instances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own instances" ON public.connector_instances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own instances" ON public.connector_instances FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_connector_instances_updated_at
  BEFORE UPDATE ON public.connector_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. 동기화 작업 (수집 잡)
CREATE TYPE public.sync_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

CREATE TABLE public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.connector_instances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  job_type text NOT NULL DEFAULT 'delta' CHECK (job_type IN ('full', 'delta', 'retry')),
  status public.sync_job_status NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  records_fetched integer DEFAULT 0,
  records_saved integer DEFAULT 0,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own jobs" ON public.sync_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.sync_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.sync_jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_sync_jobs_instance ON public.sync_jobs(instance_id, created_at DESC);
CREATE INDEX idx_sync_jobs_status ON public.sync_jobs(status) WHERE status IN ('pending', 'running');

-- 4. 동기화 로그 (수집/에러 상세 로그)
CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.sync_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own logs" ON public.sync_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.sync_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sync_logs_job ON public.sync_logs(job_id, created_at);
CREATE INDEX idx_sync_logs_level ON public.sync_logs(level) WHERE level IN ('warn', 'error');
