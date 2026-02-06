-- 직원 유형 enum 생성
CREATE TYPE public.employee_type AS ENUM ('정규직', '계약직', '알바');

-- 직원 테이블 생성
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  employee_type employee_type NOT NULL DEFAULT '정규직',
  position TEXT,
  department TEXT,
  weekly_hours NUMERIC,
  hourly_rate BIGINT,
  monthly_salary BIGINT,
  insurance_national_pension BOOLEAN DEFAULT false,
  insurance_health BOOLEAN DEFAULT false,
  insurance_employment BOOLEAN DEFAULT false,
  insurance_industrial BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT '재직' CHECK (status IN ('재직', '퇴사')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('hometax', 'manual')),
  external_id TEXT,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, external_id)
);

-- RLS 활성화
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can view their own employees"
ON public.employees
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own employees"
ON public.employees
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own employees"
ON public.employees
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own employees"
ON public.employees
FOR DELETE
USING (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 인덱스 생성
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_source ON public.employees(source);