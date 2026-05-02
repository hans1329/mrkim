import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConsultationTab from "../ConsultationTab";
import type { TaxConsultation, TaxAccountantAssignment } from "@/hooks/useTaxAccountant";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }), getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "token" } } }) },
    from: vi.fn().mockReturnValue({ insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "new" }, error: null }) }) }) }),
  },
}));

const mockConsultations: TaxConsultation[] = [
  {
    id: "cons-1",
    user_id: "user-1",
    accountant_id: "acc-1",
    consultation_type: "ad_hoc",
    subject: "부가세 신고 관련 문의",
    user_question: "부가세 신고 기한이 언제인가요?",
    ai_preliminary_answer: "부가세 신고는 매 분기 다음달 25일까지입니다.",
    data_package: {},
    status: "pending",
    accountant_response: null,
    email_sent_at: null,
    created_at: new Date().toISOString(),
    responded_at: null,
  },
  {
    id: "cons-2",
    user_id: "user-1",
    accountant_id: null,
    consultation_type: "ad_hoc",
    subject: "종소세 절세 방법",
    user_question: "종합소득세 절세 방법이 있을까요?",
    ai_preliminary_answer: null,
    data_package: {},
    status: "sent",
    accountant_response: null,
    email_sent_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    responded_at: null,
  },
];

const mockAssignment: TaxAccountantAssignment = {
  id: "assign-1",
  user_id: "user-1",
  accountant_id: "acc-1",
  status: "confirmed",
  assigned_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
};

describe("ConsultationTab", () => {
  it("상담 목록을 렌더링한다", () => {
    render(
      <ConsultationTab
        consultations={mockConsultations}
        assignment={mockAssignment}
        onCreated={vi.fn()}
      />
    );
    expect(screen.getByText("부가세 신고 관련 문의")).toBeInTheDocument();
    expect(screen.getByText("종소세 절세 방법")).toBeInTheDocument();
  });

  it("상태 배지를 올바르게 표시한다", () => {
    render(
      <ConsultationTab
        consultations={mockConsultations}
        assignment={mockAssignment}
        onCreated={vi.fn()}
      />
    );
    expect(screen.getByText("대기 중")).toBeInTheDocument();
    expect(screen.getByText("전달됨")).toBeInTheDocument();
  });

  it("새 상담 요청 버튼을 클릭하면 폼이 나타난다", () => {
    render(
      <ConsultationTab
        consultations={[]}
        assignment={mockAssignment}
        onCreated={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("새 상담 요청"));
    expect(screen.getByPlaceholderText(/상담 제목/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/질문할 내용/)).toBeInTheDocument();
  });

  it("담당 세무사가 있으면 이메일 전달 버튼을 표시한다", () => {
    render(
      <ConsultationTab
        consultations={mockConsultations}
        assignment={mockAssignment}
        onCreated={vi.fn()}
      />
    );
    expect(screen.getByText("세무사에게 이메일 전달")).toBeInTheDocument();
  });

  it("상담이 없으면 빈 상태를 표시한다", () => {
    render(
      <ConsultationTab
        consultations={[]}
        assignment={mockAssignment}
        onCreated={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("새 상담 요청"));
    expect(screen.getByText("새 상담 요청")).toBeInTheDocument();
  });

  it("로딩 중일 때 스켈레톤을 표시한다", () => {
    const { container } = render(
      <ConsultationTab
        consultations={[]}
        assignment={null}
        onCreated={vi.fn()}
        loading={true}
      />
    );
    const skeletons = container.querySelectorAll('div[class*="rounded-lg"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
