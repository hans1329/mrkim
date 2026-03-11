import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import {
  TrendingUp,
  FileText,
  Bell,
  Settings,
  HelpCircle,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "리포트", description: "경영 현황 분석", url: "/reports", icon: TrendingUp },
  { title: "세무사", description: "세무사 매칭 · 상담 · 신고", url: "/tax-accountant", icon: UserCheck },
  { title: "알림", description: "알림 관리", url: "/notifications", icon: Bell },
  { title: "설정", description: "앱 설정", url: "/settings", icon: Settings },
  { title: "도움말", description: "사용 가이드", url: "/help", icon: HelpCircle },
];

export default function More() {
  return (
    <MainLayout title="더보기" showBackButton>
      <div className="space-y-4">
        <Card>
          <CardContent className="divide-y p-0">
            {menuItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </NavLink>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">김비서 v1.0.0</p>
              <p className="text-xs text-muted-foreground">© 2026 김비서. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
