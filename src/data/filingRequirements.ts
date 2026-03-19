/**
 * 부가가치세 확정신고 필요 서류 및 증빙
 * 출처: 영앤진 세무법인 — 2025년 2기 확정신고 안내문 (개인/법인)
 */

export type AutoSourceType =
  | "hometax"       // 홈택스 연동
  | "card"          // 카드 연동
  | "bank"          // 통장 연동
  | "delivery"      // 배달앱 연동
  | "transactions"  // 거래 내역 (분류 엔진)
  | null;           // 직접 준비 필요

export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  /** prepared_data의 해당 키 */
  dataKey: string;
  /** 김비서가 자동 수집 가능한 소스 */
  autoSource: AutoSourceType;
  /** 자동 수집 시 커버리지 (예: 90%) */
  autoCoverage?: number;
  /** 자동 수집 안내 문구 */
  autoDescription?: string;
  /** 사용자가 보강해야 할 사항 */
  manualSupplement?: string;
}

export interface IndustryRequirement {
  matchKeywords: string[];
  title: string;
  description: string;
  items: ChecklistItem[];
}

/** 자동 수집 소스 라벨 */
export const AUTO_SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  hometax: { label: "홈택스 연동", color: "text-blue-600" },
  card: { label: "카드 연동", color: "text-emerald-600" },
  bank: { label: "통장 연동", color: "text-violet-600" },
  delivery: { label: "배달앱 연동", color: "text-orange-600" },
  transactions: { label: "거래 분류", color: "text-cyan-600" },
};

/** 개인사업자 기본 요청자료 */
export const INDIVIDUAL_BASIC_ITEMS: ChecklistItem[] = [
  {
    id: "ind_invoice",
    label: "매출·매입 세금계산서 및 계산서",
    detail: "전자세금계산서 및 계산서는 국세청 홈택스를 통해 세무사무실에서 직접 확인 가능 (2025년 7월~12월)",
    dataKey: "invoice_ready",
    autoSource: "hometax",
    autoCoverage: 95,
    autoDescription: "전자세금계산서는 홈택스 연동으로 자동 수집됩니다",
    manualSupplement: "'종이세금계산서'가 있다면 스캔하여 메일 또는 실물 우편으로 송부해 주세요",
  },
  {
    id: "ind_card_sales",
    label: "카드매출 및 현금매출 내역",
    detail: "카드단말기(포스기) 매출내역, 현금매출내역 (현금영수증 발행분 제외)",
    dataKey: "card_ready",
    autoSource: "card",
    autoCoverage: 90,
    autoDescription: "카드 매출은 연동된 카드사 데이터에서 자동 수집됩니다",
    manualSupplement: "현금매출 중 현금영수증 미발행분이 있으면 별도로 알려주세요. ※ 병원의 경우 병원 프로그램 매출내역 추가 필요",
  },
  {
    id: "ind_purchase_receipt",
    label: "신용카드 매입자료 및 지출증빙용 현금영수증",
    detail: "홈택스에 확인되지 않는 매입이 있는 경우 신용카드명세서 등 관련 자료를 엑셀로 전달",
    dataKey: "purchase_ready",
    autoSource: "transactions",
    autoCoverage: 85,
    autoDescription: "연동된 카드·통장의 지출 내역은 AI가 자동 분류합니다",
    manualSupplement: "해외 사용분 등 홈택스에 확인되지 않는 매입 자료가 있으면 추가해 주세요",
  },
  {
    id: "ind_fixed_asset",
    label: "고정자산 구매 (100만원 초과)",
    detail: "자동차, 기계장치, 인테리어비용, 건물 등 → 매입세액 검토 필요. 관련 계약서·견적서 등 전달",
    dataKey: "fixed_asset_ready",
    autoSource: null,
    manualSupplement: "차량 매매 시 자동차등록증·매매계약서, 차량 리스 시 리스계약서·원리금상환내역서 등을 첨부해 주세요",
  },
  {
    id: "ind_expense",
    label: "비용 지출 영수증 및 송금 명세서",
    detail: "3~4분기 기장을 위해 비용으로 지출하신 영수증을 월별로 정리하여 전달 (2025년 7월~12월)",
    dataKey: "expense_ready",
    autoSource: "transactions",
    autoCoverage: 80,
    autoDescription: "연동된 통장·카드의 지출 거래는 자동으로 월별 정리됩니다",
    manualSupplement: "현금으로 지출한 영수증 중 카드·통장에 없는 건만 별도 첨부해 주세요",
  },
  {
    id: "ind_bank",
    label: "통장 거래내역",
    detail: "사업용 계좌의 거래내역 (2025년 7월~12월)",
    dataKey: "bank_ready",
    autoSource: "bank",
    autoCoverage: 100,
    autoDescription: "연동된 사업용 계좌의 거래내역이 자동으로 수집됩니다",
    manualSupplement: "연동되지 않은 계좌가 있다면 해당 은행 홈페이지에서 다운로드 후 전달해 주세요",
  },
];

