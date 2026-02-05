# Memory: contexts/connection-state-management
Updated: 2026-02-05

## 연동 상태 중앙 집중 관리

`ConnectionContext`가 로그인 상태와 데이터 연동 상태를 통합 관리하여, 대시보드, 채팅, 온보딩 등 모든 컴포넌트에서 일관된 상태를 사용할 수 있도록 함.

---

## 핵심 상태

```typescript
interface ConnectionState {
  // 인증 상태
  authStatus: "loading" | "logged_out" | "logged_in";
  isLoggedIn: boolean;
  isLoggedOut: boolean;
  userId: string | null;
  
  // 개별 연동 상태
  hometaxConnected: boolean;
  cardConnected: boolean;
  accountConnected: boolean;
  
  // 집계 상태
  isAnyConnected: boolean;          // 하나라도 연동됨
  isFullyConnected: boolean;        // 모두 연동됨
  isTransactionConnected: boolean;  // 카드 또는 계좌 (거래 데이터)
  connectedCount: number;
  
  // 상태 조합
  isLoggedInButNotConnected: boolean;
}
```

---

## 사용 예시

### Dashboard에서 사용
```tsx
import { useConnection } from "@/contexts/ConnectionContext";

export function Dashboard() {
  const {
    isLoggedOut,
    isLoggedInButNotConnected,
    isAnyConnected,
    hometaxConnected,
    isTransactionConnected,
  } = useConnection();
  
  // 조건부 렌더링
}
```

### AI 채팅에서 사용
```tsx
import { useConnection, getConnectionContextForAI } from "@/contexts/ConnectionContext";

// 시스템 프롬프트에 연동 상태 추가
const connectionContext = getConnectionContextForAI(connectionState);
```

---

## AI 채팅 연동 상태 반영

`getConnectionContextForAI()` 함수는 AI에게 전달할 연동 상태 컨텍스트를 생성:

- **로그아웃**: 로그인 먼저 안내
- **미연동**: 데이터 연동 안내, 허구 데이터 금지
- **부분 연동**: 미연동 항목별 안내
- **완전 연동**: 정확한 정보 제공 가능

---

## 파일 구조

- `src/contexts/ConnectionContext.tsx` - 중앙 상태 관리
- `src/App.tsx` - ConnectionProvider 적용
- `src/pages/Dashboard.tsx` - useConnection 사용
- `supabase/functions/chat-ai/index.ts` - 연동 상태 기반 응답 생성

---

## 연동 시나리오별 AI 응답 가이드

| 상태 | AI 응답 방향 |
|------|------------|
| 로그아웃 | "로그인 후 이용 가능합니다" |
| 로그인+미연동 | "데이터 연동이 필요합니다. 온보딩에서 연동해주세요" |
| 홈택스만 연동 | 세금계산서 정보 제공 가능, 거래 조회는 카드/계좌 연동 안내 |
| 카드만 연동 | 카드 거래 조회 가능, 세금계산서는 홈택스 연동 안내 |
| 완전 연동 | 모든 기능 정상 제공 |
