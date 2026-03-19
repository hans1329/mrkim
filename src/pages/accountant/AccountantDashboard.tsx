import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, FileText, Clock } from "lucide-react";
import { useAccountantData } from "@/hooks/useAccountantData";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountantProfile } from "@/hooks/useAccountantAuth";

export default function AccountantDashboard() {
  const { accountant } = useOutletContext<{ accountant: AccountantProfile }>();
  const { clients, consultations, filingTasks, loading } = useAccountantData(accountant.id);

  const pendingConsultations = consultations.filter(c => c.status === "pending").length;
  const activeFilings = filingTasks.filter(f => f.status !== "completed" && f.status !== "cancelled").length;

  const stats = [
    { label: "담당 고객", value: clients.length, icon: Users, color: "text-blue-500" },
    { label: "대기 상담", value: pendingConsultations, icon: MessageSquare, color: "text-amber-500" },
    { label: "진행 신고", value: activeFilings, icon: FileText, color: "text-green-500" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">안녕하세요, {accountant.name} 세무사님</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent pending consultations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            최근 대기 상담
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultations.filter(c => c.status === "pending").length === 0 ? (
            <p className="text-sm text-muted-foreground">대기 중인 상담이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {consultations
                .filter(c => c.status === "pending")
                .slice(0, 5)
                .map(c => (
                  <div key={c.id} className="flex items-start justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{c.user_question}</p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {new Date(c.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
