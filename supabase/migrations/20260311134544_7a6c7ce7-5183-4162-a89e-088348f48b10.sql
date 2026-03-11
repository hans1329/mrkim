
-- 1. 세무사 마스터 테이블
CREATE TABLE public.tax_accountants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  firm_name text,
  specialties text[] DEFAULT '{}',
  industry_types text[] DEFAULT '{}',
  region text,
  is_active boolean DEFAULT true,
  pricing_info jsonb DEFAULT '{}',
  bio text,
  profile_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_accountants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active accountants"
  ON public.tax_accountants FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage accountants"
  ON public.tax_accountants FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'));

-- 2. 세무사 배정 테이블
CREATE TABLE public.tax_accountant_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accountant_id uuid NOT NULL REFERENCES public.tax_accountants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, accountant_id)
);

ALTER TABLE public.tax_accountant_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments"
  ON public.tax_accountant_assignments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assignments"
  ON public.tax_accountant_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assignments"
  ON public.tax_accountant_assignments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assignments"
  ON public.tax_accountant_assignments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. 세무 상담 테이블
CREATE TABLE public.tax_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accountant_id uuid REFERENCES public.tax_accountants(id) ON DELETE SET NULL,
  consultation_type text NOT NULL DEFAULT 'ad_hoc',
  subject text NOT NULL,
  user_question text NOT NULL,
  ai_preliminary_answer text,
  data_package jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  accountant_response text,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consultations"
  ON public.tax_consultations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultations"
  ON public.tax_consultations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consultations"
  ON public.tax_consultations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 4. 정기 세무 신고 태스크 테이블
CREATE TABLE public.tax_filing_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accountant_id uuid REFERENCES public.tax_accountants(id) ON DELETE SET NULL,
  filing_type text NOT NULL,
  tax_period text NOT NULL,
  deadline date NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  prepared_data jsonb DEFAULT '{}',
  review_notes jsonb DEFAULT '[]',
  filing_method text DEFAULT 'accountant',
  notified_at timestamptz,
  reminder_at timestamptz,
  data_prepared_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_filing_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own filing tasks"
  ON public.tax_filing_tasks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own filing tasks"
  ON public.tax_filing_tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own filing tasks"
  ON public.tax_filing_tasks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- updated_at 트리거 적용
CREATE TRIGGER update_tax_accountants_updated_at
  BEFORE UPDATE ON public.tax_accountants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_accountant_assignments_updated_at
  BEFORE UPDATE ON public.tax_accountant_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_consultations_updated_at
  BEFORE UPDATE ON public.tax_consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_filing_tasks_updated_at
  BEFORE UPDATE ON public.tax_filing_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
