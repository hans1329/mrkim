-- 사이트 설정을 저장할 테이블 생성
CREATE TABLE public.site_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 누구나 읽을 수 있음 (공개 설정)
CREATE POLICY "Anyone can read site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- 관리자만 수정 가능
CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 타임스탬프 자동 업데이트 트리거
CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 기본 설정 삽입: 앱 다운로드 섹션 표시 여부
INSERT INTO public.site_settings (key, value, description)
VALUES ('show_app_download', '{"enabled": true}'::jsonb, '인트로 페이지 앱 다운로드 섹션 표시 여부');