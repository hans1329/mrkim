/**
 * 부가가치세 확정신고 필요 서류 및 증빙
 * 출처: 영앤진 세무법인 — 2025년 2기 확정신고 안내문 (개인/법인)
 */

export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  /** prepared_data의 해당 키 */
  dataKey: string;
}

export interface IndustryRequirement {
  /** 매칭할 business_type 키워드 목록 */
  matchKeywords: string[];
  title: string;
  description: string;
  items: ChecklistItem[];
}

/** 개인사업자 기본 요청자료 */
export const INDIVIDUAL_BASIC_ITEMS: ChecklistItem[] = [
  {
    id: "ind_invoice",
    label: "매출·매입 종이세금계산서 및 계산서",
    detail: "전자세금계산서는 홈택스에서 확인 가능. '종이세금계산서'만 스캔하여 메일 또는 실물 우편 송부 (2025년 7월~12월)",
    dataKey: "invoice_ready",
  },
  {
    id: "ind_card_sales",
    label: "카드매출 및 현금매출 내역",
    detail: "카드단말기(포스기) 매출내역 → 카드리더기 회사에 요청 / 현금매출내역 (현금영수증 발행분 제외). ※ 병원의 경우 병원 프로그램에서 쓰는 매출내역, 포스매출내역",
    dataKey: "card_ready",
  },
  {
    id: "ind_purchase_receipt",
    label: "신용카드 매입자료 및 지출증빙용 현금영수증",
    detail: "해외 사용분 등 홈택스에 확인되지 않는 매입이 있는 경우 신용카드명세서 등 관련 자료를 엑셀로 전달",
    dataKey: "purchase_ready",
  },
  {
    id: "ind_fixed_asset",
    label: "고정자산 구매 (100만원 초과)",
    detail: "자동차, 기계장치, 인테리어비용, 건물 등 → 매입세액 검토 필요. 관련 계약서·견적서 등 전달. 차량 매매 구입 시 자동차등록증, 매매계약서 등. 차량 리스 시 리스계약서, 원리금상환내역서 등",
    dataKey: "fixed_asset_ready",
  },
  {
    id: "ind_expense",
    label: "비용 지출 영수증 및 송금 명세서 일체",
    detail: "3~4분기 기장을 위해 비용으로 지출하신 영수증을 월별로 정리하여 전달 (2025년 7월~12월)",
    dataKey: "expense_ready",
  },
  {
    id: "ind_bank",
    label: "통장 거래내역",
    detail: "사업용 계좌의 해당 거래은행 홈페이지에서 통장거래내역 다운 후 이메일로 전달 (2025년 7월~12월)",
    dataKey: "bank_ready",
  },
];

/** 법인사업자 기본 요청자료 */
export const CORPORATE_BASIC_ITEMS: ChecklistItem[] = [
  {
    id: "corp_invoice",
    label: "매출·매입 종이세금계산서 및 계산서",
    detail: "전자세금계산서는 홈택스에서 확인 가능. '종이세금계산서'만 스캔하여 메일 또는 실물 우편 송부 (2025년 10월~12월)",
    dataKey: "invoice_ready",
  },
  {
    id: "corp_card_sales",
    label: "카드매출 및 현금매출 내역",
    detail: "카드단말기(포스기) 매출내역 → 카드리더기 회사에 요청 / 현금매출내역 (현금영수증 발행분 제외)",
    dataKey: "card_ready",
  },
  {
    id: "corp_purchase_receipt",
    label: "신용카드 매입자료 및 지출증빙용 현금영수증",
    detail: "해외 사용분 등 홈택스에 확인되지 않는 매입이 있는 경우 신용카드명세서 등 관련 자료를 엑셀로 전달",
    dataKey: "purchase_ready",
  },
  {
    id: "corp_fixed_asset",
    label: "고정자산 구매 (100만원 초과)",
    detail: "자동차, 기계장치, 인테리어비용, 건물 등 → 매입세액 검토 필요. 관련 계약서·견적서 등 전달",
    dataKey: "fixed_asset_ready",
  },
  {
    id: "corp_expense",
    label: "비용 지출 영수증 및 송금 명세서 일체",
    detail: "4분기 기장을 위해 비용으로 지출하신 영수증을 월별로 정리하여 전달 (2025년 10월~12월)",
    dataKey: "expense_ready",
  },
  {
    id: "corp_bank",
    label: "법인 통장 거래내역",
    detail: "사업용 계좌의 해당 거래은행 홈페이지에서 통장거래내역 다운 후 이메일로 전달 (2025년 10월~12월)",
    dataKey: "bank_ready",
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
      },
      {
        id: "trade_import",
        label: "수입 재화 서류",
        detail: "수입신고필증, 수입대행사(통관)정산서, 인보이스, 해외송금증 등",
        dataKey: "import_docs_ready",
      },
    ],
  },
  {
    matchKeywords: ["부동산", "임대", "임대업", "부동산임대"],
    title: "부동산 임대사업자인 경우",
    description: "임차인과 계약한 보증금 및 월세 변동사항을 확인하기 위하여 아래 서류 전달",
    items: [
      {
        id: "rental_contract",
        label: "임대차계약서 사본",
        detail: "현재 유효한 임대차계약서 사본 전달",
        dataKey: "rental_contract_ready",
      },
      {
        id: "rental_invoice",
        label: "월세 세금계산서",
        detail: "월세 관련 세금계산서. ※ 변동사항이 없으시다면 변동사항이 없음을 사무실에 알려 주시기 바랍니다",
        dataKey: "rental_invoice_ready",
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
      },
      {
        id: "construction_new",
        label: "신규 계약 공사건 계약서",
        detail: "개인: 7월~12월 / 법인: 10월~12월 신규 계약 건",
        dataKey: "construction_new_ready",
      },
    ],
  },
  {
    matchKeywords: ["전자상거래", "온라인", "쇼핑몰", "이커머스", "인터넷"],
    title: "전자상거래업의 경우",
    description: "인터넷 전자상거래 (11번가, G마켓, 옥션) 및 소셜커머스 (티몬, 위메프, 쿠팡 등)를 통한 매출이 있을 경우",
    items: [
      {
        id: "ecommerce_sales",
        label: "플랫폼별 매출 내역 자료",
        detail: "각각의 사이트에서 매출 내역 자료를 다운받아 메일로 전달. ※ 매출조회가 어려운 경우 플랫폼 사이트 아이디와 비밀번호를 대신 전달",
        dataKey: "ecommerce_sales_ready",
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
