import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FilingTab from "../FilingTab";
import type { TaxFilingTask } from "@/hooks/useTaxAccountant";

const futureDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const pastDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
};

const mockFilingTasks: TaxFilingTask[] = [
  {
    id: "filing-1",
    user_id: "user-1",
    accountant_id: null,
    filing_type: "부가가치세 확정신고",
    tax_period: "2025년 1기",
    deadline: futureDate(5),
    status: "preparing",
    prepared_data: { sales_ready: true, purchase_ready: true, invoice_ready: false, card_ready: false },
    review_notes: [],
    filing_method: "전자신고",
    notified_at: null,
    submitted_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "filing-2",
    user_id: "user-1",
    accountant_id: null,
    filing_type: "종합소득세 신고",
    tax_period: "2024년",
    deadline: pastDate(3),
    status: "submitted",
    prepared_data: { sales_ready: true, purchase_ready: true, invoice_ready: true, card_ready: true },
    review_notes: [{ note: "매입 세액 공제 확인 완료", date: "2025-05-20" }],
    filing_method: "전자신고",
    notified_at: null,
    submitted_at: pastDate(5),
    created_at: new Date().toISOString(),
  },
];

describe("FilingTab", () => {
  it("신고 목록을 렌더링한다", () => {
    render(<FilingTab filingTasks={mockFilingTasks} assignment={null} />);
    expect(screen.getByText("부가가치세 확정신고")).toBeInTheDocument();
    expect(screen.getByText("종합소득세 신고")).toBeInTheDocument();
  });

  it("D-day 배지를 표시한다", () => {
    render(<FilingTab filingTasks={mockFilingTasks} assignment={null} />);
    expect(screen.getByText(/D-\d+/)).toBeInTheDocument();
  });

  it("기한 초과를 표시한다", () => {
    const overdueTasks: TaxFilingTask[] = [{
      ...mockFilingTasks[0],
      id: "filing-overdue",
      deadline: pastDate(2),
      status: "preparing",
    }];
    render(<FilingTab filingTasks={overdueTasks} assignment={null} />);
    expect(screen.getByText("기한 초과")).toBeInTheDocument();
  });

  it("체크리스트 진행률을 표시한다 (준비 중 상태)", () => {
    render(<FilingTab filingTasks={[mockFilingTasks[0]]} assignment={null} />);
    expect(screen.getByText("데이터 준비 현황")).toBeInTheDocument();
    expect(screen.getByText("2/4")).toBeInTheDocument();
  });

  it("완료된 신고는 체크리스트를 숨기고 완료일을 표시한다", () => {
    render(<FilingTab filingTasks={[mockFilingTasks[1]]} assignment={null} />);
    expect(screen.getAllByText(/신고 완료/).length).toBeGreaterThan(0);
    expect(screen.queryByText("데이터 준비 현황")).not.toBeInTheDocument();
  });

  it("세무사 검토 노트를 표시한다", () => {
    render(<FilingTab filingTasks={[mockFilingTasks[1]]} assignment={null} />);
    expect(screen.getByText("세무사 검토 메모")).toBeInTheDocument();
    expect(screen.getByText(/매입 세액 공제 확인 완료/)).toBeInTheDocument();
  });

  it("신고가 없으면 빈 상태를 표시한다", () => {
    render(<FilingTab filingTasks={[]} assignment={null} />);
    expect(screen.getByText("예정된 신고가 없습니다")).toBeInTheDocument();
  });

  it("로딩 중일 때 스켈레톤을 표시한다", () => {
    const { container } = render(<FilingTab filingTasks={[]} assignment={null} loading={true} />);
    const skeletons = container.querySelectorAll('[class*="skeleton"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
