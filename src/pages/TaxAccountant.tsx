import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { V2Layout } from "@/components/v2/V2Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaxAccountant } from "@/hooks/useTaxAccountant";
import { useProfile } from "@/hooks/useProfile";
import MatchingTab from "@/components/tax-accountant/MatchingTab";
import ConsultationTab from "@/components/tax-accountant/ConsultationTab";
import FilingTab from "@/components/tax-accountant/FilingTab";

export default function TaxAccountant() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "matching";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { profile, loading: profileLoading } = useProfile();
  const {
    accountants,
    assignment,
    consultations,
    filingTasks,
    loading,
    selectAccountant,
    removeAssignment,
    createFilingTask,
    refetch,
  } = useTaxAccountant();

  const businessContext = useMemo(() => ({
    businessName: profile?.business_name || null,
    businessType: profile?.business_type || null,
    businessRegistrationNumber: profile?.business_registration_number || null,
  }), [
    profile?.business_name,
    profile?.business_type,
    profile?.business_registration_number,
  ]);

  return (
    <V2Layout>
      <div className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="뒤로가기"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
          </button>
          <h1
            className="text-[17px] font-semibold tracking-tight"
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            세무사
          </h1>
        </div>

        <div className="px-4 pb-8">
          {loading || profileLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 rounded-2xl bg-white/5" />
              <Skeleton className="h-32 rounded-2xl bg-white/5" />
              <Skeleton className="h-32 rounded-2xl bg-white/5" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList
                className="w-full grid grid-cols-3 p-1 rounded-2xl border-0 h-auto"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <TabsTrigger
                  value="matching"
                  className="text-xs py-2 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:text-white/55 transition-colors"
                >
                  매칭
                </TabsTrigger>
                <TabsTrigger
                  value="consultations"
                  className="text-xs py-2 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:text-white/55 transition-colors"
                >
                  상담
                </TabsTrigger>
                <TabsTrigger
                  value="filings"
                  className="text-xs py-2 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=inactive]:text-white/55 transition-colors"
                >
                  신고
                </TabsTrigger>
              </TabsList>

              <div
                className="rounded-2xl p-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.3)",
                }}
              >
                <TabsContent value="matching" className="m-0">
                  <MatchingTab
                    accountants={accountants}
                    assignment={assignment}
                    businessType={profile?.business_type || null}
                    onSelect={selectAccountant}
                    onRemove={removeAssignment}
                  />
                </TabsContent>

                <TabsContent value="consultations" className="m-0">
                  <ConsultationTab
                    consultations={consultations}
                    assignment={assignment}
                    onCreated={refetch}
                    secretaryName={profile?.secretary_name || "김비서"}
                    businessContext={businessContext}
                  />
                </TabsContent>

                <TabsContent value="filings" className="m-0">
                  <FilingTab
                    filingTasks={filingTasks}
                    assignment={assignment}
                    businessType={profile?.business_type || null}
                    onCreateTask={createFilingTask}
                  />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
    </V2Layout>
  );
}
