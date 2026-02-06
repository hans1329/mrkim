-- Insert loan_card_visible setting
INSERT INTO public.site_settings (key, value, description)
VALUES (
  'loan_card_visible',
  '{"enabled": false}'::jsonb,
  '자금관리 페이지의 "급할 때 빌리기" 카드 노출 여부'
);