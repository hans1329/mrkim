import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Plus, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatSession } from "@/hooks/useAIChat";
import { isToday } from "date-fns";

interface ChatSessionListProps {
  sessions: ChatSession[];
  selectedDate: Date | null;
  isLoading: boolean;
  onSelectSession: (date: Date) => void;
  onNewChat: () => void;
  onBack: () => void;
}

export function ChatSessionList({
  sessions,
  selectedDate,
  isLoading,
  onSelectSession,
  onNewChat,
  onBack,
}: ChatSessionListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">대화 기록</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNewChat}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          새 대화
        </Button>
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            // 스켈레톤 로딩
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">대화 기록이 없습니다</p>
            </div>
          ) : (
            sessions.map((session) => {
              const isSelected = selectedDate && 
                session.date.toDateString() === selectedDate.toDateString();
              
              return (
                <button
                  key={session.date.toISOString()}
                  onClick={() => onSelectSession(session.date)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    "hover:bg-muted/60",
                    isSelected && "bg-primary/10 border border-primary/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-sm font-medium",
                      isToday(session.date) && "text-primary"
                    )}>
                      {session.dateLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {session.messageCount}개 메시지
                    </span>
                  </div>
                  {session.preview && (
                    <p className="text-xs text-muted-foreground truncate">
                      {session.preview}
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
