import { useAppVersion } from "@/hooks/useAppVersion";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHANGELOG } from "@/config/version";
import { ScrollArea } from "@/components/ui/scroll-area";

export function VersionBadge() {
  const { currentVersion, updateAvailable, updateMessage } = useAppVersion();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <span>v{currentVersion}</span>
        {updateAvailable && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
            <ArrowUpCircle className="h-3 w-3" />
            업데이트
          </Badge>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>앱 버전 정보</DialogTitle>
          </DialogHeader>

          {updateAvailable && updateMessage && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-primary">
              <p className="font-medium flex items-center gap-1.5">
                <ArrowUpCircle className="h-4 w-4" />
                새 버전이 있습니다
              </p>
              <p className="mt-1 text-muted-foreground">{updateMessage}</p>
            </div>
          )}

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {CHANGELOG.map((entry) => (
                <div key={entry.version} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.version === currentVersion ? "default" : "secondary"} className="text-xs">
                      v{entry.version}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <p className="text-sm font-medium">{entry.title}</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-4">
                    {entry.changes.map((c, i) => (
                      <li key={i} className="list-disc">{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
