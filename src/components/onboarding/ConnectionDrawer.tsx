import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { CardConnectionFlow } from "./CardConnectionFlow";
import { AccountConnectionFlow } from "./AccountConnectionFlow";
import { HometaxConnectionFlow } from "./HometaxConnectionFlow";

export type ConnectionType = "hometax" | "card" | "account";

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
        <DrawerHeader className="pb-2 pt-4 px-4">
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
        </div>
      </DrawerContent>
    </Drawer>
  );
}
