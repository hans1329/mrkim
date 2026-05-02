// 거래 자동 분류 로직 - 상호명 패턴 기반 카테고리 추천

export interface CategoryRule {
  pattern: RegExp;
  category: string;
  subCategory?: string;
  icon: string;
}

// ========== 입금(income) 중 비매출 분류 규칙 ==========
// 매칭되면 비매출(non-sales)로 처리, 매칭 안 되면 매출(sales)로 간주
export interface IncomeClassificationRule {
  pattern: RegExp;
  incomeCategory: string; // "이체입금" | "대출금" | "환불" | "이자수익" | "보험금" | "기타입금"
  icon: string;
}

export const INCOME_NON_SALES_RULES: IncomeClassificationRule[] = [
  // 계좌이체 / 자금이동
  { pattern: /이체|자금이체|타행이체|계좌이체|자동이체|인터넷이체|모바일이체|당행이체|무통장|지급이체/i, incomeCategory: "이체입금", icon: "🔄" },
  // 대출
  { pattern: /대출|융자|신용대출|마이너스|한도대출|주택담보|전세자금|사업자대출/i, incomeCategory: "대출금", icon: "🏦" },
  // 환불/취소
  { pattern: /환불|반품|취소|캔슬|리펀드|refund|cancel/i, incomeCategory: "환불", icon: "↩️" },
  // 이자
  { pattern: /이자|이자지급|예금이자|적금이자|정기예금|보통예금.*이자/i, incomeCategory: "이자수익", icon: "💰" },
  // 보험금
  { pattern: /보험금|보험.*지급|실손|실비|보상금/i, incomeCategory: "보험금", icon: "🛡️" },
  // 정부지원/보조금
  { pattern: /보조금|지원금|장려금|근로장려|자녀장려|재난지원|소상공인|고용유지|국세환급|세금환급|부가세환급/i, incomeCategory: "정부지원금", icon: "🏛️" },
  // 급여 (사업주 본인 급여가 입금되는 경우는 거의 없지만)
  { pattern: /급여|월급|상여|보너스|퇴직금|성과급/i, incomeCategory: "급여입금", icon: "💵" },
  // 내부 자금이동 (같은 명의 계좌 간)
  { pattern: /본인|자기앞|자기계좌|내계좌/i, incomeCategory: "내부이체", icon: "🔁" },
];

/**
 * 입금 거래가 실제 매출인지 비매출인지 분류
 * @returns isSales: true면 매출, false면 비매출
 */
export function classifyIncomeTransaction(description: string): {
  isSales: boolean;
  incomeCategory: string;
  icon: string;
  confidence: "high" | "medium" | "low";
} {
  const normalizedDesc = description.trim().toLowerCase();

  for (const rule of INCOME_NON_SALES_RULES) {
    if (rule.pattern.test(normalizedDesc)) {
      return {
        isSales: false,
        incomeCategory: rule.incomeCategory,
        icon: rule.icon,
        confidence: "high",
      };
    }
  }

  // "은행 거래" 등 모호한 설명은 비매출(미분류 입금)으로 처리
  const ambiguousPatterns = /^은행\s*거래$|^입금$|^기타\s*입금$|^카드\s*결제$/i;
  if (ambiguousPatterns.test(normalizedDesc)) {
    return {
      isSales: false,
      incomeCategory: "미분류입금",
      icon: "❓",
      confidence: "low",
    };
  }

  // 패턴 매칭 실패 → 매출로 간주
  return {
    isSales: true,
    incomeCategory: "매출",
    icon: "💵",
    confidence: "medium",
  };
}

