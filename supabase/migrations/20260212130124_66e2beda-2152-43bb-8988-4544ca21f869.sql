-- 중복 거래 삭제 (각 그룹에서 가장 오래된 것만 유지)
DELETE FROM transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY user_id, transaction_date, amount, description, source_type 
      ORDER BY created_at ASC
    ) as rn
    FROM transactions
  ) sub
  WHERE rn > 1
)