-- 기존 해외 결제 데이터의 currency를 USD로 업데이트
-- 영문 가맹점명 + 소액(10000원 미만)인 경우 USD로 판별
UPDATE public.transactions
SET currency = 'USD'
WHERE currency = 'KRW'
  AND amount < 10000
  AND description ~ '^[A-Za-z0-9\.\s\(\)\-\_]+$'
  AND description !~ '배달|카페|편의점|마트|주유|약국|병원|식당|치킨|피자|커피|택시|버스|지하철|주차|세탁|미용|은행|보험|통신|전기|가스|수도|관리비|임대|월세|KCP|NHN|네이버|카카오|토스|쿠팡|배민|요기요';