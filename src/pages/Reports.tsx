import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesAnalysisTab } from "@/components/reports/SalesAnalysisTab";
import { ExpenseAnalysisTab } from "@/components/reports/ExpenseAnalysisTab";
import { EmployeeReportTab } from "@/components/reports/EmployeeReportTab";
import { AIInsightsTab } from "@/components/reports/AIInsightsTab";
import { TaxInvoiceTab } from "@/components/reports/TaxInvoiceTab";

const VALID_TABS = ["sales", "expense", "tax", "employee", "insights"] as const;
type TabValue = typeof VALID_TABS[number];

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  // URL 파라미터가 유효한 탭 값인지 확인
  const defaultTab: TabValue = VALID_TABS.includes(tabParam as TabValue) 
    ? (tabParam as TabValue) 
    : "sales";

  const handleTabChange = (value: string) => {
    if (value === "sales") {
      // 기본값이면 파라미터 제거
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <MainLayout title="리포트" subtitle="경영 현황 분석" showBackButton>
      <Tabs defaultValue={defaultTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4 h-11 bg-muted/50 p-1">
          <TabsTrigger 
            value="sales" 
            className="text-xs font-medium px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            매출
          </TabsTrigger>
          <TabsTrigger 
            value="expense" 
            className="text-xs font-medium px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            지출
          </TabsTrigger>
          <TabsTrigger 
            value="tax" 
            className="text-xs font-medium px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
          >
            세금계산서
          </TabsTrigger>
          <TabsTrigger 
            value="employee" 
            className="text-xs font-medium px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            직원
          </TabsTrigger>
          <TabsTrigger 
            value="insights" 
            className="text-xs font-medium px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            AI분석
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesAnalysisTab />
        </TabsContent>

        <TabsContent value="expense">
          <ExpenseAnalysisTab />
        </TabsContent>

        <TabsContent value="tax">
          <TaxInvoiceTab />
        </TabsContent>

        <TabsContent value="employee">
          <EmployeeReportTab />
        </TabsContent>

        <TabsContent value="insights">
          <AIInsightsTab />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
