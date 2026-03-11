import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  UserCheck,
  Search,
  MessageSquare,
  FileText,
  Star,
  Building2,
  Mail,
  Phone,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useTaxAccountant, type TaxAccountant as TaxAccountantType } from "@/hooks/useTaxAccountant";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

function AccountantCard({ 
  accountant, 
  isAssigned, 
  onSelect 
}: { 
  accountant: TaxAccountantType; 
  isAssigned: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className={cn(
      "transition-all",
      isAssigned && "ring-2 ring-primary"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {accountant.profile_image_url ? (
              <img src={accountant.profile_image_url} alt={accountant.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <UserCheck className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{accountant.name}</h3>
              {isAssigned && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">담당</Badge>
              )}
            </div>
            {accountant.firm_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" />
                {accountant.firm_name}
              </p>
            )}
            {accountant.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {accountant.specialties.slice(0, 3).map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            {accountant.bio && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{accountant.bio}</p>
            )}
          </div>
        </div>
        {!isAssigned && (
          <Button 
            size="sm" 
            className="w-full mt-3"
            onClick={() => onSelect(accountant.id)}
          >
            이 세무사 선택
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

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
        <TabsContent value="matching" className="space-y-4">
          {/* 현재 담당 세무사 */}
          {assignment?.accountant ? (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    담당 세무사
                  </h3>
                  <button 
                    onClick={removeAssignment}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{assignment.accountant.name}</p>
                    {assignment.accountant.firm_name && (
                      <p className="text-xs text-muted-foreground">{assignment.accountant.firm_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {assignment.accountant.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {assignment.accountant.email}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8">
                <div className="text-center">
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">담당 세무사를 선택하세요</h3>
                  <p className="text-xs text-muted-foreground">
                    업종·규모에 맞는 세무사를 추천해 드립니다
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 추천 세무사 목록 */}
          {accountants.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground px-1">
                {profile?.business_type 
                  ? `${profile.business_type} 전문 세무사` 
                  : "추천 세무사"}
              </h3>
              {accountants.map((accountant) => (
                <AccountantCard
                  key={accountant.id}
                  accountant={accountant}
                  isAssigned={assignment?.accountant_id === accountant.id}
                  onSelect={selectAccountant}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  등록된 세무사가 없습니다
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  곧 업종별 전문 세무사를 매칭해 드릴 예정입니다
                </p>
              </CardContent>
            </Card>
          )}
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
                          // Refresh
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
