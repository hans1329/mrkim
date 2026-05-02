-- 1. transactions 테이블에 세무 분류 컬럼 추가
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS tax_account_code text,
  ADD COLUMN IF NOT EXISTS tax_account_name text,
  ADD COLUMN IF NOT EXISTS vat_deductible boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vat_amount bigint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_fixed_asset boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS depreciation_method text,
  ADD COLUMN IF NOT EXISTS useful_life_years integer,
  ADD COLUMN IF NOT EXISTS tax_classification_status text DEFAULT 'unclassified',
  ADD COLUMN IF NOT EXISTS ai_confidence_score numeric(3,2),
  ADD COLUMN IF NOT EXISTS business_use_ratio numeric(5,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS tax_notes text;

-- 2. 세무 계정과목 마스터 테이블
CREATE TABLE IF NOT EXISTS public.tax_account_codes (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  sub_category text,
  description text,
  vat_deductible_default boolean DEFAULT true,
  is_asset boolean DEFAULT false,
  default_useful_life integer,
  tax_limit_type text,
  tax_limit_description text,
  keywords text[] DEFAULT '{}',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tax_account_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tax account codes"
  ON public.tax_account_codes FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage tax account codes"
  ON public.tax_account_codes FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. 마스터 데이터 삽입
INSERT INTO public.tax_account_codes (id, name, category, sub_category, description, vat_deductible_default, is_asset, default_useful_life, tax_limit_type, tax_limit_description, keywords, display_order) VALUES
('501', '원재료비', '매출원가', '재료비', '제품 제조에 사용되는 원재료 구입비', true, false, NULL, 'unlimited', NULL, ARRAY['식자재','원재료','농산물','수산물','정육','도매'], 1),
('502', '상품매입', '매출원가', '매입', '판매 목적 상품 매입비', true, false, NULL, 'unlimited', NULL, ARRAY['매입','도매','유통','물류'], 2),
('811', '접대비', '판관비', '접대', '거래처 접대 관련 비용', false, false, NULL, 'annual_limit', '중소기업 기본 3,600만원 + 매출액 비례', ARRAY['술집','호프','바','라운지','노래방','골프','접대','유흥'], 10),
('812', '복리후생비', '판관비', '복리후생', '임직원 복리후생 관련 비용', true, false, NULL, 'unlimited', '1인당 월 20만원 식대 비과세', ARRAY['식당','카페','커피','편의점','약국','병원','의원','안경'], 11),
('813', '여비교통비', '판관비', '여비교통', '업무 관련 교통비, 출장비, 숙박비', true, false, NULL, 'unlimited', '실비 정산 원칙', ARRAY['택시','주유소','주차','KTX','항공','호텔','숙박','하이패스','렌트카'], 12),
('814', '통신비', '판관비', '통신', '전화, 인터넷, 데이터 통신 비용', true, false, NULL, 'unlimited', NULL, ARRAY['SKT','KT','LG유플러스','통신','인터넷'], 13),
('815', '수도광열비', '판관비', '공과금', '수도, 전기, 가스, 난방 비용', true, false, NULL, 'unlimited', NULL, ARRAY['전기','가스','수도','난방','관리비','한전'], 14),
('816', '세금과공과', '판관비', '세금', '사업 관련 세금 및 공과금', false, false, NULL, 'unlimited', '부가세/소득세/법인세는 불공제', ARRAY['재산세','자동차세','환경개선부담금'], 15),
('817', '감가상각비', '판관비', '감가상각', '유형/무형 고정자산의 감가상각비', false, false, NULL, 'unlimited', NULL, ARRAY['감가상각'], 16),
('818', '임차료', '판관비', '임대', '사업장 임대료, 장비 렌탈료', true, false, NULL, 'unlimited', NULL, ARRAY['임대','월세','렌트','리스','임차'], 17),
('819', '보험료', '판관비', '보험', '사업 관련 보험료', false, false, NULL, 'unlimited', '개인보험은 불공제', ARRAY['보험','삼성생명','한화생명','화재보험'], 18),
('820', '차량유지비', '판관비', '차량', '업무용 차량 유지 관련 비용', true, false, NULL, 'ratio_limit', '업무사용비율 적용, 연 1,500만원 한도', ARRAY['주유','경정비','세차','타이어','오일교환'], 19),
('821', '운반비', '판관비', '운반', '택배, 화물 운송 비용', true, false, NULL, 'unlimited', NULL, ARRAY['택배','CJ대한통운','로젠','한진택배'], 20),
('822', '교육훈련비', '판관비', '교육', '임직원 교육 관련 비용', true, false, NULL, 'unlimited', NULL, ARRAY['교육','학원','세미나','컨퍼런스'], 21),
('823', '도서인쇄비', '판관비', '도서', '도서구입 및 인쇄 비용', true, false, NULL, 'unlimited', NULL, ARRAY['교보문고','인쇄','명함','전단지'], 22),
('824', '소모품비', '판관비', '소모품', '사무용품, 소모성 비품 (100만원 미만)', true, false, NULL, 'unlimited', NULL, ARRAY['다이소','문구','사무용품','토너'], 23),
('825', '지급수수료', '판관비', '수수료', '각종 수수료', true, false, NULL, 'unlimited', NULL, ARRAY['PG','결제대행','수수료','법무','세무','회계'], 24),
('826', '광고선전비', '판관비', '광고', '광고, 마케팅, 판촉 비용', true, false, NULL, 'unlimited', NULL, ARRAY['페이스북','구글애즈','네이버광고','광고','홍보'], 25),
('827', '대손상각비', '판관비', '대손', '회수 불능 채권의 상각', false, false, NULL, 'ratio_limit', '채권잔액의 1~2%', ARRAY['대손','상각'], 26),
('828', '무형자산상각비', '판관비', '무형자산', '소프트웨어, 특허권 등 무형자산 상각', false, false, NULL, 'unlimited', NULL, ARRAY['소프트웨어','라이선스','특허'], 27),
('829', '수선비', '판관비', '수선', '사업장/장비 수리 비용', true, false, NULL, 'unlimited', NULL, ARRAY['수리','수선','보수'], 28),
('830', '잡비', '판관비', '기타', '분류 불가능한 기타 비용', true, false, NULL, 'unlimited', NULL, ARRAY['기타','잡비'], 29),
('831', '구독서비스', '판관비', '구독', 'SaaS, 클라우드, 구독형 서비스', true, false, NULL, 'unlimited', NULL, ARRAY['넷플릭스','AWS','클라우드','구독','SaaS'], 30),
('832', '급여', '판관비', '인건비', '임직원 급여', false, false, NULL, 'unlimited', NULL, ARRAY['급여','월급','상여'], 31),
('833', '퇴직급여', '판관비', '인건비', '퇴직금 및 퇴직연금', false, false, NULL, 'unlimited', NULL, ARRAY['퇴직금','퇴직연금'], 32),
('834', '4대보험', '판관비', '인건비', '사업주 부담분 사회보험', false, false, NULL, 'unlimited', NULL, ARRAY['국민연금','건강보험','고용보험','산재보험'], 33),
('211', '건물', '자산', '유형자산', '사업용 건물', true, true, 40, 'unlimited', NULL, ARRAY['건물','부동산'], 40),
('212', '차량운반구', '자산', '유형자산', '업무용 차량 취득', true, true, 5, 'unlimited', NULL, ARRAY['자동차','차량'], 41),
('213', '비품', '자산', '유형자산', '사무용 비품 (100만원 이상)', true, true, 5, 'unlimited', NULL, ARRAY['컴퓨터','노트북','프린터','에어컨','냉장고'], 42),
('214', '기계장치', '자산', '유형자산', '생산/영업용 기계, 장비', true, true, 8, 'unlimited', NULL, ARRAY['기계','장비','설비'], 43),
('215', '인테리어', '자산', '유형자산', '사업장 인테리어 (자본적 지출)', true, true, 5, 'unlimited', NULL, ARRAY['인테리어','시설','리모델링','공사'], 44);

-- 4. 인덱스
CREATE INDEX IF NOT EXISTS idx_transactions_tax_status ON public.transactions (tax_classification_status);
CREATE INDEX IF NOT EXISTS idx_transactions_tax_account ON public.transactions (tax_account_code);
