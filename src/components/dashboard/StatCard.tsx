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
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-md", variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn(
              "text-sm font-medium",
              variant === "default" ? "text-muted-foreground" : "opacity-80"
            )}>
              {title}
            </p>
            <p className="text-2xl font-bold">{value}</p>
            {(subtitle || trend) && (
              <div className="flex items-center gap-2">
                {trend && (
                  <span className={cn(
                    "text-xs font-medium",
                    trend.isPositive ? "text-success" : "text-destructive",
                    variant !== "default" && "opacity-90"
                  )}>
                    {trend.isPositive ? "+" : ""}{trend.value}%
                  </span>
                )}
                {subtitle && (
                  <span className={cn(
                    "text-xs",
                    variant === "default" ? "text-muted-foreground" : "opacity-70"
                  )}>
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            iconVariantStyles[variant]
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
