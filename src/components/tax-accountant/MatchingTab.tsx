import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserCheck,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  CheckCircle2,
  Star,
} from "lucide-react";
import { type TaxAccountant, type TaxAccountantAssignment } from "@/hooks/useTaxAccountant";
import { cn } from "@/lib/utils";

interface MatchingTabProps {
  accountants: TaxAccountant[];
  assignment: TaxAccountantAssignment | null;
  businessType: string | null;
  onSelect: (id: string) => Promise<boolean>;
  onRemove: () => void;
  loading?: boolean;
}

// 멀티팩터 스코어링: 업종 매칭 + 지역 + 가격 정보 유무
function scoreAccountant(
  accountant: TaxAccountant,
  businessType: string | null,
): number {
  let score = 0;

  // 업종 매칭 (최대 40점)
  if (businessType && accountant.industry_types?.includes(businessType)) {
    score += 40;
  }

  // 전문 분야 다양성 (최대 15점)
  const specialtyCount = accountant.specialties?.length || 0;
  score += Math.min(specialtyCount * 5, 15);

  // 가격 정보 투명성 (10점)
  if (accountant.pricing_info && Object.keys(accountant.pricing_info).length > 0) {
    score += 10;
  }

  // 지역 정보 (5점)
  if (accountant.region) {
    score += 5;
  }

  // 소개글 (5점)
  if (accountant.bio) {
    score += 5;
  }

  // 프로필 이미지 (5점)
  if (accountant.profile_image_url) {
    score += 5;
  }

  // 소속 사무소 (5점)
  if (accountant.firm_name) {
    score += 5;
  }

  return score;
}

function AccountantCard({
  accountant,
  isAssigned,
  isRecommended,
  onSelect,
}: {
  accountant: TaxAccountant;
  isAssigned: boolean;
  isRecommended: boolean;
  onSelect: (a: TaxAccountant) => void;
}) {
  return (
    <Card className={cn(
      "transition-all",
      isAssigned && "ring-2 ring-primary",
      isRecommended && !isAssigned && "border-primary/30 bg-primary/[0.02]",
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {accountant.profile_image_url ? (
              <img
                src={accountant.profile_image_url}
                alt={accountant.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <UserCheck className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{accountant.name}</h3>
              {isAssigned && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  담당
                </Badge>
              )}
              {isRecommended && !isAssigned && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-primary">
                  추천
                </Badge>
              )}
            </div>
            {accountant.firm_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" />
                {accountant.firm_name}
              </p>
            )}
            {accountant.region && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {accountant.region}
              </p>
            )}
            {accountant.specialties && accountant.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {accountant.specialties.slice(0, 3).map((s) => (
                  <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            {accountant.industry_types && accountant.industry_types.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {accountant.industry_types.slice(0, 2).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            {accountant.pricing_info && Object.keys(accountant.pricing_info).length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {(accountant.pricing_info as Record<string, unknown>).monthly_fee && (
                  <span>
                    월 기장료{" "}
                    <span className="font-medium text-foreground">
                      {Number((accountant.pricing_info as Record<string, unknown>).monthly_fee).toLocaleString()}원
                    </span>
                  </span>
                )}
              </div>
            )}
            {accountant.bio && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {accountant.bio}
              </p>
            )}
          </div>
        </div>
        {!isAssigned && (
          <Button
            size="sm"
            className="w-full mt-3"
            onClick={() => onSelect(accountant)}
          >
            이 세무사 선택
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function MatchingTab({
  accountants,
  assignment,
  businessType,
  onSelect,
  onRemove,
  loading,
}: MatchingTabProps) {
  const [confirmTarget, setConfirmTarget] = useState<TaxAccountant | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);

  // 멀티팩터 스코어링 기반 정렬
  const { sorted, recommendedIds } = useMemo(() => {
    const scored = accountants.map(a => ({
      accountant: a,
      score: scoreAccountant(a, businessType),
    }));
    scored.sort((a, b) => b.score - a.score);

    // 상위 30% 또는 최소 업종 매칭된 항목을 '추천'으로 표시
    const threshold = businessType ? 40 : 30; // 업종 매칭 시 40점 이상
    const ids = new Set(
      scored.filter(s => s.score >= threshold).map(s => s.accountant.id)
    );

    return { sorted: scored.map(s => s.accountant), recommendedIds: ids };
  }, [accountants, businessType]);

  const recommendedCount = recommendedIds.size;

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setSelecting(true);
    await onSelect(confirmTarget.id);
    setSelecting(false);
    setConfirmTarget(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 현재 담당 세무사 */}
      {assignment?.accountant ? (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                담당 세무사
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                {assignment.accountant.profile_image_url ? (
                  <img
                    src={assignment.accountant.profile_image_url}
                    alt={assignment.accountant.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserCheck className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{assignment.accountant.name}</p>
                {assignment.accountant.firm_name && (
                  <p className="text-xs text-muted-foreground">
                    {assignment.accountant.firm_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {assignment.accountant.email && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {assignment.accountant.email}
                </div>
              )}
              {assignment.accountant.phone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {assignment.accountant.phone}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowTerminate(true)}
            >
              계약 해지
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="text-center">
              <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">담당 세무사를 선택하세요</h3>
              <p className="text-xs text-muted-foreground">
                {businessType
                  ? `${businessType} 업종에 맞는 세무사를 추천해 드립니다`
                  : "업종·규모에 맞는 세무사를 추천해 드립니다"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 세무사 목록: 매칭 완료 시 숨김 */}
      {!assignment?.accountant && (
        <>
          {sorted.length > 0 ? (
            <div className="space-y-3">
              {recommendedCount > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-primary px-1 flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" />
                    {businessType ? `${businessType} 전문 추천` : "추천 세무사"} ({recommendedCount}명)
                  </h3>
                  {sorted.filter(a => recommendedIds.has(a.id)).map((accountant) => (
                    <AccountantCard
                      key={accountant.id}
                      accountant={accountant}
                      isAssigned={false}
                      isRecommended={true}
                      onSelect={setConfirmTarget}
                    />
                  ))}
                  {sorted.length > recommendedCount && (
                    <h3 className="text-sm font-semibold text-muted-foreground px-1 pt-2">
                      기타 세무사
                    </h3>
                  )}
                  {sorted.filter(a => !recommendedIds.has(a.id)).map((accountant) => (
                    <AccountantCard
                      key={accountant.id}
                      accountant={accountant}
                      isAssigned={false}
                      isRecommended={false}
                      onSelect={setConfirmTarget}
                    />
                  ))}
                </>
              )}
              {recommendedCount === 0 && (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground px-1">
                    추천 세무사
                  </h3>
                  {sorted.map((accountant) => (
                    <AccountantCard
                      key={accountant.id}
                      accountant={accountant}
                      isAssigned={false}
                      isRecommended={false}
                      onSelect={setConfirmTarget}
                    />
                  ))}
                </>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">등록된 세무사가 없습니다</p>
                <p className="text-xs text-muted-foreground mt-1">
                  곧 업종별 전문 세무사를 매칭해 드릴 예정입니다
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
      {/* 선택 확인 다이얼로그 */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>세무사 선택 확인</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmTarget?.name}</strong>
              {confirmTarget?.firm_name && ` (${confirmTarget.firm_name})`}
              님을 담당 세무사로 배정하시겠습니까?
              {assignment && (
                <span className="block mt-2 text-destructive">
                  기존 담당 세무사 배정이 변경됩니다.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={selecting}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={selecting}>
              {selecting ? "배정 중..." : "확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
