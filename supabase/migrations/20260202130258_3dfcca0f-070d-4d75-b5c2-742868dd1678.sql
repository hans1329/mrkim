-- 1@1.com 사용자에게 admin 권한 부여
INSERT INTO public.user_roles (user_id, role) 
VALUES ('12593f61-33ec-4a8c-8a3b-5c314f977b48', 'admin') 
ON CONFLICT (user_id, role) DO NOTHING;