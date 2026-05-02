-- 특정 사용자의 계좌 연결 상태 초기화
UPDATE profiles 
SET account_connected = false, account_connected_at = null 
WHERE user_id = '49fdf82b-d03a-4bb9-802f-d4042232be47';