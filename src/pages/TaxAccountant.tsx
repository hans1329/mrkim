import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  UserCheck,
  MessageSquare,
  FileText,
  Clock,
  Mail,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useTaxAccountant } from "@/hooks/useTaxAccountant";
import { useProfile } from "@/hooks/useProfile";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import MatchingTab from "@/components/tax-accountant/MatchingTab";

function ConsultationStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "대기 중", variant: "secondary" },
    sent: { label: "전달됨", variant: "default" },
    responded: { label: "답변 완료", variant: "outline" },
  };
  const c = config[status] || config.pending;
  return <Badge variant={c.variant} className="text-[10px]">{c.label}</Badge>;
}

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

        {/* 매칭 탭 */}
        <TabsContent value="matching">
          <MatchingTab
            accountants={accountants}
            assignment={assignment}
            businessType={profile?.business_type || null}
            onSelect={selectAccountant}
            onRemove={removeAssignment}
          />
        </TabsContent>

        {/* 상담 탭 */}
        <TabsContent value="consultations" className="space-y-3">
          {consultations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">상담 내역이 없습니다</h3>
                <p className="text-xs text-muted-foreground">
                  김비서에게 세무 질문을 하면<br />
                  전문 상담이 필요할 때 세무사에게 연결해 드립니다
                </p>
              </CardContent>
            </Card>
          ) : (
            consultations.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium flex-1 mr-2">{c.subject}</h4>
                    <ConsultationStatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {c.user_question}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ko })}
                    {c.email_sent_at && (
                      <>
                        <span>•</span>
                        <Mail className="h-3 w-3" />
                        이메일 전달됨
                      </>
                    )}
                  </div>
                  {c.status === "pending" && assignment && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 text-xs"
                      onClick={async () => {
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          const res = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-tax-consultation`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${session?.access_token}`,
                                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              },
                              body: JSON.stringify({ consultationId: c.id }),
                            }
                          );
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error);
                          toast.success(`${data.accountantName} 세무사에게 전달되었습니다`);
                          window.location.reload();
                        } catch (e: unknown) {
                          toast.error((e as Error).message || "전달에 실패했습니다");
                        }
                      }}
                    >
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      세무사에게 이메일 전달
                    </Button>
                  )}
                  {c.accountant_response && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium mb-1">세무사 답변</p>
                      <p className="text-xs text-muted-foreground">{c.accountant_response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* 신고 탭 */}
        <TabsContent value="filings" className="space-y-3">
          {filingTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">예정된 신고가 없습니다</h3>
                <p className="text-xs text-muted-foreground">
                  부가세, 종소세 등 신고 기한이 다가오면<br />
                  김비서가 자동으로 알려드립니다
                </p>
              </CardContent>
            </Card>
          ) : (
            filingTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-medium">{task.filing_type}</h4>
                      <p className="text-xs text-muted-foreground">{task.tax_period}</p>
                    </div>
                    <Badge
                      variant={task.status === "submitted" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {task.status === "upcoming" && "예정"}
                      {task.status === "preparing" && "준비 중"}
                      {task.status === "review" && "검토 중"}
                      {task.status === "submitted" && "신고 완료"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 text-warning" />
                      <span className="text-muted-foreground">
                        마감: {format(new Date(task.deadline), "yyyy.MM.dd")}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
