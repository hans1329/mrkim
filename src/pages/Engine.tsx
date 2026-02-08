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
  Share2
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
              <p className="text-muted-foreground text-sm">v1.3 · 2025-02-08 업데이트</p>
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
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-full bg-purple-500/10">
                      <Headphones className="h-4 w-4 text-purple-500" />
                    </div>
                    <h4 className="font-semibold">음성 채널</h4>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• <strong>Scribe STT</strong> → chat-ai → <strong>TTS</strong></p>
                    <p>• 실시간 음성 대화</p>
                    <p>• voiceMode 구어체 응답</p>
                    <p>• 텍스트 채팅과 로직 일관성</p>
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
                음성 응답 엔진
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ElevenLabs Conversational AI 대신 <strong>Scribe STT → chat-ai → TTS 파이프라인</strong>을 채택한 이유:
                <code className="text-xs bg-muted px-1 rounded ml-1">chat-ai</code> 내에서 실시간 DB 데이터(6대 소스)에 직접 접근하고,
                텍스트 채팅과 완벽한 로직 일관성을 유지하기 위함.
              </p>

              {/* 3단계 파이프라인 */}
              <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <p className="text-xs font-medium mb-3">🎙️ 음성 대화 파이프라인</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-purple-500/10">🎤 Scribe STT</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">chat-ai (Gemini)</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="bg-blue-500/10">🔊 ElevenLabs TTS</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  voiceMode=true → 구어체 2~3문장, 마크다운/이모지 제거, 숫자 한글 표현
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* STT */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Mic className="h-5 w-5 text-purple-500" />
                    <h4 className="font-semibold text-sm">1단계: STT</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">엔진</span>
                      <Badge variant="outline" className="text-xs">ElevenLabs Scribe</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">프로토콜</span>
                      <span>WebSocket</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Edge Function</span>
                      <code className="text-xs bg-muted px-1 rounded">elevenlabs-scribe-token</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">언어</span>
                      <span>한국어 (ko)</span>
                    </div>
                  </div>
                </div>

                {/* AI 처리 */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold text-sm">2단계: AI 처리</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">엔진</span>
                      <Badge variant="outline" className="text-xs">Gemini 2.0 Flash</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Edge Function</span>
                      <code className="text-xs bg-muted px-1 rounded">chat-ai</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">voiceMode</span>
                      <span>true (구어체)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">데이터</span>
                      <span>6대 소스 조회</span>
                    </div>
                  </div>
                </div>

                {/* TTS */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Volume2 className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold text-sm">3단계: TTS</h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">모델</span>
                      <Badge variant="outline" className="text-xs">eleven_multilingual_v2</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Edge Function</span>
                      <code className="text-xs bg-muted px-1 rounded">elevenlabs-tts</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">포맷</span>
                      <span>MP3 44.1kHz</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">전처리</span>
                      <span>cleanForTTS()</span>
                    </div>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { icon: <Receipt className="h-4 w-4" />, name: "거래내역", table: "transactions", source: "card/bank", keywords: "매출, 지출, 결제, 비용" },
                  { icon: <FileText className="h-4 w-4" />, name: "세금계산서", table: "tax_invoices", source: "hometax", keywords: "부가세, 계산서, 세금" },
                  { icon: <Users className="h-4 w-4" />, name: "직원/급여", table: "employees", source: "내부", keywords: "급여, 월급, 직원, 인건비" },
                  { icon: <Wallet className="h-4 w-4" />, name: "예치금", table: "deposits", source: "내부", keywords: "예치금, 비상금, 적립" },
                  { icon: <PiggyBank className="h-4 w-4" />, name: "저축/투자", table: "savings_accounts", source: "내부", keywords: "적금, 예금, 이자, 투자" },
                  { icon: <ArrowLeftRight className="h-4 w-4" />, name: "자동이체", table: "auto_transfers", source: "내부", keywords: "자동이체, 이체 규칙" },
                ].map((item) => (
                  <div key={item.table} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      {item.icon}
                      <span className="font-semibold text-sm">{item.name}</span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>테이블: <code className="bg-muted px-1 rounded">{item.table}</code></p>
                      <p>연동: {item.source}</p>
                      <p className="text-[10px]">키워드: {item.keywords}</p>
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
                  <p className="text-xs font-medium mb-2">의도별 매핑 예시</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">사용자 입력</th>
                        <th className="text-left py-2 px-2">dataSource</th>
                        <th className="text-left py-2 px-2">연동 필요</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-1.5 px-2">"오늘 매출 얼마야?"</td><td className="py-1.5 px-2">transaction</td><td className="py-1.5 px-2">card/bank</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"부가세 얼마 내야해?"</td><td className="py-1.5 px-2">tax_invoice</td><td className="py-1.5 px-2">hometax</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"직원 급여 현황"</td><td className="py-1.5 px-2">employee</td><td className="py-1.5 px-2">없음 (내부)</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"자동이체 설정 보여줘"</td><td className="py-1.5 px-2">auto_transfer</td><td className="py-1.5 px-2">없음 (내부)</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"적금 이자 얼마야?"</td><td className="py-1.5 px-2">savings</td><td className="py-1.5 px-2">없음 (내부)</td></tr>
                      <tr><td className="py-1.5 px-2">"넌 누구야?"</td><td className="py-1.5 px-2">—</td><td className="py-1.5 px-2">—</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              {/* 거래 분류기 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold">2. 거래 자동 분류기 (Transaction Classifier)</h3>
                  <Badge variant="outline" className="text-xs">예정</Badge>
                </div>
                <p className="text-sm text-muted-foreground">상호명 패턴으로 비용 카테고리 자동 분류</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">상호명 패턴</th>
                        <th className="text-left py-2 px-3">카테고리</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-2 px-3">스타벅스, 이디야</td><td className="py-2 px-3">복리후생비</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">카카오택시, 타다</td><td className="py-2 px-3">여비교통비</td></tr>
                      <tr className="border-b"><td className="py-2 px-3">11번가, 쿠팡</td><td className="py-2 px-3">소모품비</td></tr>
                      <tr><td className="py-2 px-3">식당, 레스토랑</td><td className="py-2 px-3">접대비/복리후생비</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              {/* 알림 생성기 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold">3. 알림 생성기 (Alert Generator)</h3>
                  <Badge variant="outline" className="text-xs">예정</Badge>
                </div>
                <p className="text-sm text-muted-foreground">긴급도별 할 일 자동 생성</p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="destructive">🔴 세금 신고 마감 D-7일</Badge>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">🟡 미수금 30일 초과</Badge>
                  <Badge variant="secondary">🟢 급여일 D-3일</Badge>
                </div>
              </div>

              <Separator />

              {/* 일일 브리핑 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-teal-500" />
                  <h3 className="font-semibold">4. 일일 브리핑 (Daily Briefing)</h3>
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
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { label: "의도 분류 스키마", desc: "classifyIntentTool (Tool Calling 용 예비)" },
                  { label: "말투 설정", desc: "toneInstructions: polite / friendly / cute" },
                  { label: "시스템 프롬프트", desc: "buildSystemPrompt(context) - 채널별 분기" },
                  { label: "연동 확인", desc: "getMissingDataSources() + 안내 응답 생성" },
                  { label: "범위 외 응답", desc: "buildOutOfScopeResponse() - 채널별 분기" },
                  { label: "429 에러 처리", desc: "buildGemini429Message() - Quota/Rate Limit" },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-muted/30 border">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                ))}
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
                  <li className="text-destructive">• ⚠️ Lovable AI Gateway 사용 금지</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">기술 스택</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>Gemini 2.0 Flash</Badge>
                  <Badge variant="secondary">ElevenLabs Scribe</Badge>
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
                      <td className="py-2 px-3">Conversational AI 토큰 (미사용, 예비)</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Optional</Badge></td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">예비</Badge></td>
                    </tr>
                    
                    {/* 데이터 연동 */}
                    <tr className="border-b bg-muted/20">
                      <td className="py-2 px-3 font-medium text-foreground" colSpan={4}>🔗 데이터 연동 (Codef)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-auth</code></td>
                      <td className="py-2 px-3">Codef 인증 토큰 발급</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-bank</code></td>
                      <td className="py-2 px-3">은행 계좌 거래내역 동기화</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-card</code></td>
                      <td className="py-2 px-3">카드사 거래내역 동기화</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-hometax</code></td>
                      <td className="py-2 px-3">홈택스 연동 (사업자 확인)</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">codef-tax-invoice</code></td>
                      <td className="py-2 px-3">세금계산서 동기화</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Required</Badge></td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700">완료</Badge></td>
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
                  { step: 5, name: "Codef 데이터 연동 (5종)", priority: "완료", color: "bg-green-500" },
                  { step: 6, name: "AI 인사이트 리포트", priority: "완료", color: "bg-green-500" },
                  { step: 7, name: "거래 자동 분류기", priority: "예정", color: "bg-gray-400" },
                  { step: 8, name: "알림 생성기 (자동 스케줄)", priority: "예정", color: "bg-gray-400" },
                  { step: 9, name: "일일 경영 브리핑", priority: "예정", color: "bg-gray-400" },
                  { step: 10, name: "전화 알림 (Twilio)", priority: "예정", color: "bg-gray-400" },
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

          <p className="text-center text-xs text-muted-foreground pb-8">
            © 2025 김비서 · 내부 문서
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
