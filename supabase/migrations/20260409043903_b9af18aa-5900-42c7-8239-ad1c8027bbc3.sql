-- 기존 USD 거래: amount(달러 원금) → local_amount로 이동, amount에 원화 환산 금액 저장
UPDATE public.transactions
SET 
  local_amount = amount,
  amount = amount * 1450
WHERE currency = 'USD'
  AND (local_amount IS NULL OR local_amount = 0)
  AND amount < 10000;