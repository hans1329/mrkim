import { useState, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full mb-4 h-11 bg-transparent p-0 overflow-x-auto flex justify-start gap-0">
          <TabsTrigger value="sales" className="text-xs font-medium text-muted-foreground/50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:text-sm data-[state=active]:font-bold data-[state=active]:shadow-none shrink-0">매출</TabsTrigger>
          <TabsTrigger value="expense" className="text-xs font-medium text-muted-foreground/50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:text-sm data-[state=active]:font-bold data-[state=active]:shadow-none shrink-0">지출</TabsTrigger>
          <TabsTrigger value="menu" className="text-xs font-medium text-muted-foreground/50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:text-sm data-[state=active]:font-bold data-[state=active]:shadow-none shrink-0">메뉴 분석</TabsTrigger>
          <TabsTrigger value="classify" className="text-xs font-medium text-muted-foreground/50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:text-sm data-[state=active]:font-bold data-[state=active]:shadow-none shrink-0">비용분류</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs font-medium text-muted-foreground/50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:text-sm data-[state=active]:font-bold data-[state=active]:shadow-none shrink-0">세금계산서</TabsTrigger>
          <TabsTrigger value="employee" className="text-xs font-medium text-muted-foreground/50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:text-sm data-[state=active]:font-bold data-[state=active]:shadow-none shrink-0">직원</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs font-medium text-muted-foreground/50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:text-sm data-[state=active]:font-bold data-[state=active]:shadow-none shrink-0">AI분석</TabsTrigger>
        </TabsList>
      </Tabs>
      <ActiveComponent />
    </MainLayout>
  );
}
