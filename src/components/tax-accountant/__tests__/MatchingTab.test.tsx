import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MatchingTab from "../MatchingTab";
import type { TaxAccountant, TaxAccountantAssignment } from "@/hooks/useTaxAccountant";

const mockAccountants: TaxAccountant[] = [
  {
    id: "acc-1",
    name: "김세무",
    email: "kim@example.com",
    phone: "010-1234-5678",
    firm_name: "김세무회계사무소",
    specialties: ["부가세", "종합소득세", "법인세"],
    industry_types: ["음식점", "카페"],
    region: "서울 강남",
    bio: "15년 경력 소상공인 전문",
    profile_image_url: null,
    pricing_info: { monthly_fee: 110000 },
  },
  {
    id: "acc-2",
    name: "박회계",
    email: "park@example.com",
    phone: null,
    firm_name: null,
    specialties: ["부가세"],
    industry_types: ["IT"],
    region: null,
    bio: null,
    profile_image_url: null,
    pricing_info: {},
  },
];

const mockAssignment: TaxAccountantAssignment = {
  id: "assign-1",
  user_id: "user-1",
  accountant_id: "acc-1",
  status: "confirmed",
  assigned_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  accountant: mockAccountants[0],
};

describe("MatchingTab", () => {
  it("세무사 목록을 렌더링한다", () => {
    render(
      <MatchingTab
        accountants={mockAccountants}
        assignment={null}
        businessType={null}
        onSelect={vi.fn().mockResolvedValue(true)}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText("김세무")).toBeInTheDocument();
    expect(screen.getByText("박회계")).toBeInTheDocument();
  });

  it("업종 매칭 시 추천 배지를 표시한다", () => {
    render(
      <MatchingTab
        accountants={mockAccountants}
        assignment={null}
        businessType="음식점"
        onSelect={vi.fn().mockResolvedValue(true)}
        onRemove={vi.fn()}
      />
    );
    // 김세무는 음식점 업종 → 추천 표시
    expect(screen.getByText("추천")).toBeInTheDocument();
    expect(screen.getByText(/음식점 전문 추천/)).toBeInTheDocument();
  });

  it("담당 세무사가 있으면 담당 배지를 표시한다", () => {
    render(
      <MatchingTab
        accountants={mockAccountants}
        assignment={mockAssignment}
        businessType={null}
        onSelect={vi.fn().mockResolvedValue(true)}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText("담당")).toBeInTheDocument();
    expect(screen.getByText("담당 세무사")).toBeInTheDocument();
  });

  it("세무사 선택 시 확인 다이얼로그를 표시한다", async () => {
    render(
      <MatchingTab
        accountants={mockAccountants}
        assignment={null}
        businessType={null}
        onSelect={vi.fn().mockResolvedValue(true)}
        onRemove={vi.fn()}
      />
    );
    const selectButtons = screen.getAllByText("이 세무사 선택");
    fireEvent.click(selectButtons[0]);
    await waitFor(() => {
      expect(screen.getByText("세무사 선택 확인")).toBeInTheDocument();
    });
  });

  it("로딩 중일 때 스켈레톤을 표시한다", () => {
    const { container } = render(
      <MatchingTab
        accountants={[]}
        assignment={null}
        businessType={null}
        onSelect={vi.fn().mockResolvedValue(true)}
        onRemove={vi.fn()}
        loading={true}
      />
    );
    const skeletons = container.querySelectorAll('div[class*="rounded-lg"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("세무사가 없으면 빈 상태를 표시한다", () => {
    render(
      <MatchingTab
        accountants={[]}
        assignment={null}
        businessType={null}
        onSelect={vi.fn().mockResolvedValue(true)}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText("등록된 세무사가 없습니다")).toBeInTheDocument();
  });

  it("가격 정보가 있으면 월 기장료를 표시한다", () => {
    render(
      <MatchingTab
        accountants={mockAccountants}
        assignment={null}
        businessType={null}
        onSelect={vi.fn().mockResolvedValue(true)}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByText("110,000원")).toBeInTheDocument();
  });
});
