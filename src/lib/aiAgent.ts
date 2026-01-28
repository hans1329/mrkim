// 김비서 AI Agent - Function Calling 시뮬레이션
import { mockTransactions, mockEmployees, mockDeposits, mockAutoTransfers, getTodayStats, formatCurrency, formatNumber } from "@/data/mockData";

// ============================================
// 시스템 프롬프트 (실제 LLM 연동 시 사용)
// ============================================
export const SYSTEM_PROMPT = `당신은 '김비서', 소상공인 사장님을 위한 업무 전문 AI입니다.

【할 수 있는 일】
- 자금 조회/이체/예치 관리
- 직원 급여/퇴사/인사 처리
- 매출/세금 분석 및 리포트
- 자동이체 규칙 설정
- 거래처 대금 관리

【할 수 없는 일】
- 맛집, 날씨, 뉴스 등 일반 상식 질문
- 업무와 무관한 잡담이나 개인적 조언
- 법률/의료/투자 전문 상담

업무 외 질문을 받으면 정중히 거절하고, 도움 가능한 업무를 안내하세요.
항상 존댓말을 사용하고, 친근하면서도 전문적인 톤을 유지하세요.
금액은 원화(₩)로, 날짜는 한국식으로 표시하세요.`;

// ============================================
// Function Definitions (Tool Schema)
// ============================================
export interface FunctionDefinition {
  name: string;
  description: string;
  category: "자금" | "인사" | "분석" | "설정";
  parameters?: Record<string, { type: string; description: string; required?: boolean }>;
}

export const AVAILABLE_FUNCTIONS: FunctionDefinition[] = [
  // 자금 관련
  {
    name: "get_balance",
    description: "현재 잔액 및 예치금 현황을 조회합니다",
    category: "자금",
  },
  {
    name: "transfer_funds",
    description: "지정된 계좌로 자금을 이체합니다",
    category: "자금",
    parameters: {
      amount: { type: "number", description: "이체 금액", required: true },
      recipient: { type: "string", description: "수취인", required: true },
      memo: { type: "string", description: "적요" },
    },
  },
  {
    name: "set_auto_transfer",
    description: "자동이체 규칙을 설정합니다",
    category: "자금",
    parameters: {
      name: { type: "string", description: "이체명", required: true },
      amount: { type: "number", description: "금액", required: true },
      condition: { type: "string", description: "실행 조건", required: true },
    },
  },
  {
    name: "move_to_savings",
    description: "유휴자금을 파킹통장으로 이동합니다",
    category: "자금",
    parameters: {
      amount: { type: "number", description: "이동 금액", required: true },
    },
  },

  // 인사 관련
  {
    name: "list_employees",
    description: "직원 목록과 정보를 조회합니다",
    category: "인사",
  },
  {
    name: "process_payroll",
    description: "급여를 정산하고 지급을 준비합니다",
    category: "인사",
    parameters: {
      month: { type: "string", description: "정산 월" },
    },
  },
  {
    name: "process_resignation",
    description: "직원 퇴사 처리를 진행합니다 (4대보험 상실신고, 퇴직금 계산 포함)",
    category: "인사",
    parameters: {
      employee_name: { type: "string", description: "퇴사 직원명", required: true },
      resignation_date: { type: "string", description: "퇴사일", required: true },
    },
  },

  // 분석 관련
  {
    name: "get_sales_report",
    description: "매출 현황 및 분석 리포트를 생성합니다",
    category: "분석",
    parameters: {
      period: { type: "string", description: "조회 기간 (오늘/이번주/이번달)" },
    },
  },
  {
    name: "get_vat_status",
    description: "부가세 예치 현황을 조회합니다",
    category: "분석",
  },
  {
    name: "forecast_cashflow",
    description: "현금 흐름을 예측합니다",
    category: "분석",
    parameters: {
      days: { type: "number", description: "예측 기간 (일)" },
    },
  },
  {
    name: "calculate_tax",
    description: "예상 세금을 계산합니다",
    category: "분석",
  },
];

// ============================================
// Intent Classification (의도 분류)
// ============================================
type IntentType = "business" | "off_topic" | "greeting" | "unclear";

interface ClassifiedIntent {
  type: IntentType;
  matchedFunction?: string;
  confidence: number;
  extractedParams?: Record<string, unknown>;
}

const OFF_TOPIC_KEYWORDS = [
  "맛집", "날씨", "뉴스", "영화", "음악", "게임", "연예인", "스포츠",
  "주식", "코인", "비트코인", "로또", "여행", "맛있는", "추천해", "어디가",
  "재밌는", "심심", "사랑", "연애", "결혼"
];

const GREETING_KEYWORDS = ["안녕", "하이", "헬로", "반가워", "처음"];

