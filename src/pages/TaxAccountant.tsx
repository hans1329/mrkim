import { MainLayout } from "@/components/layout/MainLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, MessageSquare, FileText } from "lucide-react";
import { useTaxAccountant } from "@/hooks/useTaxAccountant";
import { useProfile } from "@/hooks/useProfile";
import { useSearchParams } from "react-router-dom";
import MatchingTab from "@/components/tax-accountant/MatchingTab";
import ConsultationTab from "@/components/tax-accountant/ConsultationTab";
import FilingTab from "@/components/tax-accountant/FilingTab";

export default function TaxAccountant() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "matching";
  const { profile, loading: profileLoading } = useProfile();
  const {
    accountants,
    assignment,
    consultations,
    filingTasks,
    loading,
    selectAccountant,
    removeAssignment,
    refetch,
  } = useTaxAccountant();

  if (loading || profileLoading) {
    return (
      <MainLayout title="세무사" showBackButton>
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="세무사" showBackButton>
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="matching" className="text-xs">
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            매칭
          </TabsTrigger>
          <TabsTrigger value="consultations" className="text-xs">
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            상담
          </TabsTrigger>
          <TabsTrigger value="filings" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" />
            신고
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matching">
          <MatchingTab
            accountants={accountants}
            assignment={assignment}
            businessType={profile?.business_type || null}
            onSelect={selectAccountant}
            onRemove={removeAssignment}
          />
        </TabsContent>

        <TabsContent value="consultations">
          <ConsultationTab
            consultations={consultations}
            assignment={assignment}
            onCreated={refetch}
          />
        </TabsContent>

        <TabsContent value="filings">
          <FilingTab
            filingTasks={filingTasks}
            assignment={assignment}
            businessType={profile?.business_type || null}
          />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
