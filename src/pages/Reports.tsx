import { useState, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";

import { Skeleton } from "@/components/ui/skeleton";
import { SalesAnalysisTab } from "@/components/reports/SalesAnalysisTab";
import { ExpenseAnalysisTab } from "@/components/reports/ExpenseAnalysisTab";
import { EmployeeReportTab } from "@/components/reports/EmployeeReportTab";
import { AIInsightsTab } from "@/components/reports/AIInsightsTab";
import { TaxInvoiceTab } from "@/components/reports/TaxInvoiceTab";
import { TaxClassificationTab } from "@/components/reports/TaxClassificationTab";
import { MenuAnalysisTab } from "@/components/reports/MenuAnalysisTab";

const VALID_TABS = ["sales", "expense", "menu", "classify", "tax", "employee", "insights"] as const;
type TabValue = typeof VALID_TABS[number];

const TAB_COMPONENTS: Record<TabValue, React.ComponentType> = {
  sales: SalesAnalysisTab,
  expense: ExpenseAnalysisTab,
  menu: MenuAnalysisTab,
  classify: TaxClassificationTab,
  tax: TaxInvoiceTab,
  employee: EmployeeReportTab,
  insights: AIInsightsTab,
};

function TabFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const activeTab: TabValue = VALID_TABS.includes(tabParam as TabValue) 
    ? (tabParam as TabValue) 
    : "sales";

  const handleTabChange = (value: string) => {
    if (value === "sales") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <MainLayout title="리포트" subtitle="경영 현황 분석" showBackButton>
      <div>
        <div className="overflow-x-auto flex gap-2 mb-3 pb-1 sticky top-0 z-20 bg-background pt-1 lg:static lg:bg-transparent lg:pt-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {(["sales", "expense", "menu", "classify", "tax", "employee", "insights"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-3.5 py-1.5 text-xs font-medium shrink-0 rounded-full border transition-all ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
              }`}
            >
              {{ sales: "매출", expense: "지출", menu: "메뉴 분석", classify: "비용분류", tax: "세금계산서", employee: "직원", insights: "AI분석" }[tab]}
            </button>
          ))}
        </div>
        <ActiveComponent />
      </div>
    </MainLayout>
  );
}