/** 법인사업자 기본 요청자료 */
export const CORPORATE_BASIC_ITEMS: ChecklistItem[] = [
  {
    id: "corp_invoice",
    label: "매출·매입 세금계산서 및 계산서",
    detail: "전자세금계산서 및 계산서는 국세청 홈택스를 통해 확인 가능 (2025년 10월~12월)",
    dataKey: "invoice_ready",
    autoSource: "hometax",
    autoCoverage: 95,
    autoDescription: "전자세금계산서는 홈택스 연동으로 자동 수집됩니다",
    manualSupplement: "'종이세금계산서'가 있다면 스캔하여 메일 또는 실물 우편으로 송부해 주세요",
  },
  {
    id: "corp_card_sales",
    label: "카드매출 및 현금매출 내역",
    detail: "카드단말기(포스기) 매출내역, 현금매출내역 (현금영수증 발행분 제외)",
    dataKey: "card_ready",
    autoSource: "card",
    autoCoverage: 90,
    autoDescription: "카드 매출은 연동된 카드사 데이터에서 자동 수집됩니다",
    manualSupplement: "현금매출 중 현금영수증 미발행분이 있으면 별도로 알려주세요",
  },
  {
    id: "corp_purchase_receipt",
    label: "신용카드 매입자료 및 지출증빙용 현금영수증",
    detail: "홈택스에 확인되지 않는 매입이 있는 경우 관련 자료를 엑셀로 전달",
    dataKey: "purchase_ready",
    autoSource: "transactions",
    autoCoverage: 85,
    autoDescription: "연동된 카드·통장의 지출 내역은 AI가 자동 분류합니다",
    manualSupplement: "해외 사용분 등 홈택스에 확인되지 않는 매입 자료가 있으면 추가해 주세요",
  },
  {
    id: "corp_fixed_asset",
    label: "고정자산 구매 (100만원 초과)",
    detail: "자동차, 기계장치, 인테리어비용, 건물 등 → 매입세액 검토 필요",
    dataKey: "fixed_asset_ready",
    autoSource: null,
    manualSupplement: "관련 계약서·견적서 등을 첨부해 주세요",
  },
  {
    id: "corp_expense",
    label: "비용 지출 영수증 및 송금 명세서",
    detail: "4분기 기장을 위해 비용으로 지출하신 영수증을 월별로 정리하여 전달 (2025년 10월~12월)",
    dataKey: "expense_ready",
    autoSource: "transactions",
    autoCoverage: 80,
    autoDescription: "연동된 통장·카드의 지출 거래는 자동으로 월별 정리됩니다",
    manualSupplement: "현금으로 지출한 영수증 중 카드·통장에 없는 건만 별도 첨부해 주세요",
  },
  {
    id: "corp_bank",
    label: "법인 통장 거래내역",
    detail: "사업용 계좌의 거래내역 (2025년 10월~12월)",
    dataKey: "bank_ready",
    autoSource: "bank",
    autoCoverage: 100,
    autoDescription: "연동된 사업용 계좌의 거래내역이 자동으로 수집됩니다",
    manualSupplement: "연동되지 않은 계좌가 있다면 해당 은행 홈페이지에서 다운로드 후 전달해 주세요",
  },
];

