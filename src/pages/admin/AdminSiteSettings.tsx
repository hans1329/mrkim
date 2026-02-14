import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Settings, Smartphone, Eye, EyeOff, Banknote, Users, MessageSquare } from "lucide-react";

export default function AdminSiteSettings() {
  const { settings, isLoading, getSetting, updateSetting } = useSiteSettings();
  const [quotaInput, setQuotaInput] = useState<string | null>(null);

  const handleToggle = async (key: string, currentEnabled: boolean) => {
    try {
      await updateSetting.mutateAsync({
        key,
        value: { enabled: !currentEnabled },
      });
      toast.success("설정이 저장되었습니다");
    } catch (error) {
      toast.error("설정 저장에 실패했습니다");
    }
  };

  const handleQuotaSave = async () => {
    const num = Number(quotaInput ?? currentQuotaLimit);
    if (!num || num < 1 || num > 10000) {
      toast.error("1~10000 사이의 숫자를 입력해주세요");
      return;
    }
    try {
      await updateSetting.mutateAsync({
        key: "daily_chat_quota",
        value: { limit: num },
      });
      setQuotaInput(null);
      toast.success("할당량이 저장되었습니다");
    } catch {
      toast.error("할당량 저장에 실패했습니다");
    }
  };

  const currentQuotaLimit = (getSetting("daily_chat_quota") as { limit?: number } | null)?.limit ?? 100;

  const settingsList = [
    {
      key: "show_app_download",
      icon: Smartphone,
      title: "앱 다운로드 섹션",
      description: "인트로 페이지(/intro)에 앱 다운로드 섹션을 표시합니다",
    },
    {
      key: "loan_card_visible",
      icon: Banknote,
      title: "급할 때 빌리기 카드",
      description: "자금관리 페이지에 대출 신청 카드를 표시합니다",
    },
    {
      key: "community_banner",
      icon: Users,
      title: "비서들의 모임 배너",
      description: "대시보드 하단에 비서들의 모임 배너를 표시합니다",
    },
  ];

  return (
    <AdminLayout title="사이트 설정">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            사이트 설정
          </h1>
          <p className="text-muted-foreground mt-1">
            인트로 페이지 및 공개 화면의 표시 설정을 관리합니다
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>표시 설정</CardTitle>
            <CardDescription>
              각 섹션의 표시 여부를 설정할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-11" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {settingsList.map((item) => {
                  const setting = settings?.find(s => s.key === item.key);
                  const isEnabled = (setting?.value as { enabled?: boolean })?.enabled ?? true;
                  
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <Label htmlFor={item.key} className="text-base font-medium cursor-pointer">
                            {item.title}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {isEnabled ? (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              표시
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              숨김
                            </>
                          )}
                        </span>
                        <Switch
                          id={item.key}
                          checked={isEnabled}
                          onCheckedChange={() => handleToggle(item.key, isEnabled)}
                          disabled={updateSetting.isPending}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI 채팅 할당량
            </CardTitle>
            <CardDescription>
              사용자별 일일 AI 채팅 메시지 횟수를 설정합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={quotaInput ?? currentQuotaLimit}
                  onChange={(e) => setQuotaInput(e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">회 / 일</span>
                <Button
                  size="sm"
                  onClick={handleQuotaSave}
                  disabled={updateSetting.isPending || quotaInput === null}
                >
                  저장
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
