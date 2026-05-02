import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, ArrowRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function FundsConnectionPrompt() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
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
          <Button onClick={() => setShowDialog(true)} className="gap-2">
            계좌 연동하기
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>준비중입니다</AlertDialogTitle>
            <AlertDialogDescription>
              곧 서비스가 시작됩니다!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDialog(false)}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
