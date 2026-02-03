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
  Headphones
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
              <p className="text-muted-foreground text-sm">v1.1 · 2025-02-03 업데이트</p>
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

          {/* 응답 채널 구성 - 신규 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                응답 채널 구성
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                동일한 AI 엔진을 기반으로, 채널에 맞는 응답 형식을 제공합니다.
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
                    <p>• 상세한 정보 제공</p>
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
                    <p>• <strong>ElevenLabs</strong> Conversational AI</p>
                    <p>• 실시간 음성 대화</p>
                    <p>• 짧고 명확한 응답</p>
                    <p>• TTS/STT 통합</p>
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
                  <Badge variant="secondary">공통 의도 분류</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">채널별 응답 포맷</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge>출력</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 음성 엔진 상세 - 신규 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-purple-500" />
                음성 응답 엔진
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* 실시간 대화 */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Mic className="h-5 w-5 text-purple-500" />
                    <h4 className="font-semibold">실시간 음성 대화</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    ElevenLabs Conversational AI를 통한 양방향 실시간 대화
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">프로토콜</span>
                      <Badge variant="outline" className="text-xs">WebRTC</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Edge Function</span>
                      <code className="text-xs bg-muted px-1 rounded">elevenlabs-conversation-token</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">언어</span>
                      <span>한국어 (ko)</span>
                    </div>
                  </div>
                </div>

                {/* TTS */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Volume2 className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold">텍스트 → 음성 (TTS)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    텍스트 응답을 자연스러운 음성으로 변환
                  </p>
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

          {/* 핵심 모듈 */}
          <Card>
            <CardHeader>
              <CardTitle>AI 엔진 핵심 모듈 구성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* 의도 분류기 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">1. 의도 분류기 (Intent Classifier)</h3>
                </div>
                <p className="text-sm text-muted-foreground">사용자 입력이 업무 범위 내인지 판단</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-xs font-medium text-green-600 mb-2">✓ 업무 범위</p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• 매출/지출 현황 조회</li>
                      <li>• 세금 관련 질문</li>
                      <li>• 급여/인사 관리</li>
                      <li>• 경영 브리핑</li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-xs font-medium text-red-600 mb-2">✗ 범위 외 → 거절</p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• 불법/위험 요청</li>
                      <li>• 개인적인 상담</li>
                      <li>• 부적절한 콘텐츠</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 overflow-x-auto">
                  <p className="text-xs font-medium mb-3">Tool Calling 스키마: classify_intent</p>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
{`{
  intent: "sales_inquiry" | "expense_inquiry" | "tax_question" 
        | "payroll_inquiry" | "employee_management" 
        | "transaction_classify" | "daily_briefing" 
        | "alert_check" | "setting_change" 
        | "self_introduction" | "casual_chat" | "out_of_scope",
  
  confidence: 0.0 ~ 1.0,
  
  requires_data: boolean,
  
  data_sources: ["card", "bank", "hometax", "employee", "none"],
  
  time_period: {
    type: "today" | "week" | "month" | "quarter" | "year" | "custom",
    start_date?: "YYYY-MM-DD",
    end_date?: "YYYY-MM-DD"
  },
  
  rejection_reason?: string  // out_of_scope일 경우
}`}
                  </pre>
                </div>

                <div className="overflow-x-auto mt-4">
                  <p className="text-xs font-medium mb-2">의도별 매핑 예시</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">사용자 입력</th>
                        <th className="text-left py-2 px-2">intent</th>
                        <th className="text-left py-2 px-2">data_sources</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-1.5 px-2">"오늘 매출 얼마야?"</td><td className="py-1.5 px-2">sales_inquiry</td><td className="py-1.5 px-2">card, bank</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"부가세 얼마 내야해?"</td><td className="py-1.5 px-2">tax_question</td><td className="py-1.5 px-2">hometax, card</td></tr>
                      <tr className="border-b"><td className="py-1.5 px-2">"넌 누구야?"</td><td className="py-1.5 px-2">self_introduction</td><td className="py-1.5 px-2">none</td></tr>
                      <tr><td className="py-1.5 px-2">"심심해"</td><td className="py-1.5 px-2">casual_chat</td><td className="py-1.5 px-2">none</td></tr>
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
                </div>
                <p className="text-sm text-muted-foreground">긴급도별 할 일 자동 생성</p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="destructive">🔴 세금 신고 마감 D-7일</Badge>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">🟡 미수금 30일 초과</Badge>
                  <Badge variant="secondary">🟢 급여일 D-3일</Badge>
                </div>
              </div>

              <Separator />

              {/* 대화 에이전트 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-teal-500" />
                  <h3 className="font-semibold">4. 일일 브리핑 (Daily Briefing)</h3>
                </div>
                <p className="text-sm text-muted-foreground">매일 아침 경영 현황 요약 제공</p>
              </div>
            </CardContent>
          </Card>

          {/* 데이터 플로우 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-500" />
                데이터 플로우
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">사용자 입력</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">의도 분류</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">데이터 필요?</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">연동 확인</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">API 조회</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge>AI 응답</Badge>
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                * 미연동 상태 → 시뮬레이션 데이터 + 연동 권유 메시지
              </p>
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
                  <li>• Rate Limiting: 분당 요청 제한</li>
                  <li>• 페르소나 안전장치: 업무 범위 강제</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">기술 스택</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>Gemini API</Badge>
                  <Badge variant="secondary">ElevenLabs</Badge>
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
              <CardTitle>Edge Functions 구성</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">함수명</th>
                      <th className="text-left py-2 px-3">역할</th>
                      <th className="text-left py-2 px-3">인증</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">chat-ai</code></td>
                      <td className="py-2 px-3">메인 AI 채팅 (로그인 사용자)</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Optional</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">service-chat</code></td>
                      <td className="py-2 px-3">서비스 안내 챗봇</td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">Public</Badge></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">elevenlabs-conversation-token</code></td>
                      <td className="py-2 px-3">음성 대화 토큰 발급</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Optional</Badge></td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3"><code className="text-xs bg-muted px-1 rounded">elevenlabs-tts</code></td>
                      <td className="py-2 px-3">텍스트 → 음성 변환</td>
                      <td className="py-2 px-3"><Badge variant="outline" className="text-xs">Optional</Badge></td>
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
                  { step: 1, name: "기본 채팅 AI", priority: "완료", color: "bg-green-500" },
                  { step: 2, name: "서비스 안내 AI", priority: "완료", color: "bg-green-500" },
                  { step: 3, name: "음성 TTS 엔진", priority: "완료", color: "bg-green-500" },
                  { step: 4, name: "실시간 음성 대화", priority: "진행중", color: "bg-yellow-500" },
                  { step: 5, name: "거래 분류기", priority: "예정", color: "bg-gray-400" },
                  { step: 6, name: "알림 생성기", priority: "예정", color: "bg-gray-400" },
                  { step: 7, name: "전화 알림 (Twilio)", priority: "예정", color: "bg-gray-400" },
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
