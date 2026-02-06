import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, ArrowRight } from "lucide-react";

export function FundsConnectionPrompt() {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Landmark className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">계좌 연동이 필요해요</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          계좌를 연결하면 예치금 현황, 자동이체 관리,<br />
          남는 돈 굴리기 등 자금 관리 기능을 사용할 수 있어요
        </p>
        <Button onClick={() => navigate("/onboarding")} className="gap-2">
          계좌 연동하기
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
