import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesAnalysisTab } from "@/components/reports/SalesAnalysisTab";
import { ExpenseAnalysisTab } from "@/components/reports/ExpenseAnalysisTab";
import { EmployeeReportTab } from "@/components/reports/EmployeeReportTab";
import { AIInsightsTab } from "@/components/reports/AIInsightsTab";


export default function Reports() {
  return (
    <MainLayout title="리포트" subtitle="경영 현황 분석" showBackButton>
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4 h-11">
          <TabsTrigger value="sales" className="text-sm font-medium">
            매출
          </TabsTrigger>
          <TabsTrigger value="expense" className="text-sm font-medium">
            지출
          </TabsTrigger>
          <TabsTrigger value="employee" className="text-sm font-medium">
            직원
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-sm font-medium">
            AI분석
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesAnalysisTab />
        </TabsContent>

        <TabsContent value="expense">
          <ExpenseAnalysisTab />
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
