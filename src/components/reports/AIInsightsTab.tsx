import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/data/mockData";
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAIInsights, useGenerateInsights, type AIInsight } from "@/hooks/useAIInsights";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const getInsightIcon = (type: AIInsight["type"]) => {
  switch (type) {
    case "suggestion":
      return <Lightbulb className="h-5 w-5 text-primary" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "positive":
      return <TrendingUp className="h-5 w-5 text-success" />;
    case "action":
      return <Calendar className="h-5 w-5 text-destructive" />;
  }
};

const getPriorityBadge = (priority: AIInsight["priority"]) => {
  switch (priority) {
    case "high":
      return <Badge variant="destructive" className="text-[10px]">중요</Badge>;
    case "medium":
      return <Badge variant="secondary" className="text-[10px]">보통</Badge>;
    case "low":
      return <Badge variant="outline" className="text-[10px]">참고</Badge>;
  }
};

export function AIInsightsTab() {
  const { data: insights, isLoading } = useAIInsights();
  const generateInsights = useGenerateInsights();

  const handleRefresh = async () => {
    try {
      await generateInsights.mutateAsync();
      toast.success("AI 분석이 완료되었습니다");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "분석 실패");
    }
  };

  const hasInsights = insights && insights.length > 0;
  const highPriorityCount = insights?.filter((i) => i.priority === "high").length || 0;
  const warningCount = insights?.filter((i) => i.type === "warning").length || 0;
  const positiveCount = insights?.filter((i) => i.type === "positive").length || 0;

  // 가장 최근 생성 시간
  const lastGeneratedAt = insights?.[0]?.generated_at;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 김비서 소개 + 갱신 버튼 */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/images/icc-5.webp"
                alt="김비서"
                className="h-12 w-auto object-contain opacity-70"
              />
              <div>
                <p className="font-semibold text-primary">김비서 AI 분석</p>
                <p className="text-xs text-muted-foreground">
                  {lastGeneratedAt
                    ? `${format(new Date(lastGeneratedAt), "M월 d일 HH:mm", { locale: ko })} 기준`
                    : "분석 데이터 없음"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={generateInsights.isPending}
              className="gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${generateInsights.isPending ? "animate-spin" : ""}`} />
              {generateInsights.isPending ? "분석 중..." : "갱신"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasInsights ? (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Target className="mx-auto h-5 w-5 text-destructive" />
                <p className="mt-1 text-lg font-bold">{highPriorityCount}</p>
                <p className="text-xs text-muted-foreground">중요 알림</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <AlertTriangle className="mx-auto h-5 w-5 text-warning" />
                <p className="mt-1 text-lg font-bold">{warningCount}</p>
                <p className="text-xs text-muted-foreground">주의 필요</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <TrendingUp className="mx-auto h-5 w-5 text-success" />
                <p className="mt-1 text-lg font-bold">{positiveCount}</p>
                <p className="text-xs text-muted-foreground">긍정 지표</p>
              </CardContent>
            </Card>
          </div>

          {/* 인사이트 목록 */}
          <div className="space-y-3">
            {insights.map((insight) => (
              <Card key={insight.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{insight.title}</p>
                        {getPriorityBadge(insight.priority)}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                      {insight.impact && (
                        <div className="mt-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            {insight.impact}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        /* 데이터 없음 상태 */
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 font-medium">AI 분석 결과가 없습니다</p>
            <p className="mt-1 text-sm text-muted-foreground">
              '갱신' 버튼을 눌러 경영 인사이트를 생성해보세요
            </p>
            <Button
              variant="default"
              className="mt-4"
              onClick={handleRefresh}
              disabled={generateInsights.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {generateInsights.isPending ? "분석 중..." : "AI 분석 시작"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
