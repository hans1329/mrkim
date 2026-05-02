-- 기존 너무 허용적인 정책 제거 후 service_role만 쓰기 가능하도록 재생성
DROP POLICY IF EXISTS "Service role can upload voice previews" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update voice previews" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete voice previews" ON storage.objects;

-- service_role은 RLS를 우회하므로 별도 정책 불필요. 일반 사용자 쓰기 차단.