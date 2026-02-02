-- 서비스 안내 FAQ 테이블 생성
CREATE TABLE public.service_faq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 테이블 설명 추가
COMMENT ON TABLE public.service_faq IS '서비스 안내 챗봇 FAQ 데이터';
COMMENT ON COLUMN public.service_faq.keywords IS '매칭에 사용할 키워드 배열';
COMMENT ON COLUMN public.service_faq.question IS '대표 질문 텍스트';
COMMENT ON COLUMN public.service_faq.answer IS '마크다운 형식 응답';
COMMENT ON COLUMN public.service_faq.priority IS '우선순위 (높을수록 먼저 매칭)';

-- RLS 활성화
ALTER TABLE public.service_faq ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (안내 챗봇용)
CREATE POLICY "Anyone can read active FAQs"
ON public.service_faq
FOR SELECT
USING (is_active = true);

-- 관리자만 수정 가능
CREATE POLICY "Admins can manage FAQs"
ON public.service_faq
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_service_faq_updated_at
BEFORE UPDATE ON public.service_faq
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 초기 FAQ 데이터 삽입
INSERT INTO public.service_faq (keywords, question, answer, priority) VALUES
(
  ARRAY['뭐야', '무엇', '소개', '누구', '김비서가'],
  '김비서가 뭐야?',
  '**김비서**는 소상공인을 위한 AI 경영 비서입니다! 🤖

매출 관리, 직원 급여, 세금 신고까지 복잡한 사업장 관리를 **음성 명령 한 마디**로 해결해드려요.

"오늘 매출 얼마야?" 라고 물어보시면 바로 답변해드립니다!',
  100
),
(
  ARRAY['기능', '할 수 있', '뭐 해', '어떤'],
  '어떤 기능이 있어?',
  '김비서의 주요 기능이에요:

📊 **매출/지출 관리** - 실시간 현황 파악
👥 **직원 관리** - 급여, 4대보험 자동 계산
💰 **자금 관리** - 자동이체, 예치금 관리
📋 **세무 지원** - 부가세, 종합소득세 안내
🔔 **알림 서비스** - 중요 일정 리마인드

모두 **음성으로** 편하게 이용하실 수 있어요!',
  90
),
(
  ARRAY['요금', '가격', '얼마', '비용', '돈'],
  '요금은 얼마야?',
  '김비서 요금 안내입니다:

🆓 **무료 체험** - 14일간 모든 기능 무료
💼 **스탠다드** - 월 29,000원
🏢 **프로** - 월 49,000원 (다중 사업장)

지금 가입하시면 **첫 달 50% 할인** 혜택이 있어요!',
  80
),
(
  ARRAY['무료', '체험', '시작', '가입', '해보고'],
  '무료 체험 가능해?',
  '네, **14일 무료 체험**이 가능합니다! 🎉

카드 등록 없이 바로 시작할 수 있어요.

👆 위의 **회원가입** 버튼을 눌러 시작해보세요!',
  70
),
(
  ARRAY['연동', '연결', '데이터', '카드', '계좌', '홈택스'],
  '어떤 데이터를 연결해야 해?',
  '김비서는 다음 데이터를 연결하면 더 똑똑해져요:

🏦 **계좌 연동** - 입출금 내역 자동 분석
💳 **카드 연동** - 사업 경비 자동 분류
📋 **홈택스 연동** - 세금 신고 현황 파악

연결은 간단한 인증만으로 완료됩니다!',
  60
),
(
  ARRAY['안전', '보안', '개인정보', '정보'],
  '내 정보는 안전해?',
  '네, 김비서는 보안을 최우선으로 합니다! 🔒

✅ **금융보안원 인증** 보안 시스템
✅ **암호화** 저장 및 전송
✅ **개인정보보호법** 준수

고객님의 데이터는 안전하게 보호됩니다.',
  50
);