// 상호명 패턴 → 비용 카테고리 매핑
export const CATEGORY_RULES: CategoryRule[] = [
  // 식비/복리후생 - 음식점
  { pattern: /식당|레스토랑|카페|커피|스타벅스|이디야|맥도날드|버거킹|롯데리아|배달의민족|요기요|쿠팡이츠|치킨|피자|파파존스|도미노|피자헛|빈대떡|떡볶이|분식|국밥|설렁탕|냉면|짜장|짬뽕|중국집|초밥|일식|한식|양식|베이커리|빵집|던킨|파리바게뜨|뚜레쥬르/i, category: "복리후생비", subCategory: "식비", icon: "🍽️" },
  { pattern: /편의점|GS25|CU|세븐일레븐|이마트24|미니스톱/i, category: "복리후생비", subCategory: "간식비", icon: "🏪" },
  
  // 의료/약국
  { pattern: /약국|병원|의원|클리닉|메디컬|치과|안과|내과|외과|정형외과|피부과|한의원|서울성모|가톨릭대학|대학병원|동물병원/i, category: "복리후생비", subCategory: "의료비", icon: "🏥" },
  
  // 교통/여비
  { pattern: /택시|카카오T|타다|주유소|GS칼텍스|SK에너지|현대오일|S-OIL|주차|쏘카|그린카|렌트카|렌터카|하이패스/i, category: "여비교통비", subCategory: "교통비", icon: "🚗" },
  { pattern: /KTX|SRT|코레일|항공|대한항공|아시아나|제주항공|진에어|티웨이|도로공사|고속도로|도로교통공단|운전면허/i, category: "여비교통비", subCategory: "출장비", icon: "✈️" },
  { pattern: /호텔|모텔|숙박|에어비앤비|야놀자|여기어때/i, category: "여비교통비", subCategory: "숙박비", icon: "🏨" },
  
  // 통신/IT
  { pattern: /SKT|KT|LG유플러스|통신|인터넷|KT텔레콤|에스케이브로드밴드|SK브로드밴드|LG유플/i, category: "통신비", icon: "📱" },
  { pattern: /네이버클라우드|AWS|구글클라우드|마이크로소프트|애플|앱스토어|플레이스토어/i, category: "지급수수료", subCategory: "IT서비스", icon: "☁️" },
  
  // 결제대행/수수료
  { pattern: /NICE|나이스|결제대행|페이먼츠|PG|KG이니시스|토스페이먼츠|카카오페이|네이버페이|페이코/i, category: "지급수수료", subCategory: "결제수수료", icon: "💳" },
  
  // 구독서비스
  { pattern: /넷플릭스|유튜브프리미엄|스포티파이|왓챠|웨이브|티빙|쿠팡플레이|디즈니|LG전자.*구독|구독료/i, category: "지급수수료", subCategory: "구독료", icon: "📺" },
  
  // 사무용품/비품
  { pattern: /오피스|문구|다이소|알파문구|교보문고|YES24|영풍문고/i, category: "소모품비", subCategory: "사무용품", icon: "📎" },
  { pattern: /쿠팡|11번가|G마켓|옥션|네이버쇼핑|다인유통|청춘유통/i, category: "소모품비", subCategory: "일반구매", icon: "📦" },
  
  // 광고/마케팅
  { pattern: /페이스북|메타|구글애즈|네이버광고|카카오모먼트|인스타그램/i, category: "광고선전비", icon: "📢" },
  { pattern: /인쇄|명함|현수막|전단지/i, category: "광고선전비", subCategory: "인쇄물", icon: "🖨️" },
  
  // 보험/금융
  { pattern: /보험|삼성생명|한화생명|교보생명|현대해상|DB손해|KB손해|경찰공제회|공제회/i, category: "보험료", icon: "🛡️" },
  { pattern: /이체수수료|송금수수료|출금수수료/i, category: "지급수수료", subCategory: "금융수수료", icon: "🏦" },
  
  // 임대/관리
  { pattern: /관리비|전기|가스|수도|난방/i, category: "임차료", subCategory: "관리비", icon: "🏢" },
  { pattern: /임대|월세|렌트/i, category: "임차료", icon: "🔑" },
  
  // 식자재/원재료
  { pattern: /농산물|수산물|정육|도매|식자재|마트|이마트|홈플러스|롯데마트|코스트코|농협.*마트|하나로마트/i, category: "원재료비", icon: "🥬" },
  
  // 교육
  { pattern: /교육|학원|세미나|컨퍼런스|유데미|클래스101|패스트캠퍼스/i, category: "교육훈련비", icon: "📚" },
  
  // 접대
  { pattern: /술집|호프|바|라운지|노래방|골프|접대/i, category: "접대비", icon: "🍻" },
  
  // 안경/광학
  { pattern: /안경|렌즈|광학/i, category: "복리후생비", subCategory: "의료비", icon: "👓" },
];

export interface ClassificationResult {
  category: string;
  subCategory?: string;
  icon: string;
  confidence: "high" | "medium" | "low";
  matchedPattern?: string;
}

/**
 * 거래 설명(상호명)을 기반으로 비용 카테고리 추천
 */
export function classifyTransaction(description: string): ClassificationResult {
  const normalizedDesc = description.trim().toLowerCase();
  
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(normalizedDesc)) {
      return {
        category: rule.category,
        subCategory: rule.subCategory,
        icon: rule.icon,
        confidence: "high",
        matchedPattern: normalizedDesc.match(rule.pattern)?.[0],
      };
    }
  }
  
  // 패턴 매칭 실패 시 기본값
  return {
    category: "기타비용",
    icon: "📋",
    confidence: "low",
  };
}

/**
 * 여러 거래를 일괄 분류
 */
export function classifyTransactions(
  transactions: { id: string; description: string }[]
): Map<string, ClassificationResult> {
  const results = new Map<string, ClassificationResult>();
  
  for (const tx of transactions) {
    results.set(tx.id, classifyTransaction(tx.description));
  }
  
  return results;
}

// 카테고리별 색상 매핑
export const CATEGORY_COLORS: Record<string, string> = {
  "복리후생비": "bg-orange-500/10 text-orange-600",
  "여비교통비": "bg-blue-500/10 text-blue-600",
  "통신비": "bg-purple-500/10 text-purple-600",
  "지급수수료": "bg-gray-500/10 text-gray-600",
  "소모품비": "bg-yellow-500/10 text-yellow-600",
  "광고선전비": "bg-pink-500/10 text-pink-600",
  "보험료": "bg-green-500/10 text-green-600",
  "임차료": "bg-indigo-500/10 text-indigo-600",
  "원재료비": "bg-emerald-500/10 text-emerald-600",
  "교육훈련비": "bg-cyan-500/10 text-cyan-600",
  "접대비": "bg-red-500/10 text-red-600",
  "기타비용": "bg-slate-500/10 text-slate-600",
};

/**
 * 카테고리별 통계 생성
 */
export function getCategoryStats(
  transactions: { id: string; description: string; amount: number }[]
): { category: string; amount: number; count: number; icon: string }[] {
  const stats = new Map<string, { amount: number; count: number; icon: string }>();
  
  for (const tx of transactions) {
    const result = classifyTransaction(tx.description);
    const existing = stats.get(result.category) || { amount: 0, count: 0, icon: result.icon };
    stats.set(result.category, {
      amount: existing.amount + tx.amount,
      count: existing.count + 1,
      icon: result.icon,
    });
  }
  
  return Array.from(stats.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.amount - a.amount);
}
