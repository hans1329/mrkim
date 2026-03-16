-- profiles 테이블에 자기 프로필 삭제 정책 추가
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- hometax_sync_status 테이블에 자기 데이터 삭제 정책 추가
CREATE POLICY "Users can delete their own sync status"
ON public.hometax_sync_status
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);