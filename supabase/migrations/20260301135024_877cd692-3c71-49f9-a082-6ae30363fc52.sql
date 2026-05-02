
-- 의도별 키워드 매핑 테이블
CREATE TABLE public.intent_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent text NOT NULL,
  intent_label text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intent_keywords ENABLE ROW LEVEL SECURITY;

-- 관리자만 CRUD
CREATE POLICY "Admins can manage intent keywords"
  ON public.intent_keywords FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge Function에서 읽기 가능 (활성 항목만)
CREATE POLICY "Anyone can read active intent keywords"
  ON public.intent_keywords FOR SELECT
  USING (is_active = true);

-- updated_at 자동 갱신
CREATE TRIGGER update_intent_keywords_updated_at
  BEFORE UPDATE ON public.intent_keywords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 기본 시드 데이터 삽입
INSERT INTO public.intent_keywords (intent, intent_label, keywords, description) VALUES
  ('sales_inquiry', '매출 조회', ARRAY['매출', '매상', '벌이', '벌었', '장사', '수입', '잘되', '잘됐', '잘된', '팔았', '팔린', '수익', '돈벌', '얼마벌', '매출액', '총매출', '일매출', '월매출'], '매출/수익 관련 질문'),
  ('expense_inquiry', '지출 조회', ARRAY['지출', '비용', '썼', '쓴돈', '나간돈', '소비', '경비', '결제', '카드값', '얼마썼', '돈나간', '지출액', '총지출'], '지출/비용 관련 질문'),
  ('tax_question', '세금 질문', ARRAY['세금', '부가세', '종소세', '종합소득', '부가가치', '세무', '신고', '납부', '원천징수', '세액', '절세', '세금계산서'], '세금/세무 관련 질문'),
  ('payroll_inquiry', '급여 조회', ARRAY['급여', '월급', '임금', '인건비', '페이', '봉급', '수당', '4대보험', '실수령'], '급여/인사 관련 질문'),
  ('daily_briefing', '경영 브리핑', ARRAY['브리핑', '현황', '요약', '오늘어때', '상황', '전반적', '한눈에', '리포트', '보고'], '경영 현황 브리핑 요청'),
  ('employee_management', '직원 관리', ARRAY['직원', '알바', '스태프', '파트타임', '근무', '출퇴근', '인사', '채용', '퇴사'], '직원/인사 관리'),
  ('transaction_classify', '거래 분류', ARRAY['분류', '카테고리', '뭘로처리', '계정과목', '비목', '항목'], '거래 분류 관련'),
  ('fund_inquiry', '자금 조회', ARRAY['비상금', '예적금', '저축', '잔액', '통장', '자금', '예금', '적금', '이체'], '자금/저축 관련 질문');