export function classifyIntent(input: string): ClassifiedIntent {
  const lowerInput = input.toLowerCase().trim();

  // 인사 체크
  if (GREETING_KEYWORDS.some(kw => lowerInput.includes(kw))) {
    return { type: "greeting", confidence: 0.9 };
  }

  // Off-topic 체크
  if (OFF_TOPIC_KEYWORDS.some(kw => lowerInput.includes(kw))) {
    return { type: "off_topic", confidence: 0.85 };
  }

  // 업무 관련 키워드 매칭
  const functionMatches: { func: string; score: number; params?: Record<string, unknown> }[] = [];

  // 잔액/예치금 조회
  if (/잔액|잔고|예치|얼마|있어|남아/.test(lowerInput) && /조회|확인|알려|보여/.test(lowerInput)) {
    functionMatches.push({ func: "get_balance", score: 0.9 });
  }

  // 이체 요청
  if (/이체|보내|송금|입금/.test(lowerInput)) {
    const amountMatch = lowerInput.match(/(\d+)\s*(만원|원|천원)/);
    const params: Record<string, unknown> = {};
    if (amountMatch) {
      let amount = parseInt(amountMatch[1]);
      if (amountMatch[2] === "만원") amount *= 10000;
      if (amountMatch[2] === "천원") amount *= 1000;
      params.amount = amount;
    }
    functionMatches.push({ func: "transfer_funds", score: 0.85, params });
  }

  // 자동이체 설정
  if (/자동이체|자동.*(설정|등록)/.test(lowerInput)) {
    functionMatches.push({ func: "set_auto_transfer", score: 0.9 });
  }

  // 파킹/저축
  if (/파킹|저축|옮겨|굴려/.test(lowerInput) && /남는|유휴|여유/.test(lowerInput)) {
    functionMatches.push({ func: "move_to_savings", score: 0.85 });
  }

  // 직원 목록
  if (/직원|인원|스태프/.test(lowerInput) && /목록|명단|누구|몇명/.test(lowerInput)) {
    functionMatches.push({ func: "list_employees", score: 0.9 });
  }

  // 급여 정산
  if (/급여|월급|임금/.test(lowerInput) && /정산|계산|지급|준비/.test(lowerInput)) {
    functionMatches.push({ func: "process_payroll", score: 0.9 });
  }

  // 퇴사 처리
  if (/퇴사|퇴직|그만/.test(lowerInput) && /처리|신고|정리/.test(lowerInput)) {
    const nameMatch = lowerInput.match(/([가-힣]{2,4})\s*(씨|님|직원)?.*퇴사/);
    const params: Record<string, unknown> = {};
    if (nameMatch) params.employee_name = nameMatch[1];
    functionMatches.push({ func: "process_resignation", score: 0.9, params });
  }

  // 매출 조회
  if (/매출|수익|판매/.test(lowerInput) && /오늘|이번|얼마|조회|알려/.test(lowerInput)) {
    functionMatches.push({ func: "get_sales_report", score: 0.9 });
  }

  // 부가세
  if (/부가세|vat|세금.*적립/.test(lowerInput)) {
    functionMatches.push({ func: "get_vat_status", score: 0.9 });
  }

  // 현금흐름 예측
  if (/현금.*흐름|캐시.*플로우|예측|전망/.test(lowerInput)) {
    functionMatches.push({ func: "forecast_cashflow", score: 0.85 });
  }

  // 세금 계산
  if (/세금.*계산|세금.*얼마|종소세|소득세/.test(lowerInput)) {
    functionMatches.push({ func: "calculate_tax", score: 0.85 });
  }

  // 가장 높은 매칭 반환
  if (functionMatches.length > 0) {
    functionMatches.sort((a, b) => b.score - a.score);
    const best = functionMatches[0];
    return {
      type: "business",
      matchedFunction: best.func,
      confidence: best.score,
      extractedParams: best.params,
    };
  }

  // 일반적인 업무 키워드 (함수 특정 불가)
  if (/돈|금액|계좌|통장|직원|급여|매출|지출|세금|이체|정산/.test(lowerInput)) {
    return { type: "unclear", confidence: 0.6 };
  }

  return { type: "off_topic", confidence: 0.5 };
}

