import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  FileEdit,
  Clock,
  Building2,
  ChevronRight,
  Zap,
  Send,
  Plus,
  RefreshCw,
  Scale,
} from "lucide-react";
import { type TaxAccountantAssignment } from "@/hooks/useTaxAccountant";

interface IrregularFilingType {
  id: string;
  label: string;
  description: string;
  icon: typeof FileEdit;
  autoDetectable: boolean;
  autoDetectHint?: string;
  examples: string[];
}

const IRREGULAR_FILING_TYPES: IrregularFilingType[] = [
  {
    id: "amended",
    label: "수정신고 / 경정청구",
    description: "이미 제출한 신고서에 오류가 있거나, 과다 납부한 세금을 돌려받고 싶을 때",
    icon: FileEdit,
    autoDetectable: true,
    autoDetectHint: "김비서가 기존 신고 내역과 실제 데이터를 비교하여 수정 필요 여부를 자동으로 감지합니다",
    examples: ["매출·매입 누락 발견", "세액공제 미적용", "과다 납부 환급 요청"],
  },
  {
    id: "late",
    label: "기한후신고",
    description: "법정 신고 기한을 놓쳤을 때 — 빨리 신고할수록 가산세가 줄어듭니다",
    icon: Clock,
    autoDetectable: true,
    autoDetectHint: "정기 신고 기한 경과 시 김비서가 자동으로 알림을 보내드립니다",
    examples: ["부가세 기한 초과", "종합소득세 미신고", "원천세 미신고"],
  },
  {
    id: "capital_gains",
    label: "양도소득세 / 증여세 등",
    description: "부동산·자산 거래 발생 시 비정기 신고가 필요합니다",
    icon: Building2,
    autoDetectable: false,
    examples: ["부동산 매도", "주식 양도", "증여 발생", "상속 발생"],
  },
];

interface IrregularFilingSectionProps {
  assignment: TaxAccountantAssignment | null;
}

export default function IrregularFilingSection({ assignment }: IrregularFilingSectionProps) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<IrregularFilingType | null>(null);
  const [description, setDescription] = useState("");

  const handleSelectType = (type: IrregularFilingType) => {
    setSelectedType(type);
    setDescription("");
    setRequestOpen(true);
  };

  const handleSubmitRequest = () => {
    // TODO: Create filing task via API
    setRequestOpen(false);
    setSelectedType(null);
    setDescription("");
  };

  return (
    <>
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-primary" />
            비정기 신고
          </h3>
        </div>

        {/* 자동 감지 안내 */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium">김비서 자동 감지</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  수정신고가 필요한 경우나 기한 초과 상황을 김비서가 자동으로 감지하여 알려드립니다.
                  양도·증여 등 거래 발생 시에는 아래에서 직접 요청해 주세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 비정기 신고 유형 카드들 */}
        {IRREGULAR_FILING_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Card
              key={type.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => handleSelectType(type)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold">{type.label}</span>
                      {type.autoDetectable && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">
                          <Zap className="h-2.5 w-2.5 mr-0.5" />
                          자동감지
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                      {type.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {type.examples.map((ex) => (
                        <Badge key={ex} variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">
                          {ex}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 비정기 신고 요청 다이얼로그 */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-[min(28rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              {selectedType && (() => {
                const Icon = selectedType.icon;
                return <Icon className="h-4 w-4 text-primary" />;
              })()}
              {selectedType?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {selectedType?.description}
            </p>

            {selectedType?.autoDetectable && selectedType.autoDetectHint && (
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-[10px] text-primary flex items-start gap-1.5">
                  <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{selectedType.autoDetectHint}</span>
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium block mb-1.5">상황 설명</label>
              <Textarea
                placeholder="예: 2025년 1기 부가세 신고 시 매입 세금계산서 2건이 누락되어 수정신고가 필요합니다."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs min-h-[80px] resize-none"
              />
            </div>

            {!assignment && (
              <div className="p-2.5 rounded-lg bg-muted/50 border border-dashed border-border">
                <p className="text-[10px] text-muted-foreground text-center">
                  매칭 탭에서 세무사를 배정하면<br />신고 요청을 바로 전달할 수 있습니다
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setRequestOpen(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs"
                disabled={!description.trim()}
                onClick={handleSubmitRequest}
              >
                {assignment ? (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    세무사에게 요청
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    요청 등록
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
