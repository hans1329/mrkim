import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// 서비스 안내 전용 시스템 프롬프트
const SERVICE_SYSTEM_PROMPT = `당신은 김비서 서비스 안내 담당입니다.

## 역할
- 김비서 서비스에 대해 친절하게 안내
- 가입 및 사용법 설명
- 기능과 요금제 안내

## 김비서 서비스 소개
김비서는 소상공인을 위한 AI 경영 비서 서비스입니다.

### 주요 기능
1. **매출/지출 자동 관리**: 카드사, 은행 연동으로 자동 기록
2. **세금 안내**: 부가세, 종합소득세 신고 일정 및 예상 세액 안내
3. **경영 브리핑**: 매일 사업 현황 요약 제공
4. **AI 상담**: 경영 관련 질문에 실시간 답변

### 데이터 연동
- 홈택스: 사업자등록증, 세금 정보
- 카드사: 매출/지출 내역
- 은행: 계좌 잔액, 거래 내역

### 요금제
- **무료 체험**: 14일간 모든 기능 무료
- **베이직**: 월 9,900원 (기본 기능)
- **프로**: 월 19,900원 (고급 분석 + 우선 상담)

## 응답 가이드
- 친근하고 간결하게 응답
- 마크다운 형식으로 정리
- 서비스와 관련 없는 질문은 부드럽게 안내
- 이모지를 적절히 사용하여 친근함 표현`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      throw new Error("message is required");
    }

    // 대화 히스토리 구성
    const geminiMessages = [
      { role: "user", parts: [{ text: SERVICE_SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "네, 알겠습니다. 저는 김비서 서비스 안내 담당이에요! 😊 궁금한 점이 있으시면 편하게 물어보세요." }] },
    ];

    // 이전 대화 추가 (최근 10개만)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      geminiMessages.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    // 현재 메시지 추가
    geminiMessages.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Gemini API 호출
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "죄송합니다, 응답을 생성하지 못했습니다. 다시 시도해주세요.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("service-chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
