
-- 직원 테이블에 전화번호 컬럼 추가
ALTER TABLE public.employees ADD COLUMN phone text;

-- 직원 칭찬/평판 테이블
CREATE TABLE public.employee_praises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 칭찬을 한 사업자
  praiser_user_id uuid NOT NULL,
  -- 칭찬 대상 직원 식별 (이름 + 전화번호)
  employee_name text NOT NULL,
  employee_phone text NOT NULL,
  -- 칭찬 태그 (성실함, 친절함, 팀워크, 시간준수 등)
  tags text[] NOT NULL DEFAULT '{}',
  -- 자유 코멘트
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.employee_praises ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자가 칭찬 내역 조회 가능 (공개)
CREATE POLICY "Anyone authenticated can view praises"
ON public.employee_praises
FOR SELECT
TO authenticated
USING (true);

-- 자신이 작성한 칭찬만 등록 가능
CREATE POLICY "Users can insert their own praises"
ON public.employee_praises
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = praiser_user_id);

-- 자신이 작성한 칭찬만 삭제 가능
CREATE POLICY "Users can delete their own praises"
ON public.employee_praises
FOR DELETE
TO authenticated
USING (auth.uid() = praiser_user_id);

-- 칭찬 조회 성능 인덱스 (이름+전화번호 기반)
CREATE INDEX idx_employee_praises_lookup ON public.employee_praises (employee_name, employee_phone);
