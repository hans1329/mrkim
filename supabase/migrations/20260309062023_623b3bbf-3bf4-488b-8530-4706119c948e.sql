
-- 배달앱 가맹점(매장) 테이블
CREATE TABLE public.delivery_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'coupangeats',
  store_id text NOT NULL,
  store_name text NOT NULL,
  biz_no text,
  status text,
  rep_name text,
  tel_no text,
  addr text,
  addr_detail text,
  deposit_account text,
  deposit_bank text,
  refund_account text,
  refund_bank text,
  store_notice text,
  country_origin text,
  main_category text[],
  sub_category text[],
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, store_id)
);

ALTER TABLE public.delivery_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery stores" ON public.delivery_stores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own delivery stores" ON public.delivery_stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own delivery stores" ON public.delivery_stores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own delivery stores" ON public.delivery_stores FOR DELETE USING (auth.uid() = user_id);

-- 배달앱 주문 테이블
CREATE TABLE public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'coupangeats',
  store_id text,
  order_no text NOT NULL,
  order_div text,
  order_dt text,
  order_tm text,
  settle_dt text,
  order_name text,
  delivery_type text,
  total_amt bigint DEFAULT 0,
  discnt_amt bigint DEFAULT 0,
  order_fee bigint DEFAULT 0,
  card_fee bigint DEFAULT 0,
  delivery_amt bigint DEFAULT 0,
  add_tax bigint DEFAULT 0,
  ad_fee bigint DEFAULT 0,
  mfd_discount_amount bigint DEFAULT 0,
  settle_amt bigint DEFAULT 0,
  detail_list jsonb DEFAULT '[]'::jsonb,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, order_no)
);

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery orders" ON public.delivery_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own delivery orders" ON public.delivery_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own delivery orders" ON public.delivery_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own delivery orders" ON public.delivery_orders FOR DELETE USING (auth.uid() = user_id);

-- 배달앱 정산 테이블
CREATE TABLE public.delivery_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'coupangeats',
  store_id text,
  biz_no text,
  cal_date text NOT NULL,
  settlement_amt bigint DEFAULT 0,
  balance bigint DEFAULT 0,
  settlement_details jsonb DEFAULT '{}'::jsonb,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, store_id, cal_date)
);

ALTER TABLE public.delivery_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery settlements" ON public.delivery_settlements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own delivery settlements" ON public.delivery_settlements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own delivery settlements" ON public.delivery_settlements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own delivery settlements" ON public.delivery_settlements FOR DELETE USING (auth.uid() = user_id);

-- connectors 테이블에 쿠팡이츠 커넥터 추가
INSERT INTO public.connectors (id, name, description, category, provider, icon, is_active, display_order)
VALUES ('hyphen_coupangeats', '쿠팡이츠', '쿠팡이츠 매출/정산 데이터 연동', 'delivery', 'hyphen', 'UtensilsCrossed', true, 40);
