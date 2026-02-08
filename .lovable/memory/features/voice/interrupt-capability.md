# Memory: features/voice/interrupt-capability
Updated: 2026-02-08

TTS 재생 중 Scribe가 스피커 출력을 마이크로 되먹임(echo)하여 사용자 발화로 오인식하는 문제가 발생하여, TTS 재생 중에는 Scribe의 확정 텍스트(Committed Transcript)를 **전부 무시**하도록 변경함. `currentAudioRef.current`가 존재하면(= TTS 재생 중이면) 해당 텍스트를 처리하지 않고 로그만 남긴다. TTS가 끝나면 자동으로 listening 모드로 전환되어 다음 사용자 발화를 대기한다. 인터럽트(Barge-in) 기능은 에코 문제 해결 전까지 비활성화 상태.