// ============================================
// Function Execution (Mock)
// ============================================
export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export function executeFunction(
  functionName: string,
  params?: Record<string, unknown>
): ExecutionResult {
  const stats = getTodayStats();

  switch (functionName) {
    case "get_balance": {
      const totalDeposits = mockDeposits.reduce((sum, d) => sum + d.amount, 0);
      return {
        success: true,
        message: `💰 **자금 현황**\n\n` +
          `**운영 계좌**: ${formatCurrency(stats.income - stats.expense)}\n\n` +
          `**예치금 현황**:\n` +
          mockDeposits.map(d => `• ${d.name}: ${formatCurrency(d.amount)}`).join("\n") +
          `\n\n**총 예치금**: ${formatCurrency(totalDeposits)}`,
        data: { balance: stats.income - stats.expense, deposits: mockDeposits },
      };
    }

    case "transfer_funds": {
      const amount = params?.amount as number;
      const recipient = params?.recipient as string || "수취인 미지정";
      return {
        success: true,
        requiresConfirmation: true,
        confirmationMessage: `💸 **이체 확인**\n\n` +
          `• 금액: ${formatCurrency(amount || 0)}\n` +
          `• 수취인: ${recipient}\n\n` +
          `이체를 진행할까요?`,
        message: `✅ ${formatCurrency(amount || 0)}을 ${recipient}에게 이체했습니다.`,
      };
    }

    case "set_auto_transfer": {
      return {
        success: true,
        requiresConfirmation: true,
        confirmationMessage: `⚙️ **자동이체 설정**\n\n새로운 자동이체 규칙을 등록할까요?\n\n등록 후 조건이 충족되면 자동으로 실행됩니다.`,
        message: `✅ 자동이체 규칙이 등록되었습니다.\n\n자금관리 > 자동이체에서 확인하세요.`,
      };
    }

    case "move_to_savings": {
      const amount = params?.amount as number || 1000000;
      return {
        success: true,
        requiresConfirmation: true,
        confirmationMessage: `🏦 **파킹통장 이동**\n\n` +
          `${formatCurrency(amount)}을 파킹통장으로 옮기시겠어요?\n\n` +
          `예상 월 이자: ${formatCurrency(Math.round(amount * 0.02 / 12))}`,
        message: `✅ ${formatCurrency(amount)}이 파킹통장으로 이동되었습니다.\n\n연 2% 이자가 적용됩니다.`,
      };
    }

    case "list_employees": {
      const activeEmployees = mockEmployees.filter(e => e.status === "재직");
      return {
        success: true,
        message: `👥 **직원 현황** (총 ${activeEmployees.length}명)\n\n` +
          activeEmployees.map(e => 
            `• **${e.name}** (${e.position})\n  월급: ${formatCurrency(e.salary)} | 4대보험: ${e.insuranceStatus}`
          ).join("\n\n"),
        data: { employees: activeEmployees },
      };
    }

    case "process_payroll": {
      const totalSalary = mockEmployees
        .filter(e => e.status === "재직")
        .reduce((sum, e) => sum + e.salary, 0);
      return {
        success: true,
        requiresConfirmation: true,
        confirmationMessage: `💵 **급여 정산**\n\n` +
          `• 대상 인원: ${mockEmployees.filter(e => e.status === "재직").length}명\n` +
          `• 총 지급액: ${formatCurrency(totalSalary)}\n` +
          `• 4대보험 공제: ${formatCurrency(Math.round(totalSalary * 0.09))}\n\n` +
          `급여 지급을 준비할까요?`,
        message: `✅ 급여 정산이 완료되었습니다.\n\n` +
          `• 지급 예정일: 월말\n` +
          `• 총 지급액: ${formatCurrency(totalSalary)}`,
      };
    }

    case "process_resignation": {
      const employeeName = params?.employee_name as string || "직원";
      const employee = mockEmployees.find(e => e.name === employeeName);
      
      if (!employee) {
        return {
          success: false,
          message: `❌ "${employeeName}" 직원을 찾을 수 없습니다.\n\n직원 목록을 확인해주세요.`,
        };
      }

      return {
        success: true,
        requiresConfirmation: true,
        confirmationMessage: `📋 **퇴사 처리 확인**\n\n` +
          `• 직원: ${employee.name} (${employee.position})\n` +
          `• 입사일: ${employee.joinDate}\n` +
          `• 월급: ${formatCurrency(employee.salary)}\n\n` +
          `**자동 처리 항목**:\n` +
          `✅ 4대보험 상실신고\n` +
          `✅ 퇴직금 계산\n` +
          `✅ 마지막 급여 정산\n\n` +
          `퇴사 처리를 진행할까요?`,
        message: `✅ **${employee.name}** 퇴사 처리가 완료되었습니다.\n\n` +
          `• 예상 퇴직금: ${formatCurrency(employee.salary * 2)}\n` +
          `• 4대보험 상실신고: 자동 접수됨`,
      };
    }

    case "get_sales_report": {
      return {
        success: true,
        message: `📊 **오늘 매출 리포트**\n\n` +
          `• 총 매출: ${formatCurrency(stats.income)}\n` +
          `• 총 지출: ${formatCurrency(stats.expense)}\n` +
          `• 순이익: ${formatCurrency(stats.profit)}\n\n` +
          `**결제 수단별**:\n` +
          `• 카드: ${formatCurrency(stats.cardIncome)} (${stats.cardRatio}%)\n` +
          `• 현금: ${formatCurrency(stats.cashIncome)} (${stats.cashRatio}%)`,
        data: stats,
      };
    }

    case "get_vat_status": {
      const vatDeposit = mockDeposits.find(d => d.type === "vat");
      if (!vatDeposit) {
        return { success: false, message: "부가세 예치금 정보가 없습니다." };
      }
      const progress = Math.round((vatDeposit.amount / (vatDeposit.targetAmount || 1)) * 100);
      return {
        success: true,
        message: `🧾 **부가세 현황**\n\n` +
          `• 적립금: ${formatCurrency(vatDeposit.amount)}\n` +
          `• 목표액: ${formatCurrency(vatDeposit.targetAmount || 0)}\n` +
          `• 달성률: ${progress}%\n` +
          `• 납부일: ${vatDeposit.dueDate}`,
        data: vatDeposit,
      };
    }

    case "forecast_cashflow": {
      const days = (params?.days as number) || 30;
      const dailyIncome = stats.income;
      const dailyExpense = stats.expense;
      const projected = (dailyIncome - dailyExpense) * days;
      return {
        success: true,
        message: `📈 **${days}일 현금흐름 예측**\n\n` +
          `• 예상 수입: ${formatCurrency(dailyIncome * days)}\n` +
          `• 예상 지출: ${formatCurrency(dailyExpense * days)}\n` +
          `• 예상 잔액 변동: ${formatCurrency(projected)}\n\n` +
          (projected > 0 
            ? `✅ 양호한 현금흐름이 예상됩니다.` 
            : `⚠️ 자금 부족이 예상됩니다. 대출 연결을 검토해보세요.`),
      };
    }

    case "calculate_tax": {
      const monthlyIncome = stats.income * 30;
      const estimatedVAT = Math.round(monthlyIncome / 11);
      const estimatedIncome = Math.round(monthlyIncome * 0.15);
      return {
        success: true,
        message: `🧮 **예상 세금 (월 기준)**\n\n` +
          `• 예상 월 매출: ${formatCurrency(monthlyIncome)}\n\n` +
          `**부가세** (분기별)\n` +
          `• 예상액: ${formatCurrency(estimatedVAT * 3)}\n\n` +
          `**종합소득세** (연간)\n` +
          `• 예상액: ${formatCurrency(estimatedIncome * 12)}\n\n` +
          `💡 정확한 계산은 세무사 상담을 권장드려요.`,
      };
    }

    default:
      return {
        success: false,
        message: "지원하지 않는 기능입니다.",
      };
  }
}

