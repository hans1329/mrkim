import { useRef, useEffect, useState, useCallback } from "react";
import { CardConnectionFlow, type CardConnectionFlowRef } from "./CardConnectionFlow";
import { AccountConnectionFlow } from "./AccountConnectionFlow";
import { HometaxConnectionFlow } from "./HometaxConnectionFlow";
import { CoupangeatsConnectionFlow } from "./CoupangeatsConnectionFlow";
import { BaeminConnectionFlow } from "./BaeminConnectionFlow";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export type ConnectionType = "hometax" | "card" | "account" | "coupangeats" | "baemin";

interface ConnectionDrawerProps {
  open: boolean;
  type: ConnectionType | null;
  onClose: () => void;
  onComplete?: () => void;
}

const TITLES: Record<ConnectionType, string> = {
  hometax: "국세청 연동",
  card: "카드매출 연동",
  account: "계좌 연동",
  coupangeats: "쿠팡이츠 연동",
  baemin: "배달의민족 연동",
};

export function ConnectionDrawer({ open, type, onClose, onComplete }: ConnectionDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const cardFlowRef = useRef<CardConnectionFlowRef>(null);
  const [cardFlowTitle, setCardFlowTitle] = useState<string | null>(null);
  const handleCardStepChange = useCallback((title: string) => setCardFlowTitle(title), []);

  const handleComplete = () => {
    onComplete?.();
    onClose();
  };

  const handleBack = () => {
    onClose();
  };

  // Reset card title when drawer closes or type changes
  useEffect(() => {
    if (!open || type !== "card") {
      setCardFlowTitle(null);
    }
  }, [open, type]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const displayTitle = type === "card" && cardFlowTitle ? cardFlowTitle : (type ? TITLES[type] : "");
  const showBackArrow = type === "card" && cardFlowTitle && cardFlowTitle !== "카드 연결";

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/80 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        ref={contentRef}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md max-h-[88dvh] flex flex-col rounded-t-[10px] border bg-background transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>
        {/* Header */}
        <div className="pb-2 pt-2 px-4 flex items-center gap-2">
          {showBackArrow && (
            <button
              onClick={() => cardFlowRef.current?.handleBack()}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-base font-semibold">
            {displayTitle}
          </h2>
        </div>
        {/* Content - always mounted */}
        <div className="overflow-y-auto px-4 pb-6 flex-1">
          {type === "hometax" && (
            <HometaxConnectionFlow onComplete={handleComplete} onBack={handleBack} isOpen={open} />
          )}
          {type === "card" && (
            <CardConnectionFlow
              ref={cardFlowRef}
              onComplete={handleComplete}
              onBack={handleBack}
              onStepChange={handleCardStepChange}
            />
          )}
          {type === "account" && (
            <AccountConnectionFlow onComplete={handleComplete} onBack={handleBack} />
          )}
          {type === "coupangeats" && (
            <CoupangeatsConnectionFlow onComplete={handleComplete} onBack={handleBack} />
          )}
          {type === "baemin" && (
            <BaeminConnectionFlow onComplete={handleComplete} onBack={handleBack} />
          )}
        </div>
      </div>
    </>
  );
}
