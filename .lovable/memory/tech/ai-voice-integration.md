# Memory: tech/ai-voice-integration
Updated: 2026-02-12

## ElevenLabs Conversational AI 아키텍처 (2026-02-12 전환)

이전의 단일 엔진 파이프라인(Scribe STT → Gemini → ElevenLabs TTS)을 폐기하고, ElevenLabs Conversational AI 모델로 전환함.

### 이전 구조 (폐기)
사용자 음성 → ElevenLabs Scribe(STT) → chat-ai(Gemini) → elevenlabs-tts(TTS) → 스피커
- 문제: 볼륨/음질 불일치, 에코(자가 중단), 2~3초 지연

### 현재 구조 (Conversational AI)
사용자 음성 → ElevenLabs Agent (내장 STT/TTS) ←→ Client Tool `query_business` → chat-ai(Gemini)
- 장점: 실시간 대화(<1초), 볼륨/음질 일관성, 에코 캔슬링 내장
- 트레이드오프: ElevenLabs Agent가 자체 판단할 수 있음 (프롬프트로 제어)

### 기술 스택
- **STT/TTS**: ElevenLabs Conversational AI (내장, @elevenlabs/react useConversation)
- **AI 데이터 조회**: chat-ai Edge Function (Gemini) via Client Tool
- **인증**: elevenlabs-conversation-token Edge Function (WebRTC 토큰)
- **Hook**: `useVoiceAgent.ts` (useConversation 기반)

### 제거된 컴포넌트
- ElevenLabs Scribe (STT) - 더 이상 사용 안 함
- elevenlabs-tts Edge Function - 더 이상 음성 대화에서 사용 안 함
- elevenlabs-scribe-token Edge Function - 더 이상 사용 안 함
