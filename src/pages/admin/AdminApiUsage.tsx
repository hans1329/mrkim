import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Activity, Cpu, Phone, Volume2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface ApiUsageLog {
  id: string;
  service: string;
  user_id: string | null;
  endpoint: string | null;
  tokens_input: number;
  tokens_output: number;
  duration_ms: number | null;
  cost_estimate: number;
  created_at: string;
}

interface ServiceStats {
  service: string;
  total_calls: number;
  total_tokens: number;
  total_cost: number;
  avg_duration: number;
}

const SERVICE_LABELS: Record<string, string> = {
  gemini: "Gemini AI",
  elevenlabs: "ElevenLabs",
  twilio: "Twilio",
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  gemini: <Cpu className="w-5 h-5" />,
  elevenlabs: <Volume2 className="w-5 h-5" />,
  twilio: <Phone className="w-5 h-5" />,
};

const SERVICE_COLORS: Record<string, string> = {
  gemini: "hsl(217, 91%, 60%)",
  elevenlabs: "hsl(142, 76%, 36%)",
  twilio: "hsl(0, 84%, 60%)",
};

export default function AdminApiUsage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [logs, setLogs] = useState<ApiUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [selectedService, setSelectedService] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const daysMap: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30 };
      const days = daysMap[period] || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from("api_usage_logs")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (selectedService !== "all") {
        query = query.eq("service", selectedService);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching API usage:", error);
      toast.error("API 사용량을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, period, selectedService]);

  // Calculate stats
  const getServiceStats = (): ServiceStats[] => {
    const stats: Record<string, ServiceStats> = {};
    
    logs.forEach((log) => {
      if (!stats[log.service]) {
        stats[log.service] = {
          service: log.service,
          total_calls: 0,
          total_tokens: 0,
          total_cost: 0,
          avg_duration: 0,
        };
      }
      stats[log.service].total_calls += 1;
      stats[log.service].total_tokens += (log.tokens_input || 0) + (log.tokens_output || 0);
      stats[log.service].total_cost += log.cost_estimate || 0;
      stats[log.service].avg_duration += log.duration_ms || 0;
    });

    return Object.values(stats).map((s) => ({
      ...s,
      avg_duration: s.total_calls > 0 ? Math.round(s.avg_duration / s.total_calls) : 0,
    }));
  };

  // Daily usage chart data
  const getDailyUsage = () => {
    const daily: Record<string, Record<string, number>> = {};
    
    logs.forEach((log) => {
      const date = new Date(log.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
      if (!daily[date]) {
        daily[date] = { gemini: 0, elevenlabs: 0, twilio: 0 };
      }
      daily[date][log.service] = (daily[date][log.service] || 0) + 1;
    });

    return Object.entries(daily)
      .map(([date, services]) => ({ date, ...services }))
      .reverse();
  };

  const serviceStats = getServiceStats();
  const dailyData = getDailyUsage();
  const totalCost = serviceStats.reduce((sum, s) => sum + s.total_cost, 0);
  const totalCalls = serviceStats.reduce((sum, s) => sum + s.total_calls, 0);

  const pieData = serviceStats.map((s) => ({
    name: SERVICE_LABELS[s.service],
    value: s.total_calls,
    color: SERVICE_COLORS[s.service],
  }));

  if (authLoading) {
    return <AdminLayout title="API 사용량" loading><div /></AdminLayout>;
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout title="API 사용량">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">오늘</SelectItem>
              <SelectItem value="7d">최근 7일</SelectItem>
              <SelectItem value="30d">최근 30일</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 서비스</SelectItem>
              <SelectItem value="gemini">Gemini AI</SelectItem>
              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
                  )}
                  <p className="text-xs text-muted-foreground">총 API 호출</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {serviceStats.map((stat) => (
            <Card key={stat.service}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <div style={{ color: SERVICE_COLORS[stat.service] }}>
                    {SERVICE_ICONS[stat.service]}
                  </div>
                  <div>
                    {loading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-2xl font-bold">{stat.total_calls.toLocaleString()}</div>
                    )}
                    <p className="text-xs text-muted-foreground">{SERVICE_LABELS[stat.service]}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">일별 API 호출</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : dailyData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="gemini" name="Gemini" fill={SERVICE_COLORS.gemini} stackId="a" />
                    <Bar dataKey="elevenlabs" name="ElevenLabs" fill={SERVICE_COLORS.elevenlabs} stackId="a" />
                    <Bar dataKey="twilio" name="Twilio" fill={SERVICE_COLORS.twilio} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Service Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">서비스별 비율</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : pieData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Service Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">서비스별 상세</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>서비스</TableHead>
                    <TableHead className="text-right">총 호출</TableHead>
                    <TableHead className="text-right">총 토큰</TableHead>
                    <TableHead className="text-right">평균 응답시간</TableHead>
                    <TableHead className="text-right">예상 비용</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        데이터가 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    serviceStats.map((stat) => (
                      <TableRow key={stat.service}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div style={{ color: SERVICE_COLORS[stat.service] }}>
                              {SERVICE_ICONS[stat.service]}
                            </div>
                            {SERVICE_LABELS[stat.service]}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {stat.total_calls.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {stat.total_tokens.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {stat.avg_duration.toLocaleString()}ms
                        </TableCell>
                        <TableCell className="text-right">
                          ${stat.total_cost.toFixed(4)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 호출 로그</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시간</TableHead>
                    <TableHead>서비스</TableHead>
                    <TableHead>엔드포인트</TableHead>
                    <TableHead className="text-right">토큰 (입/출)</TableHead>
                    <TableHead className="text-right">응답시간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 10).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleTimeString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: SERVICE_COLORS[log.service] }}>
                          {SERVICE_LABELS[log.service]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {log.endpoint || "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.tokens_input || 0} / {log.tokens_output || 0}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {log.duration_ms ? `${log.duration_ms}ms` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