/** 업종별 추가 요청자료 */
export const INDUSTRY_REQUIREMENTS: IndustryRequirement[] = [
  {
    matchKeywords: ["수출", "수입", "무역", "도소매", "도·소매", "무역업"],
    title: "수출·수입이 있는 경우",
    description: "수출·입이 있는 경우 영세율을 확인할 수 있는 첨부자료 전달",
    items: [
      {
        id: "trade_export",
        label: "수출 재화/용역 서류",
        detail: "수출신고서, 구매확인서, 내국신용장, 계약서, 외화입금증명서, 인보이스 등",
        dataKey: "export_docs_ready",
        autoSource: null,
        manualSupplement: "수출신고서, 구매확인서, 내국신용장, 계약서, 외화입금증명서, 인보이스 등을 첨부해 주세요",
      },
      {
        id: "trade_import",
        label: "수입 재화 서류",
        detail: "수입신고필증, 수입대행사(통관)정산서, 인보이스, 해외송금증 등",
        dataKey: "import_docs_ready",
        autoSource: null,
        manualSupplement: "수입신고필증, 수입대행사(통관)정산서, 인보이스, 해외송금증 등을 첨부해 주세요",
      },
    ],
  },
  {
    matchKeywords: ["부동산", "임대", "임대업", "부동산임대"],
    title: "부동산 임대사업자인 경우",
    description: "임차인과 계약한 보증금 및 월세 변동사항을 확인하기 위한 서류",
    items: [
      {
        id: "rental_contract",
        label: "임대차계약서 사본",
        detail: "현재 유효한 임대차계약서 사본 전달",
        dataKey: "rental_contract_ready",
        autoSource: null,
        manualSupplement: "현재 유효한 임대차계약서 사본을 전달해 주세요",
      },
      {
        id: "rental_invoice",
        label: "월세 세금계산서",
        detail: "월세 관련 세금계산서. ※ 변동사항이 없으시다면 사무실에 알려 주세요",
        dataKey: "rental_invoice_ready",
        autoSource: "hometax",
        autoCoverage: 90,
        autoDescription: "전자세금계산서는 홈택스에서 자동 확인됩니다",
        manualSupplement: "변동사항이 없으시다면 '변동 없음'으로 알려 주세요",
      },
    ],
  },
  {
    matchKeywords: ["건설", "건설업", "시공", "인테리어"],
    title: "건설업의 경우",
    description: "진행 중인 공사건과 신규 계약 공사건의 관련 계약서 사본 전달",
    items: [
      {
        id: "construction_ongoing",
        label: "진행 중인 공사건 계약서",
        detail: "2025년 진행 중인 공사건 관련 계약서 사본",
        dataKey: "construction_ongoing_ready",
        autoSource: null,
        manualSupplement: "2025년 진행 중인 공사건 관련 계약서 사본을 첨부해 주세요",
      },
      {
        id: "construction_new",
        label: "신규 계약 공사건 계약서",
        detail: "개인: 7월~12월 / 법인: 10월~12월 신규 계약 건",
        dataKey: "construction_new_ready",
        autoSource: null,
        manualSupplement: "해당 기간 내 신규 계약 건의 계약서 사본을 첨부해 주세요",
      },
    ],
  },
  {
    matchKeywords: ["전자상거래", "온라인", "쇼핑몰", "이커머스", "인터넷"],
    title: "전자상거래업의 경우",
    description: "인터넷 전자상거래 및 소셜커머스 플랫폼 매출",
    items: [
      {
        id: "ecommerce_sales",
        label: "플랫폼별 매출 내역 자료",
        detail: "각 사이트에서 매출 내역 자료를 다운받아 메일로 전달",
        dataKey: "ecommerce_sales_ready",
        autoSource: null,
        manualSupplement: "11번가, G마켓, 옥션, 티몬, 위메프, 쿠팡 등 각 플랫폼의 매출 내역을 다운로드하여 전달해 주세요. ※ 매출조회가 어려운 경우 사이트 아이디와 비밀번호를 대신 전달",
      },
    ],
  },
];

/** 사업자 유형에 따른 마감일 */
export function getDeadlineInfo(isCorporate: boolean) {
  return isCorporate
    ? { date: "2026년 1월 15일 (목)", label: "법인사업자 자료 마감일" }
    : { date: "2026년 1월 16일 (금)", label: "개인사업자 자료 마감일" };
}

/** business_type으로 해당 업종 추가 요청자료 필터 */
export function getMatchingIndustryRequirements(businessType: string | null): IndustryRequirement[] {
  if (!businessType) return [];
  const lower = businessType.toLowerCase();
  return INDUSTRY_REQUIREMENTS.filter((req) =>
    req.matchKeywords.some((kw) => lower.includes(kw.toLowerCase()))
  );
}
