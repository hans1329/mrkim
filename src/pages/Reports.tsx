import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesAnalysisTab } from "@/components/reports/SalesAnalysisTab";
import { ExpenseAnalysisTab } from "@/components/reports/ExpenseAnalysisTab";
import { EmployeeReportTab } from "@/components/reports/EmployeeReportTab";
import { AIInsightsTab } from "@/components/reports/AIInsightsTab";
import { TrendingUp, TrendingDown, Users, Sparkles } from "lucide-react";

export default function Reports() {
  return (
    <MainLayout title="리포트" subtitle="경영 현황 분석" showBackButton>
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="sales" className="text-xs px-2 gap-1">
            <TrendingUp className="h-3 w-3" />
            <span className="hidden sm:inline">매출</span>
          </TabsTrigger>
          <TabsTrigger value="expense" className="text-xs px-2 gap-1">
            <TrendingDown className="h-3 w-3" />
            <span className="hidden sm:inline">지출</span>
          </TabsTrigger>
          <TabsTrigger value="employee" className="text-xs px-2 gap-1">
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">직원</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs px-2 gap-1">
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">AI</span>
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
