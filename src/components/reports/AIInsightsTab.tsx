import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/data/mockData";
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Target,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";


interface Insight {
  id: string;
  type: 'suggestion' | 'warning' | 'positive' | 'action';
  title: string;
  description: string;
  impact?: string;
  priority: 'high' | 'medium' | 'low';
}

const insights: Insight[] = [
  {
    id: '1',
    type: 'positive',
    title: '매출 성장세 지속',
    description: '최근 3개월간 매출이 평균 8.5% 상승했습니다. 특히 토요일 저녁 시간대 매출이 크게 증가했습니다.',
    impact: '+₩5,400,000/월',
    priority: 'high',
  },
  {
    id: '2',
    type: 'warning',
    title: '식자재 비용 상승 주의',
    description: '지난달 대비 식자재 비용이 12% 상승했습니다. 공급업체 재검토 또는 메뉴 가격 조정을 고려해보세요.',
    impact: '-₩2,100,000/월',
    priority: 'high',
  },
  {
    id: '3',
    type: 'suggestion',
    title: '인건비 최적화 기회',
    description: '화요일 오후 시간대 매출 대비 인력이 과다 배치되어 있습니다. 근무 시간 조정으로 월 ₩400,000 절감이 가능합니다.',
    impact: '₩400,000 절감 가능',
    priority: 'medium',
  },
  {
    id: '4',
    type: 'action',
    title: '부가세 신고 준비',
    description: '1월 25일까지 부가세 신고가 필요합니다. 현재 예치금 ₩2,340,000이 준비되어 있으며, 목표 대비 78%입니다.',
    priority: 'high',
  },
  {
    id: '5',
    type: 'suggestion',
    title: '주말 메뉴 특화 제안',
    description: '주말 매출이 평일 대비 45% 높습니다. 주말 전용 프리미엄 메뉴 도입을 고려해보세요.',
    impact: '+₩1,200,000/월 예상',
    priority: 'medium',
  },
  {
    id: '6',
    type: 'positive',
    title: '현금 흐름 안정',
    description: '비상 운영자금이 목표의 50%에 도달했습니다. 현재 추세라면 3개월 내 목표 달성이 가능합니다.',
    priority: 'low',
  },
];

const getInsightIcon = (type: Insight['type']) => {
  switch (type) {
    case 'suggestion':
      return <Lightbulb className="h-5 w-5 text-primary" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case 'positive':
      return <TrendingUp className="h-5 w-5 text-success" />;
    case 'action':
      return <Calendar className="h-5 w-5 text-destructive" />;
  }
};

const getPriorityBadge = (priority: Insight['priority']) => {
  switch (priority) {
    case 'high':
      return <Badge variant="destructive" className="text-[10px]">중요</Badge>;
    case 'medium':
      return <Badge variant="secondary" className="text-[10px]">보통</Badge>;
    case 'low':
      return <Badge variant="outline" className="text-[10px]">참고</Badge>;
  }
};

export function AIInsightsTab() {
  const highPriorityCount = insights.filter(i => i.priority === 'high').length;
  const warningCount = insights.filter(i => i.type === 'warning').length;
  const positiveCount = insights.filter(i => i.type === 'positive').length;

  return (
    <div className="space-y-4">
      {/* 김비서 소개 */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/icc-5.webp"
              alt="김비서"
              className="h-12 w-auto object-contain"
            />
            <div>
              <p className="font-semibold text-primary">김비서 AI 분석</p>
              <p className="text-xs text-muted-foreground">
                최근 6개월 데이터를 분석한 경영 인사이트입니다
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <div className="mt-0.5">
                  {getInsightIcon(insight.type)}
                </div>
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
    </div>
  );
}
