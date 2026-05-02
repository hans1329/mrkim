
-- 배달앱 리뷰 테이블
CREATE TABLE public.delivery_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'baemin',
  store_id text,
  review_id text,
  order_no text,
  rating numeric,
  review_content text,
  reply_content text,
  review_date text,
  reviewer_name text,
  menu_names text[],
  tags text[],
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, review_id)
);
ALTER TABLE public.delivery_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reviews" ON public.delivery_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 배달앱 통계 테이블
CREATE TABLE public.delivery_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'baemin',
  store_id text,
  stat_date text NOT NULL,
  stat_type text NOT NULL DEFAULT 'daily',
  total_sales bigint DEFAULT 0,
  order_count integer DEFAULT 0,
  avg_order_amount bigint DEFAULT 0,
  new_customer_count integer DEFAULT 0,
  revisit_customer_count integer DEFAULT 0,
  cancel_count integer DEFAULT 0,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, store_id, stat_date, stat_type)
);
ALTER TABLE public.delivery_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own statistics" ON public.delivery_statistics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 배달앱 광고 테이블
CREATE TABLE public.delivery_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'baemin',
  store_id text,
  ad_id text,
  ad_type text,
  ad_name text,
  status text,
  start_date text,
  end_date text,
  budget bigint DEFAULT 0,
  spent bigint DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  orders_from_ad integer DEFAULT 0,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, ad_id)
);
ALTER TABLE public.delivery_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own ads" ON public.delivery_ads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 배달앱 메뉴 테이블
CREATE TABLE public.delivery_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'baemin',
  store_id text,
  menu_id text,
  menu_name text NOT NULL,
  menu_group text,
  price bigint DEFAULT 0,
  status text,
  description text,
  image_url text,
  order_count integer DEFAULT 0,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, store_id, menu_id)
);
ALTER TABLE public.delivery_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own menus" ON public.delivery_menus FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 배달앱 PG매출 테이블
CREATE TABLE public.delivery_pg_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'baemin',
  store_id text,
  pg_date text NOT NULL,
  pg_type text,
  card_company text,
  approval_no text,
  sales_amount bigint DEFAULT 0,
  fee_amount bigint DEFAULT 0,
  net_amount bigint DEFAULT 0,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, approval_no)
);
ALTER TABLE public.delivery_pg_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own pg sales" ON public.delivery_pg_sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 배달앱 인근매출 테이블
CREATE TABLE public.delivery_nearby_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'baemin',
  store_id text,
  stat_date text NOT NULL,
  region1 text,
  region2 text,
  category text,
  avg_sales bigint DEFAULT 0,
  avg_order_count integer DEFAULT 0,
  my_rank integer,
  total_stores integer,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, store_id, stat_date, region1, region2)
);
ALTER TABLE public.delivery_nearby_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own nearby sales" ON public.delivery_nearby_sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
