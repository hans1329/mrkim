# Memory: tech/ai-voice-integration
Updated: 2026-02-06

## 단일 엔진 아키텍처 (2026-02-06 전환)

이전의 ElevenLabs Conversational AI(이중 AI) 구조를 폐기하고, 단일 엔진 파이프라인으로 전환함.

### 이전 구조 (폐기)
사용자 음성 → ElevenLabs AI(자체 판단) → Client Tool → chat-ai(Gemini) → ElevenLabs TTS
- 문제: AI가 두 개 돌아감. ElevenLabs가 "잠시만요" 등 자체 판단, 도구 설명/프롬프트 이중 관리

### 현재 구조 (단일 엔진)
사용자 음성 → Web Speech API(STT) → chat-ai(Gemini) → ElevenLabs TTS → 스피커
- 장점: Gemini 엔진 하나만 판단, 일관된 응답, 프롬프트 관리 단일화
- 트레이드오프: 실시간 대화 대신 턴 기반 응답 (2~3초 대기)

### 기술 스택
- **STT**: Web Speech API (브라우저 내장, 무료)
- **AI**: chat-ai Edge Function (Gemini 2.0 Flash)
- **TTS**: elevenlabs-tts Edge Function (ElevenLabs multilingual_v2)
- **Hook**: `useVoiceAgent.ts` (이전 `useElevenLabsConversation.ts` 대체)

### 음성 설정
- 성별/말투에 따라 ElevenLabs 음성 ID 자동 선택 (elevenlabs-tts에서 처리)
- 마크다운/이모지 제거 후 TTS 전달
- TTS 완료 후 자동으로 다시 듣기 시작 (연속 대화)