// ============================================
// Main Response Generator
// ============================================
export interface AgentResponse {
  message: string;
  intent: ClassifiedIntent;
  executionResult?: ExecutionResult;
}

export function generateAgentResponse(input: string): AgentResponse {
  const intent = classifyIntent(input);

  switch (intent.type) {
    case "greeting":
      return {
        message: `안녕하세요, 사장님! 👋\n\n김비서입니다. 오늘도 사업 번창하시길 바랍니다.\n\n무엇을 도와드릴까요?\n\n💡 **추천 명령**:\n• "오늘 매출 알려줘"\n• "직원 목록 보여줘"\n• "부가세 현황 확인"`,
        intent,
      };

    case "off_topic":
      return {
        message: `죄송합니다, 저는 사업 운영 업무만 도와드릴 수 있어요. 🙏\n\n**도움 가능한 업무**:\n• 💰 자금 조회/이체/예치\n• 👥 직원 급여/퇴사 처리\n• 📊 매출/세금 분석\n• ⚙️ 자동이체 설정\n\n위 업무에 대해 물어봐 주세요!`,
        intent,
      };

    case "unclear":
      return {
        message: `조금 더 구체적으로 말씀해주시겠어요? 🤔\n\n**예시**:\n• "오늘 매출 얼마야?"\n• "김민수 직원 퇴사 처리해줘"\n• "잔액 조회해줘"\n• "부가세 얼마나 모였어?"`,
        intent,
      };

    case "business":
      if (intent.matchedFunction) {
        const result = executeFunction(intent.matchedFunction, intent.extractedParams);
        return {
          message: result.requiresConfirmation 
            ? result.confirmationMessage! 
            : result.message,
          intent,
          executionResult: result,
        };
      }
      return {
        message: "명령을 이해했지만 처리할 수 없습니다. 다시 시도해주세요.",
        intent,
      };

    default:
      return {
        message: "명령을 이해하지 못했습니다. 다시 말씀해주세요.",
        intent,
      };
  }
}
