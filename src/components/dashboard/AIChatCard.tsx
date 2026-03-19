import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Sparkles, Mic, Clock, Settings, Volume2, VolumeX, X, Loader2 } from "lucide-react";
import { formatCurrency } from "@/data/mockData";
import { josa } from "@/lib/utils";
import { useChat } from "@/contexts/ChatContext";
import { useVoice } from "@/contexts/VoiceContext";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
interface RealTimeStats {
  todayIncome: number;
  todayExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  isLoading: boolean;
}
const quickPrompts = ["오늘 매출 얼마야?", "급여 현황", "부가세 확인", "이번 달 요약"];

// 일반 플레이스홀더 메시지
const defaultPlaceholders = ["오늘 매출이 궁금해요", "이번 달 경영 현황은?", "급여일 언제야?", "할 일이 뭐가 있어?", "부가세 얼마나 모였어?"];

// 미완료 설정 안내 메시지
const getIncompleteSettingsMessages = (profile: any, secretaryName: string) => {
  const messages: string[] = [];
  if (!profile?.secretary_avatar_url) {
    messages.push(`${secretaryName}의 프로필 사진을 설정해보세요!`);
  }
  if (!profile?.secretary_name || profile?.secretary_name === "김비서") {
    messages.push("비서의 이름을 직접 지어주세요!");
  }
  if (!profile?.secretary_tone || profile?.secretary_tone === "polite") {
    messages.push("비서의 말투를 바꿔보세요!");
  }
  return messages;
};

// 브리핑 슬롯 키 생성 (localStorage 중복 방지용)
const getBriefingSlotKey = (userId: string, hour: number): string => {
  const dateStr = new Date().toISOString().split('T')[0];
  return `briefing_${userId}_${dateStr}_${hour}`;
};

// 현재 시각이 선택된 시간대 중 어느 하나의 ±30분 이내인지 확인
const getDueBriefingHour = (briefingTimes: string[]): number | null => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  for (const t of briefingTimes) {
    const h = parseInt(t, 10);
    // h시 정각 기준으로 h-1:30 ~ h:30 범위
    const inWindow =
      (hour === h && minute <= 30) ||
      (hour === h - 1 && minute >= 30);
    if (inWindow) return h;
  }
  return null;
};

// 관심 지표 ID → 한국어 레이블 매핑
const METRIC_LABELS: Record<string, string> = {
  sales: "매출/수익",
  expenses: "지출/비용",
  employees: "직원 현황",
  funds: "자금 현황",
  alerts: "긴급 알림",
};

