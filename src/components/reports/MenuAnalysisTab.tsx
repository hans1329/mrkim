import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { UtensilsCrossed, TrendingUp, Star, Crown, ArrowUpRight, ArrowDownRight, Flame } from "lucide-react";
import { formatCurrency } from "@/data/mockData";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export function MenuAnalysisTab() {
  const [platform, setPlatform] = useState<string>("all");

  // 메뉴 데이터 조회
  const { data: menus, isLoading: isLoadingMenus } = useQuery({
    queryKey: ["delivery-menus", platform],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let query = supabase
        .from("delivery_menus")
        .select("*")
        .eq("user_id", user.id);
      if (platform !== "all") query = query.eq("platform", platform);
      const { data, error } = await query.order("order_count", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // 주문 데이터 조회 (메뉴별 매출 분석용)
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["delivery-orders-for-menu", platform],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let query = supabase
        .from("delivery_orders")
        .select("order_no, order_name, total_amt, order_dt, platform, detail_list")
        .eq("user_id", user.id);
      if (platform !== "all") query = query.eq("platform", platform);
      const { data, error } = await query.order("order_dt", { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // 리뷰 데이터 조회 (메뉴 평점)
  const { data: reviews, isLoading: isLoadingReviews } = useQuery({
    queryKey: ["delivery-reviews-for-menu", platform],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let query = supabase
        .from("delivery_reviews")
        .select("review_id, rating, menu_names, review_date")
        .eq("user_id", user.id);
      if (platform !== "all") query = query.eq("platform", platform);
      const { data, error } = await query.order("review_date", { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = isLoadingMenus || isLoadingOrders || isLoadingReviews;

  // 메뉴별 주문 횟수 및 매출 집계 (detail_list 기반)
  const menuSalesData = useMemo(() => {
    if (!orders) return [];
    const menuMap = new Map<string, { name: string; count: number; revenue: number }>();

    for (const order of orders) {
      const details = order.detail_list as any[] || [];
      if (details.length > 0) {
        for (const item of details) {
          const menuName = item.menuName || item.name || item.itemName;
          if (!menuName) continue;
          const existing = menuMap.get(menuName) || { name: menuName, count: 0, revenue: 0 };
          existing.count += parseInt(item.qty || item.quantity || "1", 10);
          existing.revenue += parseInt(item.amount || item.price || "0", 10) * parseInt(item.qty || item.quantity || "1", 10);
          menuMap.set(menuName, existing);
        }
      } else if (order.order_name) {
        // detail_list 없으면 order_name 기반
        const existing = menuMap.get(order.order_name) || { name: order.order_name, count: 0, revenue: 0 };
        existing.count += 1;
        existing.revenue += Number(order.total_amt || 0);
        menuMap.set(order.order_name, existing);
      }
    }

    return Array.from(menuMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  // 메뉴별 평점 집계
  const menuRatings = useMemo(() => {
    if (!reviews) return new Map<string, { total: number; count: number }>();
    const ratingMap = new Map<string, { total: number; count: number }>();

    for (const review of reviews) {
      if (!review.rating || !review.menu_names) continue;
      for (const menuName of (review.menu_names as string[])) {
        const existing = ratingMap.get(menuName) || { total: 0, count: 0 };
        existing.total += Number(review.rating);
        existing.count += 1;
        ratingMap.set(menuName, existing);
      }
    }
    return ratingMap;
  }, [reviews]);

  // 인기 메뉴 Top 10 (주문 횟수 기준)
  const top10ByCount = useMemo(() => {
    return [...menuSalesData].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [menuSalesData]);

  // 매출 Top 10
  const top10ByRevenue = useMemo(() => {
    return menuSalesData.slice(0, 10);
  }, [menuSalesData]);

  // 파이 차트 데이터 (매출 비중 Top 5 + 기타)
  const pieData = useMemo(() => {
    if (menuSalesData.length === 0) return [];
    const totalRevenue = menuSalesData.reduce((sum, m) => sum + m.revenue, 0);
    const top5 = menuSalesData.slice(0, 5);
    const othersRevenue = totalRevenue - top5.reduce((sum, m) => sum + m.revenue, 0);
    const result = top5.map((m) => ({
      name: m.name.length > 8 ? m.name.slice(0, 8) + "…" : m.name,
      value: m.revenue,
      percent: totalRevenue > 0 ? Math.round((m.revenue / totalRevenue) * 100) : 0,
    }));
    if (othersRevenue > 0) {
      result.push({
        name: "기타",
        value: othersRevenue,
        percent: totalRevenue > 0 ? Math.round((othersRevenue / totalRevenue) * 100) : 0,
      });
    }
    return result;
  }, [menuSalesData]);

  // 메뉴 DB 기반 정보 (delivery_menus 테이블)
  const menuDbInfo = useMemo(() => {
    if (!menus) return [];
    return menus.map((m: any) => ({
      name: m.menu_name,
      group: m.menu_group || "미분류",
      price: Number(m.price || 0),
      status: m.status,
      orderCount: Number(m.order_count || 0),
    }));
  }, [menus]);

  const totalMenuCount = menus?.length || 0;
  const totalOrderCount = menuSalesData.reduce((sum, m) => sum + m.count, 0);
  const totalRevenue = menuSalesData.reduce((sum, m) => sum + m.revenue, 0);
  const avgOrderValue = totalOrderCount > 0 ? Math.round(totalRevenue / totalOrderCount) : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const hasData = menuSalesData.length > 0 || totalMenuCount > 0;

  return (
    <div className="space-y-4">
      {/* 플랫폼 필터 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          메뉴 분석
        </h3>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="baemin">배달의민족</SelectItem>
            <SelectItem value="coupangeats">쿠팡이츠</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              배달앱을 연동하면 메뉴별 매출을 분석할 수 있어요
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">등록 메뉴</span>
                </div>
                <p className="text-xl font-bold">{totalMenuCount}개</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-accent/5 to-accent/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-accent-foreground" />
                  <span className="text-xs text-muted-foreground">총 주문수</span>
                </div>
                <p className="text-xl font-bold">{totalOrderCount.toLocaleString()}건</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">메뉴 매출</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">평균 객단가</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(avgOrderValue)}</p>
              </CardContent>
            </Card>
          </div>

          {/* 매출 비중 파이차트 */}
          {pieData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">메뉴별 매출 비중</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} ${percent}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 인기 메뉴 TOP 10 (주문수) */}
          {top10ByCount.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  인기 메뉴 TOP 10
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2">
                <ResponsiveContainer width="100%" height={top10ByCount.length * 36 + 20}>
                  <BarChart data={top10ByCount} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v.length > 6 ? v.slice(0, 6) + "…" : v}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}건`, "주문수"]}
                      labelFormatter={(label) => `메뉴: ${label}`}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* 매출 TOP 10 */}
          {top10ByRevenue.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  매출 TOP 10
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="divide-y">
                  {top10ByRevenue.map((menu, idx) => {
                    const rating = menuRatings.get(menu.name);
                    const avgRating = rating ? (rating.total / rating.count).toFixed(1) : null;
                    return (
                      <div key={menu.name} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            idx < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{menu.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{menu.count}건</span>
                              {avgRating && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  {avgRating}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-semibold shrink-0">
                          {formatCurrency(menu.revenue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 메뉴 그룹별 현황 */}
          {menuDbInfo.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">메뉴 카테고리별 현황</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {(() => {
                  const groups = new Map<string, { count: number; avgPrice: number; totalPrice: number }>();
                  for (const m of menuDbInfo) {
                    const g = groups.get(m.group) || { count: 0, avgPrice: 0, totalPrice: 0 };
                    g.count++;
                    g.totalPrice += m.price;
                    groups.set(m.group, g);
                  }
                  const groupArr = Array.from(groups.entries())
                    .map(([name, g]) => ({ name, count: g.count, avgPrice: Math.round(g.totalPrice / g.count) }))
                    .sort((a, b) => b.count - a.count);

                  return (
                    <div className="divide-y">
                      {groupArr.map((g) => (
                        <div key={g.name} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{g.name}</Badge>
                            <span className="text-xs text-muted-foreground">{g.count}개 메뉴</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            평균 {formatCurrency(g.avgPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
