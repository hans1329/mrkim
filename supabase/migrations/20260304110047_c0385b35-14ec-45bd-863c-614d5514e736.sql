-- 오늘 CSV로 업로드된 대량 데이터 삭제 (user_id: 4a9be5d8 기준 39,846건)
-- synced_at IS NULL = 동기화 데이터가 아닌 수동/CSV 데이터
DELETE FROM public.transactions 
WHERE user_id = '4a9be5d8-8377-4a93-9b37-478b22db7f80'
  AND created_at::date = '2026-03-04'
  AND synced_at IS NULL 
  AND external_tx_id IS NULL;