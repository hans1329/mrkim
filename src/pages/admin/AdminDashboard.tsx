import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Link2, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalUsers: number;
  connectedUsers: number; // 데이터 연동 완료한 사용자 수
  totalFAQs: number;
  activeFAQs: number;
}

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchStats = async () => {
      try {
        setLoading(true);

        // Get total users count
        const { count: totalUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Get connected users count (users with business_registration_number filled)
        // 실제 데이터 연동은 사업자등록번호가 입력된 경우로 가정
        const { count: connectedUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .not("business_registration_number", "is", null);

        // Get FAQ counts
        const { count: totalFAQs } = await supabase
          .from("service_faq")
          .select("*", { count: "exact", head: true });

        const { count: activeFAQs } = await supabase
          .from("service_faq")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        setStats({
          totalUsers: totalUsers || 0,
          connectedUsers: connectedUsers || 0,
          totalFAQs: totalFAQs || 0,
          activeFAQs: activeFAQs || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  if (authLoading) {
    return (
      <AdminLayout title="대시보드" loading>
        <div />
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const connectionRate = stats && stats.totalUsers > 0 
    ? Math.round((stats.connectedUsers / stats.totalUsers) * 100) 
    : 0;

  return (
    <AdminLayout title="대시보드">
      <div className="space-y-6">
        {/* Hero Stat - Connected Users */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/80">
              데이터 연동 완료
            </CardDescription>
            <CardTitle className="text-4xl font-bold flex items-center gap-4">
              {loading ? (
                <Skeleton className="h-10 w-24 bg-primary-foreground/20" />
              ) : (
                <>
                  <Link2 className="w-10 h-10" />
                  {stats?.connectedUsers || 0}명
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <TrendingUp className="w-4 h-4" />
              <span>
                전체 {stats?.totalUsers || 0}명 중 {connectionRate}% 연동 완료
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/admin/users")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                전체 사용자
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}명</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                등록된 FAQ
              </CardTitle>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalFAQs || 0}개</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                활성: {stats?.activeFAQs || 0}개
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                연동률
              </CardTitle>
              <Link2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{connectionRate}%</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                사업자등록 완료 기준
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => window.location.href = "/admin/faq"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                FAQ 관리
              </CardTitle>
              <CardDescription>
                서비스 안내 챗봇의 FAQ 데이터를 관리합니다
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => window.location.href = "/admin/users"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                사용자 관리
              </CardTitle>
              <CardDescription>
                사용자 목록을 조회하고 권한을 관리합니다
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
