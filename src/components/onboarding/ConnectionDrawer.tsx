import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CardConnectionFlow } from "./CardConnectionFlow";
import { AccountConnectionFlow } from "./AccountConnectionFlow";
import { HometaxConnectionFlow } from "./HometaxConnectionFlow";
import { CoupangeatsConnectionFlow } from "./CoupangeatsConnectionFlow";
import { BaeminConnectionFlow } from "./BaeminConnectionFlow";

export type ConnectionType = "hometax" | "card" | "account" | "coupangeats" | "baemin";

interface ConnectionDrawerProps {
  open: boolean;
  type: ConnectionType | null;
  onClose: () => void;
  onComplete?: () => void;
}

const TITLES: Record<ConnectionType, string> = {
  hometax: "국세청 연동",
  card: "카드사 연동",
  account: "계좌 연동",
  coupangeats: "쿠팡이츠 연동",
  baemin: "배달의민족 연동",
};

export function ConnectionDrawer({ open, type, onClose, onComplete }: ConnectionDrawerProps) {
  const handleComplete = () => {
    onComplete?.();
    onClose();
  };

  const handleBack = () => {
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent className="max-h-[88dvh] mx-auto w-full max-w-md">
        <div className="flex justify-center pt-3 pb-4">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>
        <DrawerHeader className="pb-2 pt-2 px-4">
          <DrawerTitle className="text-base font-semibold">
            {type ? TITLES[type] : ""}
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {type === "hometax" && (
            <HometaxConnectionFlow onComplete={handleComplete} onBack={handleBack} />
          )}
          {type === "card" && (
            <CardConnectionFlow onComplete={handleComplete} onBack={handleBack} />
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
      </DrawerContent>
    </Drawer>
  );
}
