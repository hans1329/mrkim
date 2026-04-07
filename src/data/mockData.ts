// 김비서 시뮬레이션 데이터

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'card' | 'cash' | 'transfer';
  date: string;
  vatAmount?: number;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  joinDate: string;
  insuranceStatus: '가입' | '미가입';
  status: '재직' | '퇴사';
}

export interface Deposit {
  id: string;
  type: 'vat' | 'salary' | 'emergency';
  name: string;
  amount: number;
  targetAmount?: number;
  dueDate?: string;
}

export interface AutoTransfer {
  id: string;
  name: string;
  amount: number;
  recipient: string;
  condition: string;
  status: 'pending' | 'scheduled' | 'completed';
  scheduledDate?: string;
}

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// 오늘 날짜 기준 데이터 생성
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'income',
    category: '매출',
    description: '점심 매출',
    amount: 850000,
    paymentMethod: 'card',
    date: formatDate(today),
    vatAmount: 77273,
  },
  {
    id: '2',
    type: 'income',
    category: '매출',
    description: '저녁 매출',
    amount: 400000,
    paymentMethod: 'cash',
    date: formatDate(today),
    vatAmount: 36364,
  },
  {
    id: '3',
    type: 'expense',
    category: '식자재',
    description: '농산물 구매',
    amount: 320000,
    paymentMethod: 'card',
    date: formatDate(today),
  },
  {
    id: '4',
    type: 'expense',
    category: '관리비',
    description: '전기요금',
    amount: 180000,
    paymentMethod: 'transfer',
    date: formatDate(new Date(today.getTime() - 86400000)),
  },
  {
    id: '5',
    type: 'income',
    category: '매출',
    description: '카드 매출',
    amount: 1200000,
    paymentMethod: 'card',
    date: formatDate(new Date(today.getTime() - 86400000)),
    vatAmount: 109091,
  },
];

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: '김민수',
    position: '매니저',
    department: '운영',
    salary: 3500000,
    joinDate: '2023-03-15',
    insuranceStatus: '가입',
    status: '재직',
  },
  {
    id: '2',
    name: '이영희',
    position: '주방장',
    department: '주방',
    salary: 4000000,
    joinDate: '2022-08-01',
    insuranceStatus: '가입',
    status: '재직',
  },
  {
    id: '3',
    name: '박서준',
    position: '서빙',
    department: '홀',
    salary: 2400000,
    joinDate: '2024-01-10',
    insuranceStatus: '가입',
    status: '재직',
  },
];

export const mockDeposits: Deposit[] = [
  {
    id: '1',
    type: 'vat',
    name: '부가세 예치금',
    amount: 2340000,
    targetAmount: 3000000,
    dueDate: '2026-01-25',
  },
  {
    id: '2',
    type: 'salary',
    name: '급여 적립금',
    amount: 9900000,
    targetAmount: 9900000,
    dueDate: '2026-01-31',
  },
  {
    id: '3',
    type: 'emergency',
    name: '비상 운영자금',
    amount: 5000000,
    targetAmount: 10000000,
  },
];

export const mockAutoTransfers: AutoTransfer[] = [
  {
    id: '1',
    name: '직원 급여',
    amount: 9900000,
    recipient: '전 직원',
    condition: '매월 말일',
    status: 'scheduled',
    scheduledDate: '2026-01-31',
  },
  {
    id: '2',
    name: 'A상사 대금',
    amount: 5000000,
    recipient: 'A상사',
    condition: '납품 완료 시',
    status: 'pending',
  },
  {
    id: '3',
    name: '임대료',
    amount: 2500000,
    recipient: '건물주',
    condition: '매월 5일',
    status: 'completed',
    scheduledDate: '2026-01-05',
  },
];

export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'warning',
    title: '이상 결제 감지',
    message: '평소보다 높은 금액(₩850,000)의 카드 결제가 감지되었습니다.',
    timestamp: new Date().toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'info',
    title: '급여일 알림',
    message: '3일 후 급여 지급 예정입니다. 총 ₩9,900,000',
    timestamp: new Date().toISOString(),
    read: false,
  },
  {
    id: '3',
    type: 'success',
    title: '부가세 자동 적립',
    message: '오늘 매출에서 ₩113,637이 부가세로 자동 적립되었습니다.',
    timestamp: new Date().toISOString(),
    read: true,
  },
];

// 통계 계산 함수들
export const getTodayStats = () => {
  const todayStr = formatDate(today);
  const todayTransactions = mockTransactions.filter(t => t.date === todayStr);
  
  const income = todayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expense = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const cardIncome = todayTransactions
    .filter(t => t.type === 'income' && t.paymentMethod === 'card')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const cashIncome = todayTransactions
    .filter(t => t.type === 'income' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    income,
    expense,
    profit: income - expense,
    cardIncome,
    cashIncome,
    cardRatio: income > 0 ? Math.round((cardIncome / income) * 100) : 0,
    cashRatio: income > 0 ? Math.round((cashIncome / income) * 100) : 0,
  };
};

export const getWeeklyData = () => {
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  return days.map((day, index) => ({
    name: day,
    매출: Math.floor(Math.random() * 1500000) + 500000,
    지출: Math.floor(Math.random() * 500000) + 200000,
  }));
};

export const formatCurrency = (amount: number, currency: string = 'KRW'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
};

export const formatNumber = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR').format(amount);
};
