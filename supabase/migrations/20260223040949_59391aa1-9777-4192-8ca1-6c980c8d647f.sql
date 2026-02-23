-- 기존 카드 연동 인스턴스에 카드사 기관코드 추가 (신한카드 0306)
UPDATE connector_instances 
SET credentials_meta = jsonb_build_object('card_company_id', 'shinhan', 'organization_code', '0306')
WHERE connector_id = 'codef_card_usage' 
AND (credentials_meta IS NULL OR credentials_meta = '{}'::jsonb);