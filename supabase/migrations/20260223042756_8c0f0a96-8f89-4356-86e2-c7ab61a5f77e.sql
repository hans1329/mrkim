-- 기존 UNIQUE(user_id, connector_id) 제약 제거하여 같은 connector_id로 여러 인스턴스 허용
ALTER TABLE public.connector_instances DROP CONSTRAINT IF EXISTS connector_instances_user_id_connector_id_key;

-- 새로운 유니크 제약: 같은 user가 같은 connector_id + connected_id 조합은 중복 불가
-- connected_id가 NULL인 경우도 허용하기 위해 partial unique index 사용
CREATE UNIQUE INDEX IF NOT EXISTS uq_connector_instance_user_connector_connected 
ON public.connector_instances (user_id, connector_id, connected_id) 
WHERE connected_id IS NOT NULL;