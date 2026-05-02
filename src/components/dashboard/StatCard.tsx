import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning";
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
};

const iconVariantStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-foreground/20 text-primary-foreground",
  success: "bg-success-foreground/20 text-success-foreground",
  warning: "bg-warning-foreground/20 text-warning-foreground",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden transition-shadow", variantStyles[variant])}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            iconVariantStyles[variant]
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className={cn(
              "text-[11px] font-medium truncate",
              variant === "default" ? "text-muted-foreground" : "opacity-80"
            )}>
              {title}
            </p>
            <p className="text-sm font-bold leading-tight">{value}</p>
            {(subtitle || trend) && (
              <div className="flex items-center gap-1">
                {trend && (
                  <span className={cn(
                    "text-[10px] font-semibold",
                    variant === "default" 
                      ? (trend.isPositive ? "text-success" : "text-destructive")
                      : "text-current opacity-90"
                  )}>
                    {trend.isPositive ? "↑" : "↓"}{trend.value}%
                  </span>
                )}
                {subtitle && (
                  <span className={cn(
                    "text-[10px] truncate",
                    variant === "default" ? "text-muted-foreground" : "opacity-70"
                  )}>
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
