-- 음성 미리듣기용 오디오 파일 저장 버킷
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-previews', 'voice-previews', true)
ON CONFLICT (id) DO NOTHING;

-- 누구나 읽기 가능
CREATE POLICY "Anyone can read voice previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-previews');

-- 서비스 역할만 업로드 가능 (Edge Function에서 service_role_key 사용)
CREATE POLICY "Service role can upload voice previews"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-previews');

CREATE POLICY "Service role can update voice previews"
ON storage.objects FOR UPDATE
USING (bucket_id = 'voice-previews');

CREATE POLICY "Service role can delete voice previews"
ON storage.objects FOR DELETE
USING (bucket_id = 'voice-previews');