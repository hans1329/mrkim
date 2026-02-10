import { cn } from "@/lib/utils";

interface VisStat {
  label: string;
  value: number;
  format: "currency" | "count" | "percent";
  color?: string;
}

interface VisChartItem {
  label: string;
  value: number;
}

export interface VisualizationData {
  stats: VisStat[];
  chart?: {
    type: "bar";
    data: VisChartItem[];
    title: string;
  };
}

const colorMap: Record<string, { bg: string; text: string; bar: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500" },
  red: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", bar: "bg-red-500" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500" },
};

const defaultColor = { bg: "bg-primary/10", text: "text-primary", bar: "bg-primary" };

function formatValue(value: number, format: string): string {
  if (format === "currency") {
    if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(1)}억원`;
    if (Math.abs(value) >= 10000) return `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`;
    return `${value.toLocaleString("ko-KR")}원`;
  }
  if (format === "percent") return `${value}%`;
  if (format === "count") return `${value.toLocaleString("ko-KR")}`;
  return String(value);
}

/** 채팅 메시지 내 데이터 시각화 (라이트 테마) */
export function DataVisualization({ data }: { data: VisualizationData }) {
  const maxChartValue = data.chart ? Math.max(...data.chart.data.map((d) => d.value), 1) : 1;

  return (
    <div className="mt-2 space-y-2 animate-fade-in">
      {/* 숫자 카드 */}
      <div className="grid grid-cols-2 gap-1.5">
        {data.stats.map((stat) => {
          const c = colorMap[stat.color || ""] || defaultColor;
          return (
            <div key={stat.label} className={cn("rounded-lg px-2.5 py-2", c.bg)}>
              <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
              <p className={cn("text-sm font-bold tabular-nums", c.text)}>
                {formatValue(stat.value, stat.format)}
              </p>
            </div>
          );
        })}
      </div>

      {/* 바 차트 */}
      {data.chart && data.chart.data.length > 0 && (
        <div className="rounded-lg bg-muted/40 p-2.5">
          <p className="text-[10px] text-muted-foreground mb-1.5">{data.chart.title}</p>
          <div className="space-y-1">
            {data.chart.data.map((item, i) => {
              const barColors = ["bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-fuchsia-500"];
              return (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-12 truncate text-right">{item.label}</span>
                  <div className="flex-1 h-3.5 bg-muted rounded-sm overflow-hidden">
                    <div
                      className={cn("h-full rounded-sm transition-all duration-500", barColors[i % barColors.length])}
                      style={{ width: `${Math.max((item.value / maxChartValue) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium tabular-nums w-14 text-right">
                    {formatValue(item.value, "currency")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** 음성 오버레이용 시각화 (다크/투명 테마) */
export function VoiceDataVisualization({ data }: { data: VisualizationData }) {
  const maxChartValue = data.chart ? Math.max(...data.chart.data.map((d) => d.value), 1) : 1;

  return (
    <div className="mt-3 w-full max-w-sm space-y-2 animate-fade-in">
      {/* 숫자 카드 */}
      <div className="grid grid-cols-2 gap-1.5">
        {data.stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-white/15 backdrop-blur-sm px-2.5 py-2">
            <p className="text-[10px] text-white/60 truncate">{stat.label}</p>
            <p className="text-sm font-bold text-white tabular-nums">
              {formatValue(stat.value, stat.format)}
            </p>
          </div>
        ))}
      </div>

      {/* 바 차트 */}
      {data.chart && data.chart.data.length > 0 && (
        <div className="rounded-lg bg-white/10 backdrop-blur-sm p-2.5">
          <p className="text-[10px] text-white/60 mb-1.5">{data.chart.title}</p>
          <div className="space-y-1">
            {data.chart.data.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/70 w-12 truncate text-right">{item.label}</span>
                <div className="flex-1 h-3 bg-white/10 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-white/60 rounded-sm transition-all duration-500"
                    style={{ width: `${Math.max((item.value / maxChartValue) * 100, 2)}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/80 font-medium tabular-nums w-14 text-right">
                  {formatValue(item.value, "currency")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