// priority_metrics 순서를 반영한 동적 브리핑 프롬프트 생성
const buildBriefingPrompt = (metrics: string[]): string => {
  const validMetrics = metrics.filter(m => METRIC_LABELS[m]);
  if (validMetrics.length === 0) {
    return "오늘 경영 현황을 간략하게 브리핑해줘. 매출과 지출 현황, 주요 체크포인트를 요약해서 알려줘.";
  }
  const priorityList = validMetrics.map((m, i) => `${i + 1}순위: ${METRIC_LABELS[m]}`).join(", ");
  return `오늘 경영 현황을 간략하게 브리핑해줘. 다음 우선순위 순서로 핵심만 요약해줘: ${priorityList}.`;
};
export function AIChatCard() {
  const navigate = useNavigate();
  const {
    openChat,
    openChatWithMessage
  } = useChat();
  const {
    openVoice
  } = useVoice();
  const {
    profile,
    loading: profileLoading
  } = useProfileQuery();
  const isMobile = useIsMobile();
  const [input, setInput] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const requireAuth = (action: () => void) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    action();
  };
  const [response, setResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isBriefingResponse, setIsBriefingResponse] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const [realStats, setRealStats] = useState<RealTimeStats>({
    todayIncome: 0,
    todayExpense: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    isLoading: true
  });
  const [hasConversationHistory, setHasConversationHistory] = useState<boolean | null>(null);

  // 설정한 비서 이름과 아바타 사용 (로딩 중에는 undefined)
  const secretaryName = profileLoading ? undefined : profile?.secretary_name || "김비서";
  const secretaryAvatarUrl = profileLoading ? undefined : profile?.secretary_avatar_url || null;
  const profileImgSrc = secretaryAvatarUrl || "/images/icc-5.webp";

  // 이미지 프리로딩 & 캐싱
  const preloadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!preloadedRef.current.has(profileImgSrc)) {
      const img = new Image();
      img.src = profileImgSrc;
      preloadedRef.current.add(profileImgSrc);
    }
  }, [profileImgSrc]);

  // 실제 거래 데이터 불러오기
  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) {
          setIsLoggedIn(false);
          setRealStats(prev => ({
            ...prev,
            isLoading: false
          }));
          setHasConversationHistory(false);
        }
        setIsLoggedIn(true);
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

        // 오늘 거래, 이번달 거래, 대화 기록을 병렬로 조회
        const [todayResult, monthlyResult, chatResult] = await Promise.all([supabase.from("transactions").select("amount, type").eq("user_id", user.id).eq("transaction_date", todayStr), supabase.from("transactions").select("amount, type").eq("user_id", user.id).gte("transaction_date", monthStart).lte("transaction_date", todayStr), supabase.from("chat_messages").select("id").eq("user_id", user.id).limit(1)]);

        // 오늘 통계 (transfer_in은 매출에서 제외)
        let todayIncome = 0;
        let todayExpense = 0;
        if (todayResult.data) {
          todayResult.data.forEach(tx => {
            if (tx.type === "income") todayIncome += Number(tx.amount);
            else if (tx.type === "expense") todayExpense += Number(tx.amount);
            // transfer_in은 매출/지출 모두 제외
          });
        }

        // 이번달 통계 (transfer_in은 매출에서 제외)
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        if (monthlyResult.data) {
          monthlyResult.data.forEach(tx => {
            if (tx.type === "income") monthlyIncome += Number(tx.amount);
            else if (tx.type === "expense") monthlyExpense += Number(tx.amount);
            // transfer_in은 매출/지출 모두 제외
          });
        }

        // 대화 기록 존재 여부
        setHasConversationHistory((chatResult.data?.length ?? 0) > 0);
        setRealStats({
          todayIncome,
          todayExpense,
          monthlyIncome,
          monthlyExpense,
          isLoading: false
        });
      } catch (error) {
        console.error("Failed to fetch real stats:", error);
        setRealStats(prev => ({
          ...prev,
          isLoading: false
        }));
        setHasConversationHistory(false);
      }
    };
    fetchRealStats();
  }, []);

  // 랜덤 플레이스홀더 선택 (미완료 설정 우선)
  const placeholder = useMemo(() => {
    // 첫 대화인 경우 우선 표시
    if (hasConversationHistory === false) {
      return `${secretaryName || "김비서"}와 대화를 시작해보세요!`;
    }

    // 연동 상태에 따른 안내
    const { hometax_connected, card_connected, account_connected } = profile || {};
    if (!hometax_connected && !card_connected && !account_connected) {
      return "계좌·카드·홈택스를 연동하면 실시간 경영 현황을 알려드려요.";
    }
    if (!account_connected) return "계좌를 연동하면 매출·지출을 자동 관리해드려요.";
    if (!card_connected) return "카드를 연동하면 지출 분석까지 가능해요.";
    if (!hometax_connected) return "홈택스를 연동하면 세금계산서까지 관리해드려요.";

    // 미완료 설정 안내
    const incompleteMessages = getIncompleteSettingsMessages(profile, secretaryName || "김비서");
    if (incompleteMessages.length > 0) {
      return incompleteMessages[Math.floor(Math.random() * incompleteMessages.length)];
    }

    // 모두 완료 시
    return defaultPlaceholders[Math.floor(Math.random() * defaultPlaceholders.length)];
  }, [profile, secretaryName, hasConversationHistory]);

  // 브리핑 공통 실행 함수 (자동 트리거 & 수동 모두 사용)
  const triggerBriefing = async (force = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (!force) {
        const rawTimes = (profile as any)?.briefing_times;
        const briefingTimes: string[] = Array.isArray(rawTimes) && rawTimes.length > 0
          ? rawTimes.map(String)
          : (() => {
              const freq = profile?.briefing_frequency || 'daily';
              return freq === 'realtime' ? ["9","12","18","22"] : ["9"];
            })();
        const dueHour = getDueBriefingHour(briefingTimes);
        if (dueHour === null) return;
        const slotKey = getBriefingSlotKey(session.user.id, dueHour);
        if (!slotKey || localStorage.getItem(slotKey)) return;
      }

      setIsTyping(true);
      setIsBriefingResponse(true);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: buildBriefingPrompt(profile?.priority_metrics || []) }],
            secretaryName: profile?.secretary_name || '김비서',
            secretaryTone: profile?.secretary_tone || 'polite',
            secretaryGender: profile?.secretary_gender || 'female',
            userId: session.user.id,
          }),
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.response) {
        if (!force) {
          await supabase.from('chat_messages').insert({
            user_id: session.user.id,
            role: 'assistant',
            content: data.response,
          });
        }
        setIsBriefingResponse(true);
        setResponse(data.response);
      }
    } catch (err) {
      console.error('AI briefing error:', err);
    } finally {
      setIsTyping(false);
    }
  };

  // AI 브리핑 자동 트리거 (briefing_times 배열 기반)
  useEffect(() => {
    if (profileLoading || realStats.isLoading || hasConversationHistory === null) return;
    if (response || hasConversationHistory === false) return;
    triggerBriefing(false);
  }, [profileLoading, realStats.isLoading, hasConversationHistory, profile]);

  // 실제 데이터 기반 빠른 응답
  const generateQuickResponse = (inputText: string): string => {
    const lowerInput = inputText.toLowerCase();
    if (lowerInput.includes("매출") && (lowerInput.includes("오늘") || lowerInput.includes("얼마"))) {
      if (realStats.todayIncome > 0) {
        return `오늘 총 매출은 ${formatCurrency(realStats.todayIncome)}입니다.`;
      }
      return "오늘은 아직 매출 기록이 없어요.";
    }
    if (lowerInput.includes("급여") || lowerInput.includes("월급")) {
      return "급여 현황은 직원 관리 메뉴에서 확인할 수 있어요.";
    }
    if (lowerInput.includes("부가세") || lowerInput.includes("vat")) {
      return "부가세 현황은 리포트 > 세금계산서 탭에서 확인할 수 있어요.";
    }
    if (lowerInput.includes("이번 달") || lowerInput.includes("요약")) {
      if (realStats.monthlyIncome > 0 || realStats.monthlyExpense > 0) {
        return `이번 달 매출 ${formatCurrency(realStats.monthlyIncome)}, 지출 ${formatCurrency(realStats.monthlyExpense)}입니다.`;
      }
      return "이번 달은 아직 거래 내역이 없어요.";
    }
    return `자세한 내용은 ${josa(secretaryName, "와/과")} 대화해보세요!`;
  };
  const handleQuickAsk = async (question: string) => {
    setInput("");
    requireAuth(() => openChatWithMessage(question));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    requireAuth(() => openChatWithMessage(input.trim()));
    setInput("");
  };

  // 브리핑 TTS 재생/정지
  const stopTTS = () => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = "";
      ttsAudioRef.current = null;
    }
    setIsPlayingTTS(false);
    setIsTTSLoading(false);
  };

  const handleBriefingTTS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingTTS) {
      stopTTS();
      return;
    }
    if (!response) return;

    stopTTS();
    const abort = new AbortController();
    ttsAbortRef.current = abort;

    try {
      setIsTTSLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || abort.signal.aborted) return;

      // 마크다운 기호 제거 (**, *, #, 번호 목록 등)
      const cleanText = response
        .replace(/\*\*(.*?)\*\*/g, "$1")   // **굵게** → 굵게
        .replace(/\*(.*?)\*/g, "$1")        // *기울기* → 기울기
        .replace(/^#+\s/gm, "")             // ## 제목 제거
        .replace(/^\d+\.\s+/gm, "")         // 1. 번호 제거
        .replace(/^[-•]\s+/gm, "")          // - 불릿 제거
        .replace(/\n{3,}/g, "\n\n")         // 과도한 빈줄 정리
        .trim();

      const voiceId = profile?.secretary_voice_id || "EXAVITQu4vr4xnSDxMaL";
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          signal: abort.signal,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ text: cleanText, voiceId }),
        }
      );
      if (abort.signal.aborted) return;
      if (!res.ok) throw new Error("TTS failed");

      // 스트리밍 응답을 바로 blob으로 받아 즉시 재생 (chunked transfer 활용)
      const blob = await res.blob();
      if (abort.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onplay = () => {
        setIsTTSLoading(false);
        setIsPlayingTTS(true);
      };
      audio.onended = () => {
        setIsPlayingTTS(false);
        setIsTTSLoading(false);
        ttsAudioRef.current = null;
        ttsAbortRef.current = null;
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlayingTTS(false);
        setIsTTSLoading(false);
        ttsAudioRef.current = null;
        ttsAbortRef.current = null;
      };
      await audio.play();
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("TTS playback failed:", err);
      setIsPlayingTTS(false);
      setIsTTSLoading(false);
    }
  };

  // 화면 표시용 마크다운 제거
  const displayMessage = response
    ? response
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/^#+\s/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        .replace(/^[-•]\s+/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : null;
  const isBriefingDisplay = isBriefingResponse && !!response;
  return <Card className={`overflow-hidden shadow-lg ${isMobile ? "bg-white/90 backdrop-blur-md border-border/50" : "bg-card border-border"}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => navigate("/secretary-settings")} className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg hover:bg-muted transition-colors overflow-hidden">
                <img src={profileImgSrc} alt={secretaryName || "비서"} className={secretaryAvatarUrl ? "h-full w-auto object-contain" : "h-10 w-10 object-contain"} loading="eager" decoding="async" />
              </button>
              <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 flex items-center justify-center bg-muted rounded-full">
                <Settings className="h-3 w-3 text-muted-foreground/50" />
              </div>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground tracking-wide mb-0.5">당신의 경영 비서</p>
              {secretaryName ? <h3 className="font-bold text-foreground">{secretaryName}</h3> : <Skeleton className="h-5 w-16" />}
            </div>
          </div>

          {/* 우상단: 마이크 아이콘 */}
          <Button variant="ghost" size="sm" onClick={() => requireAuth(openVoice)} className="gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary px-3">
            <Mic className="h-4 w-4" />
            대화
          </Button>
        </div>

        {/* Response/Briefing Area */}
        {(displayMessage || isTyping) && (
          <div className={`mb-3 rounded-2xl border transition-all ${isBriefingDisplay ? "bg-success/8 border-success/25" : "bg-muted/60 border-border"}`}>
            {isTyping ? (
              <div className="flex items-center gap-2.5 px-4 py-5">
                <Sparkles className="h-4 w-4 animate-pulse text-success shrink-0" />
                <span className="text-sm text-muted-foreground">{isBriefingResponse ? "브리핑 생성 중..." : "답변 중..."}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {/* 브리핑 헤더 */}
                {isBriefingDisplay && (
                  <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-success/15">
                    <div className="flex items-center gap-2">
                      {isTTSLoading && !isPlayingTTS
                        ? <Loader2 className="h-3.5 w-3.5 text-success animate-spin shrink-0" />
                        : isPlayingTTS
                          ? <Volume2 className="h-3.5 w-3.5 text-success animate-pulse shrink-0" />
                          : <Clock className="h-3.5 w-3.5 text-success shrink-0" />}
                      <span className="text-xs font-bold text-success tracking-wide">오늘의 경영 브리핑</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-success hover:text-success hover:bg-success/10 rounded-full text-xs h-7 px-2.5"
                      onClick={handleBriefingTTS}
                      disabled={isTTSLoading && !isPlayingTTS}
                    >
                      {isTTSLoading && !isPlayingTTS
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />연결 중...</>
                        : isPlayingTTS
                          ? <><VolumeX className="h-3.5 w-3.5" />중지</>
                          : <><Volume2 className="h-3.5 w-3.5" />듣기</>}
                    </Button>
                  </div>
                )}

                {/* 본문 */}
                <div
                  className="px-4 py-3 cursor-pointer"
                  onClick={isBriefingDisplay ? handleBriefingTTS : () => requireAuth(openChat)}
                >
                  <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-line">{displayMessage}</p>
                </div>

                {/* 브리핑 액션 */}
                <div className="flex items-center justify-between px-3 pb-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-primary hover:bg-primary/10 rounded-full text-xs h-7 px-3"
                    onClick={() => requireAuth(openChat)}
                  >
                    <Mic className="h-3.5 w-3.5" />비서와 대화하기
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={e => {
                    e.stopPropagation();
                    stopTTS();
                    setResponse(null);
                    setIsBriefingResponse(false);
                  }}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 세무사 퀵액션 */}
        <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
          {taxQuickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={isTyping}
              onClick={() => handleQuickAsk(action.prompt)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-accent/60 bg-accent/30 text-accent-foreground hover:bg-accent/50 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <action.icon className="h-3 w-3 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="비서에게 요청해주세요!" className="flex-1 bg-muted border-border text-sm font-medium placeholder:text-xs placeholder:font-normal placeholder:text-muted-foreground placeholder:leading-normal focus-visible:ring-primary/30 leading-normal text-foreground rounded-full" disabled={isTyping || profileLoading || realStats.isLoading} />
          <Button type="submit" size="icon" disabled={!input.trim() || isTyping} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-full h-9 w-9 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Quick Prompts + 브리핑 버튼 */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            type="button"
            disabled={isTyping}
            onClick={() => requireAuth(() => triggerBriefing(true))}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" />브리핑
          </button>
          {quickPrompts.map(prompt => <button key={prompt} type="button" className="text-xs px-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" onClick={() => handleQuickAsk(prompt)} disabled={isTyping}>
              #{prompt}
            </button>)}
        </div>
      </CardContent>
    </Card>;
}

