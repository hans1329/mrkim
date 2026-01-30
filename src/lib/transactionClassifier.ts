// 거래 자동 분류 로직 - 상호명 패턴 기반 카테고리 추천

export interface CategoryRule {
  pattern: RegExp;
  category: string;
  subCategory?: string;
  icon: string;
}

// 상호명 패턴 → 비용 카테고리 매핑
export const CATEGORY_RULES: CategoryRule[] = [
  // 식비/복리후생
  { pattern: /식당|레스토랑|카페|커피|스타벅스|이디야|맥도날드|버거킹|롯데리아|배달의민족|요기요|쿠팡이츠|치킨|피자/i, category: "복리후생비", subCategory: "식비", icon: "🍽️" },
  { pattern: /편의점|GS25|CU|세븐일레븐|이마트24|미니스톱/i, category: "복리후생비", subCategory: "간식비", icon: "🏪" },
  
  // 교통/여비
  { pattern: /택시|카카오T|타다|주유소|GS칼텍스|SK에너지|현대오일|S-OIL|주차/i, category: "여비교통비", subCategory: "교통비", icon: "🚗" },
  { pattern: /KTX|SRT|코레일|항공|대한항공|아시아나|제주항공|진에어|티웨이/i, category: "여비교통비", subCategory: "출장비", icon: "✈️" },
  { pattern: /호텔|모텔|숙박|에어비앤비|야놀자|여기어때/i, category: "여비교통비", subCategory: "숙박비", icon: "🏨" },
  
  // 통신/IT
  { pattern: /SKT|KT|LG유플러스|통신|인터넷|KT텔레콤/i, category: "통신비", icon: "📱" },
  { pattern: /네이버클라우드|AWS|구글클라우드|마이크로소프트|애플|앱스토어|플레이스토어/i, category: "지급수수료", subCategory: "IT서비스", icon: "☁️" },
  
  // 사무용품/비품
  { pattern: /오피스|문구|다이소|알파문구|교보문고|YES24|영풍문고/i, category: "소모품비", subCategory: "사무용품", icon: "📎" },
  { pattern: /쿠팡|11번가|G마켓|옥션|네이버쇼핑/i, category: "소모품비", subCategory: "일반구매", icon: "📦" },
  
  // 광고/마케팅
  { pattern: /페이스북|메타|구글애즈|네이버광고|카카오모먼트|인스타그램/i, category: "광고선전비", icon: "📢" },
  { pattern: /인쇄|명함|현수막|전단지/i, category: "광고선전비", subCategory: "인쇄물", icon: "🖨️" },
  
  // 보험/금융
  { pattern: /보험|삼성생명|한화생명|교보생명|현대해상|DB손해|KB손해/i, category: "보험료", icon: "🛡️" },
  { pattern: /은행|수수료|이체수수료/i, category: "지급수수료", subCategory: "금융수수료", icon: "🏦" },
  
  // 임대/관리
  { pattern: /관리비|전기|가스|수도|난방/i, category: "임차료", subCategory: "관리비", icon: "🏢" },
  { pattern: /임대|월세|렌트/i, category: "임차료", icon: "🔑" },
  
  // 식자재/원재료
  { pattern: /농산물|수산물|정육|도매|식자재|마트|이마트|홈플러스|롯데마트|코스트코/i, category: "원재료비", icon: "🥬" },
  
  // 교육
  { pattern: /교육|학원|세미나|컨퍼런스|유데미|클래스101|패스트캠퍼스/i, category: "교육훈련비", icon: "📚" },
  
  // 접대
  { pattern: /술집|호프|바|라운지|노래방|골프|접대/i, category: "접대비", icon: "🍻" },
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
