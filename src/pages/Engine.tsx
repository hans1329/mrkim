import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  Hand, 
  MessageSquare, 
  Receipt, 
  Bell, 
  Calendar,
  Shield,
  ArrowRight,
  Database,
  Zap,
  ExternalLink,
  Mic,
  Volume2,
  MessageCircle,
  Phone,
  Headphones,
  Search,
  Layers,
  FileText,
  Users,
  Wallet,
  PiggyBank,
  ArrowLeftRight,
  Share2,
  CircleDot,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Engine() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">김비서 AI 엔진 아키텍처</h1>
              <p className="text-muted-foreground text-sm">v2.1 · 2026-02-18 업데이트</p>
            </div>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-88px)]">
        <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
          
          {/* 설계 철학 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                설계 철학
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                "연결만 해두면 평소엔 신경 쓰지 않아도 되는 서비스"
              </blockquote>
              <p>사용자가 질문하지 않아도 AI가 <strong>선제적으로 판단하고 조언</strong>하는 구조를 지향합니다.</p>
              
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Head (두뇌)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">의도 분석, 판단, 조언 생성</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="secondary">Gemini Flash</Badge>
                    <Badge variant="outline">Gemini Pro</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    일반 대화·분류는 <strong>Flash</strong>(빠름), 복잡한 분석·추론은 <strong>Pro</strong> 사용
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-accent/50 border border-accent">
                  <div className="flex items-center gap-2 mb-2">
                    <Hand className="h-5 w-5 text-accent-foreground" />
                    <h4 className="font-semibold">Hands (손)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">데이터 조회, 분류, 알림 실행</p>
                  <Badge variant="secondary" className="mt-2">Edge Functions (Lambda) + APIs</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 응답 채널 구성 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                응답 채널 구성
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                동일한 AI 엔진(<code className="text-xs bg-muted px-1 rounded">chat-ai</code>)을 기반으로, 채널에 맞는 응답 형식을 제공합니다.
              </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                {/* 텍스트 채널 */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-full bg-blue-500/10">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                    </div>
                    <h4 className="font-semibold">텍스트 채널</h4>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• <strong>chat-ai</strong> Edge Function</p>
                    <p>• 마크다운 응답</p>
                    <p>• 6대 데이터 소스 조회</p>
                    <p>• 대화 히스토리 저장</p>
                  </div>
                  <Badge className="mt-3" variant="outline">로그인 사용자</Badge>
                </div>

                {/* 음성 채널 */}
                <div className="p-4 rounded-lg border-2 border-purple-500/30 bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-full bg-purple-500/10">
                      <Headphones className="h-4 w-4 text-purple-500" />
                    </div>
                    <h4 className="font-semibold">음성 채널</h4>
                    <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">v2.0</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• <strong>ElevenLabs Conversational AI</strong></p>
                    <p>• WebRTC 실시간 양방향 음성</p>
                    <p>• Client Tool로 DB 데이터 조회</p>
                    <p>• 데이터 시각화 연동</p>
                  </div>
                  <Badge className="mt-3" variant="outline">로그인 사용자</Badge>
                </div>

                {/* 서비스 채널 */}
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-full bg-green-500/10">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <h4 className="font-semibold">서비스 안내</h4>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• <strong>service-chat</strong> Edge Function</p>
                    <p>• 서비스 소개 특화</p>
                    <p>• 요금제/기능 안내</p>
                    <p>• 비로그인 접근 가능</p>
                  </div>
                  <Badge className="mt-3" variant="outline">모든 방문자</Badge>
                </div>
              </div>

              {/* 채널 흐름도 */}
              <div className="mt-6 p-4 rounded-lg bg-muted/30">
                <p className="text-xs font-medium mb-3">채널 통합 흐름</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">사용자 입력</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">채널 감지</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">키워드 의도 분류</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">데이터 조회</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">채널별 응답 포맷</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge>출력</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 음성 엔진 상세 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-purple-500" />
                음성 대화 엔진 v2.0
                <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">NEW</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <strong>ElevenLabs Conversational AI (WebRTC)</strong> 기반 통합 음성 대화 시스템.
                기존 Scribe STT → chat-ai → TTS 3단계 파이프라인을 대체하여 <strong>단일 WebRTC 세션</strong>으로 
                저지연 양방향 음성 대화를 구현합니다.
              </p>

              {/* 아키텍처 개요 */}
              <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <p className="text-xs font-medium mb-3">🎙️ v2.0 음성 대화 아키텍처</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-purple-500/10">🎤 사용자 음성</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">ElevenLabs Agent (WebRTC)</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="bg-blue-500/10">Client Tool: query_business</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">chat-ai (Gemini)</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="bg-green-500/10">🔊 AI 음성 응답</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  STT/TTS가 ElevenLabs Agent 내부에서 처리되므로 별도 Edge Function 호출 없이 실시간 대화가 가능합니다.
                  데이터 조회만 <code className="bg-muted px-1 rounded">query_business</code> Client Tool → <code className="bg-muted px-1 rounded">chat-ai</code>를 경유합니다.
                </p>
              </div>

              {/* v1.x → v2.0 비교 */}
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs font-medium mb-3">📊 v1.x → v2.0 변경점 비교</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">항목</th>
                        <th className="text-left py-2 px-2">v1.x (기존)</th>
                        <th className="text-left py-2 px-2">v2.0 (현재)</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-1.5 px-2 font-medium">아키텍처</td><td className="py-1.5 px-2">Scribe STT → chat-ai → TTS (3단계)</td><td className="py-1.5 px-2">ElevenLabs Conversational AI (통합)</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2 font-medium">프로토콜</td><td className="py-1.5 px-2">WebSocket (STT) + HTTP (AI, TTS)</td><td className="py-1.5 px-2">WebRTC (단일 세션)</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2 font-medium">지연 시간</td><td className="py-1.5 px-2">높음 (3개 API 순차 호출)</td><td className="py-1.5 px-2">낮음 (STT→TTS 내장, 데이터 조회만 외부)</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2 font-medium">에코 방지</td><td className="py-1.5 px-2">suppressSTTRef 수동 관리</td><td className="py-1.5 px-2">SDK micMuted + 자동 VAD</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2 font-medium">데이터 조회</td><td className="py-1.5 px-2">chat-ai 직접 호출</td><td className="py-1.5 px-2">Client Tool → chat-ai (voiceMode)</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2 font-medium">오디오 재생</td><td className="py-1.5 px-2">Persistent Audio 객체 수동 관리</td><td className="py-1.5 px-2">SDK 내장 재생</td></tr>
                      <tr><td className="py-1.5 px-2 font-medium">인터럽트</td><td className="py-1.5 px-2">세션 재시작</td><td className="py-1.5 px-2">볼륨 0 소거 + interruptedRef 가드</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 핵심 컴포넌트 */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* useVoiceAgent Hook */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Mic className="h-5 w-5 text-purple-500" />
                    <h4 className="font-semibold text-sm">useVoiceAgent</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">역할</span>
                      <span>핵심 상태 관리</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SDK 훅</span>
                      <Badge variant="outline" className="text-xs">useConversation</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">상태 머신</span>
                      <span>idle→listening→processing→speaking</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client Tools</span>
                      <code className="text-xs bg-muted px-1 rounded">query_business</code>
                    </div>
                  </div>
                </div>

                {/* ElevenLabs Agent */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold text-sm">ElevenLabs Agent</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">연결</span>
                      <Badge variant="outline" className="text-xs">WebRTC</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">토큰</span>
                      <code className="text-xs bg-muted px-1 rounded">elevenlabs-conversation-token</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">오버라이드</span>
                      <span>프롬프트/인사말/음성</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">언어</span>
                      <span>한국어 (ko)</span>
                    </div>
                  </div>
                </div>

                {/* VoiceOverlay UI */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Volume2 className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold text-sm">VoiceOverlay UI</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">자동 시작</span>
                      <span>오버레이 열림 시</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">인터럽트</span>
                      <span>마이크 버튼 탭</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">시각화</span>
                      <Badge variant="outline" className="text-xs">차트/그래프</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">제안 칩</span>
                      <span>AI 후속 질문 동적 생성</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Tool 상세 */}
              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs font-medium mb-3">🔧 Client Tool: query_business</p>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>ElevenLabs Agent가 매출/지출/세금 등 숫자 질문을 인식하면 자동으로 호출합니다.</p>
                  <div className="p-3 rounded bg-muted/50 overflow-x-auto">
                    <pre className="text-xs whitespace-pre-wrap">
{`query_business(question: string) → string
  1. supabase.auth.getSession() → userId, accessToken 획득
  2. fetch("chat-ai", { messages, secretaryName, secretaryTone, voiceMode: true })
  3. 응답에서 마크다운/이모지 제거 (정규식)
  4. convertNumbersToKorean() → 숫자를 한글 독음으로 변환
     예: "4,430,000원" → "사백사십삼만 원"
  5. visualization 데이터 → pendingVisualizationRef에 보관
  6. Agent에게 "[조회 결과] ..." 텍스트 반환 → 자연스러운 음성 답변`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* 상태 관리 */}
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-xs font-medium mb-3">🔄 상태 관리 & 안전 장치</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0">상태 머신</Badge>
                    <p><code className="bg-muted px-1 rounded">idle → listening → processing → speaking</code> 4단계 상태. SDK의 <code className="bg-muted px-1 rounded">isSpeaking</code> + <code className="bg-muted px-1 rounded">toolCallActiveRef</code>로 동기화</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0">마이크 자동 제어</Badge>
                    <p>Agent 발화 중 + Tool Call 중 → <code className="bg-muted px-1 rounded">micMuted: true</code>. 발화 종료 후 600ms 디바운스로 listening 전환 (짧은 묵음 구간 UI 깜빡임 방지)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0">인터럽트</Badge>
                    <p>마이크 버튼 탭 → 볼륨 0 소거 + <code className="bg-muted px-1 rounded">interruptedRef</code> 플래그 → SDK isSpeaking false까지 상태 동기화 차단 → 볼륨 복원 후 listening 전환</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0">waitingFirstMessage</Badge>
                    <p>연결 직후 또는 Tool Call 완료 직후, 실제 음성 응답이 시작되기 전까지 listening 전환 차단. speaking 상태 유지하여 UX 일관성 보장</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0">잡음 필터</Badge>
                    <p>5자 미만 짧은 발화는 무시. 사용자 메시지는 pending으로 보관 후 Agent 응답 시점에 확정 저장</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0">세션 종료</Badge>
                    <p>오버레이 닫기 시 <code className="bg-muted px-1 rounded">endSession()</code> 비동기 보장. SDK 재연결 중 disconnect 이벤트는 <code className="bg-muted px-1 rounded">isConnectingRef</code>로 무시</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="text-[10px] shrink-0">대화 저장</Badge>
                    <p>Agent 응답 수신 시 <code className="bg-muted px-1 rounded">chat_messages</code> 테이블에 자동 저장. 텍스트 채팅과 통합 히스토리 관리</p>
                  </div>
                </div>
              </div>

              {/* 동적 오버라이드 */}
              <div className="p-4 rounded-lg border">
                <p className="text-xs font-medium mb-3">🎭 동적 오버라이드 (사용자 설정 반영)</p>
                <div className="grid md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">시스템 프롬프트</p>
                    <ul className="space-y-0.5">
                      <li>• 비서 이름/성별/말투 반영</li>
                      <li>• query_business 강제 호출 지시</li>
                      <li>• 숫자 추측 금지 규칙</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">인사말</p>
                    <ul className="space-y-0.5">
                      <li>• 받침 여부에 따른 조사 처리</li>
                      <li>• 말투별 분기 (polite/friendly/cute)</li>
                      <li>• 예: "미래에용! 뭘 도와드릴까용?"</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">음성</p>
                    <ul className="space-y-0.5">
                      <li>• 성별에 따른 voiceId 자동 선택</li>
                      <li>• 여성: uyVNoMrnUku1dZyVEXwD</li>
                      <li>• 남성: ZJCNdZEjYwkOElxugmW2</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* UX 기능 */}
              <div className="p-4 rounded-lg border">
                <p className="text-xs font-medium mb-3">✨ 음성 UX 기능</p>
                <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">시각화 데이터 연동</p>
                    <p>query_business 응답에 <code className="bg-muted px-1 rounded">visualization</code> 데이터가 포함되면 
                      <code className="bg-muted px-1 rounded">pendingVisualizationRef</code>에 보관 후 Agent 응답 메시지에 연결하여 VoiceOverlay 하단에 차트/그래프 표시</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">동적 제안 칩</p>
                    <p>Agent 응답에서 후속 질문(~할까요?, ~볼까요?)을 정규식으로 추출하여 명령형("확인해줘", "알려줘")으로 변환 후 제안 칩으로 노출. 추출 실패 시 기본 4개 제안 표시</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">텍스트 모드 전환</p>
                    <p>음성 오버레이 상단 "텍스트" 버튼으로 텍스트 채팅으로 즉시 전환. 세션 종료 후 ChatPanel 오픈</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">숫자 독음 변환</p>
                    <p><code className="bg-muted px-1 rounded">convertNumbersToKorean()</code>: 콤마 포함 숫자+단위를 한글 독음으로 변환. 예: 4,430,000원 → 사백사십삼만 원</p>
                  </div>
                </div>
              </div>

              {/* 전화 알림 */}
              <div className="p-4 rounded-lg border border-orange-500/30 bg-orange-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="h-5 w-5 text-orange-500" />
                  <h4 className="font-semibold">긴급 전화 알림</h4>
                  <Badge variant="outline" className="text-xs">Phase 2</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Twilio Voice + ElevenLabs TTS를 결합한 아웃바운드 음성 알림
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">세금 마감 알림</Badge>
                  <Badge variant="secondary">급여일 알림</Badge>
                  <Badge variant="secondary">긴급 이상 감지</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6대 데이터 소스 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-500" />
                6대 데이터 소스
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                AI가 사용자 질문에 답변할 때 조회하는 데이터 소스입니다. 각 소스별 전용 조회·포맷팅 함수가 <code className="text-xs bg-muted px-1 rounded">chat-ai</code>에 구현되어 있습니다.
              </p>

              {/* 연동 API 범례 */}
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">코드에프 베타 (현재)</Badge>
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">코드에프 정식 (필요)</Badge>
                <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">하이픈 (필요)</Badge>
                <Badge variant="outline">내부 DB</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: <Receipt className="h-4 w-4" />, name: "거래내역", table: "transactions", keywords: "매출, 지출, 결제, 비용",
                    api: "코드에프", apiStatus: "beta", apiNote: "베타 ConnectedId로 조회 중. 정식 전환 시 실계좌 연동 필요",
                    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                  { icon: <FileText className="h-4 w-4" />, name: "세금계산서", table: "tax_invoices", keywords: "부가세, 계산서, 세금",
                    api: "코드에프", apiStatus: "beta", apiNote: "베타 홈택스 인증으로 조회 중. 정식 전환 필요",
                    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
                  { icon: <Users className="h-4 w-4" />, name: "직원/급여", table: "employees", keywords: "급여, 월급, 직원, 인건비",
                    api: "내부 DB", apiStatus: "done", apiNote: "자체 관리. 향후 하이픈 급여 자동 집행 연동 예정",
                    badgeClass: "" },
                  { icon: <Wallet className="h-4 w-4" />, name: "예치금/비상금", table: "deposits", keywords: "예치금, 비상금, 적립",
                    api: "내부 DB", apiStatus: "done", apiNote: "자체 관리. 향후 하이픈 자동 적립 연동 예정",
                    badgeClass: "" },
                  { icon: <PiggyBank className="h-4 w-4" />, name: "저축/투자", table: "savings_accounts", keywords: "적금, 예금, 이자, 투자",
                    api: "내부 DB", apiStatus: "done", apiNote: "자체 관리",
                    badgeClass: "" },
                  { icon: <ArrowLeftRight className="h-4 w-4" />, name: "자동이체", table: "auto_transfers", keywords: "자동이체, 이체 규칙",
                    api: "내부 DB → 하이픈", apiStatus: "partial", apiNote: "규칙 저장만 완료. 실제 자금 집행은 하이픈 연동 필요",
                    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
                ].map((item) => (
                  <div key={item.table} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      {item.icon}
                      <span className="font-semibold text-sm">{item.name}</span>
                      {item.apiStatus === "beta" && (
                        <Badge className={`text-[10px] ${item.badgeClass}`}>코드에프 정식 필요</Badge>
                      )}
                      {item.apiStatus === "partial" && (
                        <Badge className={`text-[10px] ${item.badgeClass}`}>하이픈 필요</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>테이블: <code className="bg-muted px-1 rounded">{item.table}</code></p>
                      <p>연동: {item.api}</p>
                      <p className="text-[10px]">키워드: {item.keywords}</p>
                      <p className="text-[10px] mt-1 italic">{item.apiNote}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 핵심 모듈 */}
          <Card>
            <CardHeader>
              <CardTitle>AI 엔진 핵심 모듈 구성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* 의도 분류기 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">1. 키워드 기반 의도 분류기</h3>
                  <Badge variant="secondary" className="text-xs">구현 완료</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  정규식 키워드 매칭으로 빠르게 의도를 분류합니다. Gemini API 호출 없이 0ms에 분류 완료.
                </p>
                
                <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                  <p className="text-xs font-medium mb-3">classifyByKeyword() 분류 로직</p>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
{`function classifyByKeyword(text) → {
  needsData: boolean,       // 데이터 조회 필요 여부
  dataSource: DataSource,   // "transaction" | "employee" | "tax_invoice" 
                            // | "deposit" | "savings" | "auto_transfer"
  requiresConnection: string | null,  // "hometax" | "card_or_bank" | null(내부)
  timePeriod?: { type: "today" | "week" | "month" | ... }
}

// 기간 감지: /오늘/ → today, /이번\\s*주/ → week, /이번\\s*달/ → month ...
// 카테고리별 정규식 매칭 (구체적 패턴 우선)`}
                  </pre>
                </div>

                <div className="overflow-x-auto mt-4">
                  <p className="text-xs font-medium mb-2">의도별 매핑 예시 (6대 데이터 소스)</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">사용자 입력 예시</th>
                        <th className="text-left py-2 px-2">dataSource</th>
                        <th className="text-left py-2 px-2">정규식 패턴</th>
                        <th className="text-left py-2 px-2">연동 필요</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b bg-muted/30">
                        <td className="py-1.5 px-2 font-medium text-foreground" colSpan={4}>📊 거래/매출 (transaction)</td>
                      </tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"오늘 매출 얼마야?"</td><td className="py-1.5 px-2">transaction</td><td className="py-1.5 px-2 font-mono text-[10px]">/매출|수입|수익|지출|비용|결제/</td><td className="py-1.5 px-2">card/bank</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"이번 달 카드 사용 내역"</td><td className="py-1.5 px-2">transaction</td><td className="py-1.5 px-2 font-mono text-[10px]">/카드.*사용|내역|현황/</td><td className="py-1.5 px-2">card/bank</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"이번 주 어때?"</td><td className="py-1.5 px-2">transaction</td><td className="py-1.5 px-2 font-mono text-[10px]">기간 + /어때|알려|보여/</td><td className="py-1.5 px-2">card/bank</td></tr>

                      <tr className="border-b bg-muted/30">
                        <td className="py-1.5 px-2 font-medium text-foreground" colSpan={4}>🧾 세금계산서 (tax_invoice)</td>
                      </tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"부가세 얼마 내야해?"</td><td className="py-1.5 px-2">tax_invoice</td><td className="py-1.5 px-2 font-mono text-[10px]">/세금|부가세|종소세|납부/</td><td className="py-1.5 px-2">hometax</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"매입 계산서 현황"</td><td className="py-1.5 px-2">tax_invoice</td><td className="py-1.5 px-2 font-mono text-[10px]">/세금\s*계산서|매입.*계산서/</td><td className="py-1.5 px-2">hometax</td></tr>

                      <tr className="border-b bg-muted/30">
                        <td className="py-1.5 px-2 font-medium text-foreground" colSpan={4}>👥 직원/급여 (employee)</td>
                      </tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"직원 급여 현황"</td><td className="py-1.5 px-2">employee</td><td className="py-1.5 px-2 font-mono text-[10px]">/급여|월급|임금|인건비|4대.*보험/</td><td className="py-1.5 px-2">없음 (내부)</td></tr>

                      <tr className="border-b bg-muted/30">
                        <td className="py-1.5 px-2 font-medium text-foreground" colSpan={4}>💰 비상금/예치금 (deposit)</td>
                      </tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"비상금 얼마 모았어?"</td><td className="py-1.5 px-2">deposit</td><td className="py-1.5 px-2 font-mono text-[10px]">/예치금|비상금|퇴직금.*적립/</td><td className="py-1.5 px-2">없음 (내부)</td></tr>

                      <tr className="border-b bg-muted/30">
                        <td className="py-1.5 px-2 font-medium text-foreground" colSpan={4}>🏦 저축/투자 (savings)</td>
                      </tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"적금 이자 얼마야?"</td><td className="py-1.5 px-2">savings</td><td className="py-1.5 px-2 font-mono text-[10px]">/적금|예금|파킹\s*통장|이자.*얼마/</td><td className="py-1.5 px-2">없음 (내부)</td></tr>

                      <tr className="border-b bg-muted/30">
                        <td className="py-1.5 px-2 font-medium text-foreground" colSpan={4}>🔄 자동이체 (auto_transfer)</td>
                      </tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"자동이체 설정 보여줘"</td><td className="py-1.5 px-2">auto_transfer</td><td className="py-1.5 px-2 font-mono text-[10px]">/자동\s*이체|자동\s*송금|이체\s*규칙/</td><td className="py-1.5 px-2">없음 (내부)</td></tr>

                      <tr className="bg-muted/30">
                        <td className="py-1.5 px-2 font-medium text-foreground" colSpan={4}>💬 일반 대화 (데이터 불필요)</td>
                      </tr>
                      <tr><td className="py-1.5 px-2">"넌 누구야?"</td><td className="py-1.5 px-2">—</td><td className="py-1.5 px-2 font-mono text-[10px]">매칭 없음 → needsData: false</td><td className="py-1.5 px-2">—</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* 분류 후 처리 흐름 */}
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 mt-3">
                  <p className="text-xs font-semibold mb-2">분류 후 처리 흐름</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>1. <strong>연동 확인</strong>: checkConnectionForSource()로 필요 연동 여부 판별</p>
                    <p>2. <strong>미연동 시</strong>: buildConnectionRequiredResponse()로 연동 안내 (voiceMode별 분기)</p>
                    <p>3. <strong>연동 완료</strong>: fetchAndFormatData()로 6대 소스별 데이터 조회 + 프롬프트 포매팅</p>
                    <p>4. <strong>Gemini 호출</strong>: 포매팅된 데이터 컨텍스트 + 시스템 프롬프트 → 자연어 응답 생성</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 거래 분류기 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold">2. 거래 자동 분류기 (Transaction Classifier)</h3>
                  <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">완료</Badge>
                </div>
                <p className="text-sm text-muted-foreground">상호명 패턴 매칭으로 60개+ 키워드를 12개 비용 카테고리로 자동 분류</p>
                
                {/* 아키텍처 구성 */}
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <p className="text-xs font-semibold text-purple-600 mb-1">분류 엔진</p>
                    <p className="text-xs text-muted-foreground">src/lib/transactionClassifier.ts</p>
                    <p className="text-xs text-muted-foreground mt-1">정규식 패턴 매칭으로 상호명 → 카테고리 자동 매핑</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs font-semibold text-blue-600 mb-1">UI 컴포넌트</p>
                    <p className="text-xs text-muted-foreground">TransactionClassifier.tsx</p>
                    <p className="text-xs text-muted-foreground mt-1">일괄/개별 분류, 통계 요약, 신뢰도 표시, 재분류</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="text-xs font-semibold text-green-600 mb-1">DB 연동</p>
                    <p className="text-xs text-muted-foreground">useClassifyTransactions 훅</p>
                    <p className="text-xs text-muted-foreground mt-1">분류 결과를 transactions 테이블에 실시간 저장</p>
                  </div>
                </div>

                {/* 카테고리 매핑 테이블 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">카테고리 (12개)</th>
                        <th className="text-left py-2 px-3">주요 패턴 예시</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-2 px-3">🍽️ 복리후생비</td><td className="py-2 px-3">식당, 카페, 스타벅스, 편의점, 병원, 약국</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">🚗 여비교통비</td><td className="py-2 px-3">택시, 주유소, KTX, 항공, 호텔</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">📱 통신비</td><td className="py-2 px-3">SKT, KT, LG유플러스</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">💳 지급수수료</td><td className="py-2 px-3">PG결제, 구독료, 은행수수료, 클라우드</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">📦 소모품비</td><td className="py-2 px-3">쿠팡, 11번가, 다이소, 문구</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">📢 광고선전비</td><td className="py-2 px-3">메타, 구글애즈, 네이버광고</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">🛡️ 보험료 · 🔑 임차료 · 🥬 원재료비</td><td className="py-2 px-3">보험사, 월세, 마트/도매</td></tr>
                      <tr><td className="py-2 px-3">📚 교육훈련비 · 🍻 접대비</td><td className="py-2 px-3">학원, 세미나 / 술집, 골프</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* 분류 흐름 */}
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-semibold mb-2">분류 파이프라인</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="px-2 py-1 rounded bg-background border">거래 수집</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="px-2 py-1 rounded bg-background border">상호명 정규식 매칭</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="px-2 py-1 rounded bg-background border">카테고리 + 신뢰도 부여</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="px-2 py-1 rounded bg-background border">DB 저장</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    · 미분류/기타비용 항목만 자동 분류 대상 (수동 분류 제외)<br/>
                    · 신뢰도: high(패턴 정확 매칭) / low(미매칭 → 기타비용)<br/>
                    · <span className="text-amber-600 font-medium">예정:</span> 패턴 미매칭 시 Gemini AI 폴백 분류
                  </p>
                </div>
              </div>

              <Separator />

              {/* 알림 생성기 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold">3. 알림 생성기 (Alert Generator)</h3>
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">부분 완료</Badge>
                </div>
                <p className="text-sm text-muted-foreground">실제 데이터 기반으로 긴급 알림을 자동 생성합니다.</p>
                
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs font-medium mb-2 text-green-600">✅ 구현 완료</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 세금 마감일 자동 D-day 계산 (부가세 1/25, 7/25 · 종소세 5/31)</li>
                      <li>• 가장 가까운 마감일 우선 표시</li>
                      <li>• 미분류 거래 건수 실시간 알림</li>
                      <li>• 전월 대비 지출 증감 알림 (±10%/20% 기준)</li>
                      <li>• 대시보드 배너 + 알림 카드 연동</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg border border-dashed bg-card">
                    <p className="text-xs font-medium mb-2 text-muted-foreground">🔮 예정</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 자동 스케줄 알림 (cron)</li>
                      <li>• 미수금 30일 초과 감지</li>
                      <li>• 급여일 D-3 알림</li>
                      <li>• 푸시 알림 연동</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 종합소득세 계산기 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-semibold">4. 종합소득세 간이 계산기</h3>
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge>
                </div>
                <p className="text-sm text-muted-foreground">세금계산서 매출/매입 기반 종합소득세 예상액 자동 계산</p>
                
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs font-medium mb-2">자동 계산</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 매출 - 매입 = 추정 소득금액</li>
                      <li>• 2025년 8단계 세율표 적용 (6%~45%)</li>
                      <li>• 지방소득세 (10%) 자동 합산</li>
                      <li>• 적용 세율 구간 표시</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs font-medium mb-2">상세 시뮬레이션</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 기본공제 (본인+부양가족) 입력</li>
                      <li>• 국민연금, 건강보험료 공제</li>
                      <li>• 기타 소득공제 입력</li>
                      <li>• 절세 효과 실시간 확인</li>
                    </ul>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  위치: 리포트 &gt; 세금계산서 탭 하단. 법인사업자 분기 처리는 미구현 (향후 business_type 기반 분기 예정)
                </p>
              </div>

              <Separator />

              {/* AI 인사이트 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-500" />
                  <h3 className="font-semibold">5. AI 인사이트 리포트</h3>
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Gemini 기반 경영 분석 인사이트 생성 (24시간 캐싱)</p>
                
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-semibold mb-2">동작 방식</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="px-2 py-1 rounded bg-background border">사용자 클릭</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="px-2 py-1 rounded bg-background border">generate-insights</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="px-2 py-1 rounded bg-background border">DB 데이터 수집</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="px-2 py-1 rounded bg-background border">Gemini 분석</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span className="px-2 py-1 rounded bg-background border">ai_insights 캐싱 (24h)</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 직원 평판 관리 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-pink-500" />
                  <h3 className="font-semibold">6. 직원 평판 관리 (칭찬하기)</h3>
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge>
                </div>
                <p className="text-sm text-muted-foreground">업장 간 공유되는 직원 칭찬/평판 시스템 (네거티브 항목 없음, 긍정 피드백만)</p>
                
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs font-medium mb-2">칭찬 등록</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 8종 태그: 성실함, 친절함, 팀워크, 시간준수, 책임감, 빠른학습, 꼼꼼함, 리더십</li>
                      <li>• 자유 코멘트 작성 (선택)</li>
                      <li>• 직원 리스트에서 ❤️ 버튼으로 진입</li>
                      <li>• 전화번호 등록된 직원만 칭찬 가능</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs font-medium mb-2">평판 공유 설계</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 식별 기준: 이름 + 전화번호</li>
                      <li>• 공개 범위: 모든 인증 사업자</li>
                      <li>• 태그별 집계 자동 표시</li>
                      <li>• RLS: 조회=전체, 등록/삭제=본인만</li>
                    </ul>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-semibold mb-2">DB 구조</p>
                  <div className="text-xs text-muted-foreground font-mono space-y-1">
                    <p>employee_praises: id, praiser_user_id, employee_name, employee_phone, tags[], comment, created_at</p>
                    <p>employees.phone: 직원 전화번호 (평판 매칭 키)</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  위치: 직원 관리 &gt; 직원 리스트 &gt; ❤️ 버튼. useEmployeePraises.ts / PraiseDialog.tsx
                </p>
              </div>

              <Separator />

              {/* 일일 브리핑 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-teal-500" />
                  <h3 className="font-semibold">7. 일일 브리핑 (Daily Briefing)</h3>
                  <Badge variant="outline" className="text-xs">예정</Badge>
                </div>
                <p className="text-sm text-muted-foreground">매일 아침 경영 현황 요약 제공</p>
              </div>
            </CardContent>
          </Card>

          {/* 공유 모듈 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-indigo-500" />
                공유 응답 엔진
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <code className="text-xs bg-muted px-1 rounded">_shared/response-engine.ts</code>에 중앙 집중화된 공통 로직입니다.
                <code className="text-xs bg-muted px-1 rounded">chat-ai</code>, <code className="text-xs bg-muted px-1 rounded">service-chat</code> 등 여러 Edge Function에서 import하여 사용합니다.
              </p>

              {/* 모듈별 상세 */}
              <div className="space-y-3">

                {/* 1. 타입 정의 */}
                <div className="p-3 rounded-lg border">
                  <p className="text-sm font-medium mb-2">📦 타입 정의</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="p-2 rounded bg-muted/30">
                      <code className="font-mono text-[11px]">IntentResult</code>
                      <p className="mt-1">의도, 신뢰도, 필요 데이터소스, 기간, 거절사유</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <code className="font-mono text-[11px]">ConnectionStatus</code>
                      <p className="mt-1">hometax, card, bank, employee 연동 여부</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <code className="font-mono text-[11px]">ResponseContext</code>
                      <p className="mt-1">userId, secretaryName, tone, channel</p>
                    </div>
                  </div>
                </div>

                {/* 2. 말투 설정 */}
                <div className="p-3 rounded-lg border">
                  <p className="text-sm font-medium mb-2">🗣️ 말투 설정 (toneInstructions)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 px-2">말투</th>
                          <th className="text-left py-1.5 px-2">어미 예시</th>
                          <th className="text-left py-1.5 px-2">톤</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b"><td className="py-1.5 px-2 font-medium">polite (격식체)</td><td className="py-1.5 px-2">~입니다, ~습니다, ~하시겠습니까?</td><td className="py-1.5 px-2">정중하고 프로페셔널</td></tr>
                        <tr className="border-b"><td className="py-1.5 px-2 font-medium">friendly (친근체)</td><td className="py-1.5 px-2">~이에요, ~해요, ~할게요</td><td className="py-1.5 px-2">편안하지만 존중</td></tr>
                        <tr><td className="py-1.5 px-2 font-medium">cute (귀여운체)</td><td className="py-1.5 px-2">~이에용, ~했어용, ~해드릴게용~</td><td className="py-1.5 px-2">밝고 귀여운 에너지 + 이모지</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    비서 이름의 받침 유무(hasBatchim)에 따라 "이에요/예요" 등 조사가 자동 선택됨
                  </p>
                </div>

                {/* 3. 시스템 프롬프트 */}
                <div className="p-3 rounded-lg border">
                  <p className="text-sm font-medium mb-2">📝 시스템 프롬프트 (buildSystemPrompt)</p>
                  <p className="text-xs text-muted-foreground mb-2">채널(text/voice/service)에 따라 기본 프롬프트 + 채널별 지침을 결합합니다.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-muted/30 text-xs">
                      <p className="font-medium">💬 text</p>
                      <p className="text-muted-foreground mt-1">마크다운 형식, 간결한 응답</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-xs">
                      <p className="font-medium">🎙️ voice</p>
                      <p className="text-muted-foreground mt-1">2-3문장 권장, 마크다운 금지, 숫자 읽기 쉽게</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 text-xs">
                      <p className="font-medium">🤖 service</p>
                      <p className="text-muted-foreground mt-1">서비스 설명 중심, 미로그인 사용자 대상</p>
                    </div>
                  </div>
                  <div className="mt-2 p-2 rounded bg-muted/20 text-[10px] text-muted-foreground">
                    <p className="font-medium mb-1">기본 프롬프트에 포함된 의도별 지침:</p>
                    <p>• <strong>self_introduction</strong>: 자기소개 + 할 수 있는 일 소개</p>
                    <p>• <strong>casual_chat</strong>: 공감 + 업무 도움 제안</p>
                    <p>• <strong>out_of_scope</strong>: 부드러운 거절 + 대안 제시</p>
                    <p>• 가짜 금액 생성 금지, 데이터 필요 시 연동 안내</p>
                  </div>
                </div>

                {/* 4. 연동 확인 & 응답 */}
                <div className="p-3 rounded-lg border">
                  <p className="text-sm font-medium mb-2">🔗 연동 확인 & 응답 생성</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/30">
                      <code className="font-mono text-[11px]">getMissingDataSources()</code>
                      <p className="text-muted-foreground mt-1">필요 소스(hometax/card/bank/employee) vs 연동 상태 비교 → 미연동 목록 반환</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <code className="font-mono text-[11px]">buildConnectionRequiredResponse()</code>
                      <p className="text-muted-foreground mt-1">voice: 간결한 구어체 안내 / text: 마크다운 상세 안내 + 연동 방법</p>
                    </div>
                  </div>
                </div>

                {/* 5. 에러 처리 */}
                <div className="p-3 rounded-lg border">
                  <p className="text-sm font-medium mb-2">⚠️ 에러 처리</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/30">
                      <code className="font-mono text-[11px]">buildGemini429Message()</code>
                      <p className="text-muted-foreground mt-1">Quota 소진 vs 일시적 Rate Limit 구분. RetryInfo에서 재시도 시간 파싱</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <code className="font-mono text-[11px]">buildOutOfScopeResponse()</code>
                      <p className="text-muted-foreground mt-1">범위 외 질문에 채널별 부드러운 거절 + 대안 제시</p>
                    </div>
                  </div>
                </div>

                {/* 6. 예비 스키마 */}
                <div className="p-3 rounded-lg border border-dashed">
                  <p className="text-sm font-medium mb-2">🔧 의도 분류 Tool Calling 스키마 (예비)</p>
                  <p className="text-xs text-muted-foreground">
                    <code className="font-mono text-[11px]">classifyIntentTool</code> — Gemini Tool Calling용 14개 의도 분류 스키마.
                    현재는 <code className="font-mono text-[11px]">classifyByKeyword()</code> 로컬 매칭을 우선 사용하여 API 호출 절감 중.
                    향후 복잡한 의도 판별이 필요할 때 폴백으로 활용 예정.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {["sales_inquiry", "expense_inquiry", "tax_question", "payroll_inquiry", "employee_management", 
                      "transaction_classify", "daily_briefing", "alert_check", "setting_change", "general_advice", 
                      "service_help", "self_introduction", "casual_chat", "out_of_scope"].map((intent) => (
                      <Badge key={intent} variant="outline" className="text-[10px]">{intent}</Badge>
                    ))}
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* 데이터 플로우 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-cyan-500" />
                데이터 플로우
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">사용자 입력</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">classifyByKeyword()</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">데이터 필요?</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">연동 확인</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">fetchAndFormatData()</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge>Gemini 응답</Badge>
              </div>
              
              <div className="grid md:grid-cols-3 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <p className="text-xs font-medium text-green-600 mb-1">Case 1: 데이터 불필요</p>
                  <p className="text-xs text-muted-foreground">일상 대화, 자기소개 → Gemini 직접 응답</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs font-medium text-blue-600 mb-1">Case 2: 데이터 있음</p>
                  <p className="text-xs text-muted-foreground">DB 조회 → 포맷팅 → Gemini에 주입 → 응답</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-600 mb-1">Case 3: 연동 미완료</p>
                  <p className="text-xs text-muted-foreground">연동 필요 안내 메시지 반환</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 보안 & 기술 스택 */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-green-500" />
                  보안 고려사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• API 키 은닉: Edge Function 경유</li>
                  <li>• JWT 검증: 인증된 사용자만 접근</li>
                  <li>• Rate Limiting: 분당 요청 제한 + 429 처리</li>
                  <li>• 페르소나 안전장치: 업무 범위 강제</li>
                  <li>• Gemini Safety Settings: 4대 카테고리 필터링</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">기술 스택</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>Gemini 2.5 Flash</Badge>
                    <Badge variant="secondary">ElevenLabs Conversational AI (WebRTC)</Badge>
                    <Badge variant="secondary">ElevenLabs Scribe STT (v1 레거시)</Badge>
                    <Badge variant="secondary">ElevenLabs TTS</Badge>
                    <Badge variant="secondary">Edge Functions</Badge>
                    <Badge variant="secondary">Codef API</Badge>
                    <Badge variant="outline">PostgreSQL</Badge>
                  </div>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">API 키 발급</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Gemini API
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://elevenlabs.io/app/developers/api-keys" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        ElevenLabs API
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Twilio Console
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edge Functions 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>Edge Functions 전체 구성</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">함수명</th>
                      <th className="text-left py-2 px-3">역할</th>
                      <th className="text-left py-2 px-3">인증</th>
                      <th className="text-left py-2 px-3">상태</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {/* AI 채팅 */}
                    <tr className="border-b bg-muted/20">
                      <td className="py-2 px-3 font-medium text-foreground" colSpan={4}>💬 AI 채팅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">chat-ai</code></td>
                      <td className="py-2 px-3">메인 AI 채팅 + 6대 데이터 소스 조회</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Optional</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">service-chat</code></td>
                      <td className="py-2 px-3">서비스 안내 챗봇 (비로그인)</td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">Public</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">generate-insights</code></td>
                      <td className="py-2 px-3">AI 인사이트 생성 (리포트)</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                    
                    {/* 음성 */}
                    <tr className="border-b bg-muted/20">
                      <td className="py-2 px-3 font-medium text-foreground" colSpan={4}>🎙️ 음성 엔진</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">elevenlabs-scribe-token</code></td>
                      <td className="py-2 px-3">STT 토큰 발급 (Scribe WebSocket)</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Optional</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">elevenlabs-tts</code></td>
                      <td className="py-2 px-3">텍스트 → 음성 변환</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Optional</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                     <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">elevenlabs-conversation-token</code></td>
                      <td className="py-2 px-3">Conversational AI WebRTC 토큰 발급 (v2.0 음성 핵심)</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Optional</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                    
                    {/* 데이터 연동 */}
                    <tr className="border-b bg-muted/20">
                      <td className="py-2 px-3 font-medium text-foreground" colSpan={4}>🔗 데이터 연동 (Codef 베타)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-auth</code></td>
                      <td className="py-2 px-3">Codef 인증 토큰 발급</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">베타</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-bank</code></td>
                      <td className="py-2 px-3">은행 계좌 거래내역 동기화</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">베타</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-card</code></td>
                      <td className="py-2 px-3">카드사 거래내역 동기화</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">베타</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-hometax</code></td>
                      <td className="py-2 px-3">홈택스 연동 (사업자 확인)</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">베타</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-tax-invoice</code></td>
                      <td className="py-2 px-3">세금계산서 동기화</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">베타</Badge></td>
                    </tr>

                    {/* 동기화 자동화 */}
                    <tr className="border-b bg-muted/20">
                      <td className="py-2 px-3 font-medium text-foreground" colSpan={4}>🔄 동기화 자동화</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">sync-orchestrator</code></td>
                      <td className="py-2 px-3">connector_instances 기반 자동 동기화 (pg_cron 6시간)</td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">Service Role</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>

                    {/* 향후 필요 */}
                    <tr className="border-b bg-muted/20">
                      <td className="py-2 px-3 font-medium text-foreground" colSpan={4}>🔮 향후 연동 필요</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">codef-* (정식 전환)</td>
                      <td className="py-2 px-3 text-muted-foreground">실 ConnectedId 생성 + 실계좌 인증</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">정식 전환</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">hyphen-transfer</td>
                      <td className="py-2 px-3 text-muted-foreground">자동이체 자금 집행 (ARS/OTP 동의)</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">하이픈</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">hyphen-payroll</td>
                      <td className="py-2 px-3 text-muted-foreground">급여 자동 집행</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">하이픈</Badge></td>
                    </tr>

                    {/* 공유 모듈 */}
                    <tr className="bg-muted/20">
                      <td className="py-2 px-3 font-medium text-foreground" colSpan={4}>📦 공유 모듈</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">_shared/response-engine.ts</code></td>
                      <td className="py-2 px-3">의도 분류 스키마, 말투 설정, 시스템 프롬프트, 에러 처리</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Internal</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 구현 로드맵 */}
          <Card>
            <CardHeader>
              <CardTitle>구현 로드맵</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { step: 1, name: "기본 채팅 AI + 6대 데이터 소스", priority: "완료", color: "bg-green-500" },
                  { step: 2, name: "서비스 안내 AI (비로그인)", priority: "완료", color: "bg-green-500" },
                  { step: 3, name: "음성 TTS 엔진", priority: "완료", color: "bg-green-500" },
                  { step: 4, name: "Scribe STT 음성 대화", priority: "완료", color: "bg-green-500" },
                  { step: 5, name: "Codef 데이터 연동 (5종, 베타)", priority: "완료", color: "bg-green-500" },
                  { step: 6, name: "AI 인사이트 리포트", priority: "완료", color: "bg-green-500" },
                  { step: 7, name: "거래 자동 분류기", priority: "완료", color: "bg-green-500" },
                  { step: 8, name: "실데이터 기반 알림 생성기", priority: "완료", color: "bg-green-500" },
                  { step: 9, name: "종합소득세 간이 계산기", priority: "완료", color: "bg-green-500" },
                  { step: 10, name: "직원 평판 관리 (칭찬하기)", priority: "완료", color: "bg-green-500" },
                  { step: 11, name: "동기화 오케스트레이터 (sync-orchestrator)", priority: "완료", color: "bg-green-500" },
                  { step: 12, name: "pg_cron 자동 스케줄링 (6시간 주기)", priority: "완료", color: "bg-green-500" },
                  { step: 13, name: "연동 완료 시 즉시 동기화 트리거", priority: "완료", color: "bg-green-500" },
                  { step: 14, name: "알림 자동 생성 (대시보드 + 동기화)", priority: "완료", color: "bg-green-500" },
                  { step: 15, name: "음성 Persistent Audio + STT 라이프사이클 (v1)", priority: "완료", color: "bg-green-500" },
                  { step: 16, name: "ElevenLabs Conversational AI WebRTC (v2.0 음성)", priority: "완료", color: "bg-green-500" },
                  { step: 17, name: "PC 사이드바 사용자 아바타 반영", priority: "완료", color: "bg-green-500" },
                  { step: 18, name: "Codef 정식 전환 (실 ConnectedId)", priority: "예정", color: "bg-amber-500" },
                  { step: 17, name: "하이픈 연동 (자동이체·급여 집행)", priority: "예정", color: "bg-purple-500" },
                  { step: 18, name: "일일 경영 브리핑", priority: "예정", color: "bg-gray-400" },
                  { step: 19, name: "전화 알림 (Twilio)", priority: "예정", color: "bg-gray-400" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                      {item.step}
                    </div>
                    <span className="flex-1 text-sm">{item.name}</span>
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-xs text-muted-foreground w-14">{item.priority}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>


          {/* API 통합 미구현 현황 */}
          <Card className="border-2 border-dashed border-muted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleDot className="h-5 w-5 text-muted-foreground" />
                API 통합 미구현 현황
                <Badge variant="outline" className="text-xs ml-auto">2026-02-18</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">구현 완료 시 업데이트됩니다.</p>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* 코드에프 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <h3 className="font-semibold">코드에프 (Codef)</h3>
                  <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">베타 운영 중</Badge>
                </div>
                <div className="space-y-2 pl-4">
                  {[
                    {
                      label: "정식 환경 전환",
                      desc: "development.codef.io → api.codef.io (서비스 출시 시 계약 필요)",
                    },
                    {
                      label: "카드 매출 조회",
                      desc: "현재는 카드 지출만 수집. 여신금융협회 API를 통한 POS 매출 데이터 별도 연동 필요",
                    },
                    {
                      label: "홈택스 현금영수증",
                      desc: "현금영수증 발행·수취 내역 endpoint 미구현 (/v1/kr/public/nt/cash-receipt/...)",
                    },
                    {
                      label: "홈택스 공동인증서 로그인",
                      desc: "현재 간편인증(loginType: 0)만 지원. 공동인증서(loginType: 5) 방식 추가 필요",
                    },
                    {
                      label: "실시간 잔액 조회 API",
                      desc: "계좌 잔액을 거래내역에서 추정 중. 별도 잔액 조회 endpoint 호출로 정확도 개선 필요",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">미구현</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 하이픈 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <h3 className="font-semibold">하이픈 (Hyphen)</h3>
                  <Badge className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">구조만 준비됨</Badge>
                </div>
                <div className="space-y-2 pl-4">
                  {[
                    {
                      label: "API 키 발급 및 시크릿 등록",
                      desc: "HYPHEN_CLIENT_ID, HYPHEN_CLIENT_SECRET 미등록. 하이픈 계약 후 Supabase Secrets에 추가 필요",
                    },
                    {
                      label: "hyphen-transfer Edge Function",
                      desc: "자동이체 실행 로직 없음. auto_transfers 테이블에 규칙은 저장되나 실제 이체 미실행",
                    },
                    {
                      label: "전자금융거래 동의 UI (ARS/OTP)",
                      desc: "이체 실행 전 connected_accounts.hyphen_consent_at 기록 필요. 동의 플로우 UI 미구현",
                    },
                    {
                      label: "hyphen-payroll Edge Function",
                      desc: "employees.monthly_salary 데이터와 하이픈 급여 API 연결 없음",
                    },
                    {
                      label: "이체 실행 트리거",
                      desc: "schedule_type(monthly/weekly/on_income)에 따른 실행 로직 없음. pg_cron 또는 수동 트리거 필요",
                    },
                    {
                      label: "auto_transfer_logs 테이블",
                      desc: "이체 실행 이력 기록 테이블 미생성. 성공/실패/금액/실행시간 로그 추적 불가",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <AlertCircle className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">미구현</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 트윌로 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <h3 className="font-semibold">트윌로 (Twilio)</h3>
                  <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/20">미착수</Badge>
                </div>
                <div className="space-y-2 pl-4">
                  {[
                    {
                      label: "API 키 발급 및 시크릿 등록",
                      desc: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER 미등록",
                    },
                    {
                      label: "twilio-call Edge Function",
                      desc: "AI 비서가 전화로 알림·브리핑을 발신하는 핵심 기능. TwiML로 음성 합성 후 발신",
                    },
                    {
                      label: "secretary_phone 인증 플로우",
                      desc: "profiles.secretary_phone_verified가 false인 상태. 실제 전화번호 OTP 인증 후 전환 필요",
                    },
                    {
                      label: "전화 발신 스케줄러",
                      desc: "briefing_frequency/briefing_times 설정값 기반으로 pg_cron이 twilio-call을 트리거하는 구조 미완성",
                    },
                    {
                      label: "발신 이력 로깅",
                      desc: "call_logs 테이블 없음. 발신 결과(연결/부재/실패)·통화 시간·TwiML 내용 기록 미구현",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">미구현</Badge>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground pb-8">
            © 2026 김비서 · 내부 문서
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}

