-- 비서 아바타 저장을 위한 스토리지 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('secretary-avatars', 'secretary-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 스토리지 RLS 정책: 누구나 조회 가능
CREATE POLICY "Secretary avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'secretary-avatars');

-- 스토리지 RLS 정책: 인증된 사용자는 자신의 폴더에 업로드 가능
CREATE POLICY "Users can upload their own secretary avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'secretary-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 스토리지 RLS 정책: 인증된 사용자는 자신의 파일 수정 가능
CREATE POLICY "Users can update their own secretary avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'secretary-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 스토리지 RLS 정책: 인증된 사용자는 자신의 파일 삭제 가능
CREATE POLICY "Users can delete their own secretary avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'secretary-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- profiles 테이블에 비서 아바타 URL 컬럼 추가
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS secretary_avatar_url TEXT;