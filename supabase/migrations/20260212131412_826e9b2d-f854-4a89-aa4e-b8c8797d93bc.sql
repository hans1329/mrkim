-- "은행 거래"라는 모호한 설명의 입금을 미분류입금(transfer_in)으로 재분류
UPDATE transactions
SET type = 'transfer_in',
    category = '미분류입금',
    category_icon = '❓',
    classification_confidence = 'low',
    synced_at = now()
WHERE source_type = 'bank'
  AND type = 'income'
  AND description = '은행 거래'
  AND (is_manually_classified IS NULL OR is_manually_classified = false)