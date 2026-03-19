import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Receipt, CreditCard, Users as UsersIcon, Truck } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Props {
  userId: string;
  onBack: () => void;
}

export function AccountantClientDetail({ userId, onBack }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [profileRes, txRes, invRes, empRes, delRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("transactions").select("*").eq("user_id", userId).order("transaction_date", { ascending: false }).limit(100),
        supabase.from("tax_invoices").select("*").eq("user_id", userId).order("invoice_date", { ascending: false }).limit(100),
        supabase.from("employees").select("*").eq("user_id", userId).eq("status", "재직"),
        supabase.from("delivery_orders").select("*").eq("user_id", userId).order("order_dt", { ascending: false }).limit(50),
      ]);

      setProfile(profileRes.data);
      setTransactions(txRes.data || []);
      setInvoices(invRes.data || []);
      setEmployees(empRes.data || []);
      setDeliveryOrders(delRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const salesInvoices = invoices.filter(i => i.invoice_type === "매출");
  const purchaseInvoices = invoices.filter(i => i.invoice_type === "매입");

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> 고객 목록
      </Button>

      {/* Business info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {profile?.business_name || profile?.name || "사업자 정보"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">업종</span>
            <p className="font-medium">{profile?.business_type || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">사업자번호</span>
            <p className="font-medium">{profile?.business_registration_number || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">연락처</span>
            <p className="font-medium">{profile?.phone || "-"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">급여일</span>
            <p className="font-medium">{profile?.salary_day ? `매월 ${profile.salary_day}일` : "-"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">매출 (거래)</p>
            <p className="text-lg font-bold text-blue-600">
              {totalIncome.toLocaleString()}원
            </p>
            <p className="text-xs text-muted-foreground mt-1">{transactions.filter(t => t.type === "income").length}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">매입 (거래)</p>
            <p className="text-lg font-bold text-red-500">
              {totalExpense.toLocaleString()}원
            </p>
            <p className="text-xs text-muted-foreground mt-1">{transactions.filter(t => t.type === "expense").length}건</p>
          </CardContent>
        </Card>
      </div>

      {/* Tax invoices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> 세금계산서
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <p className="text-xs text-muted-foreground">매출</p>
              <p className="text-sm font-bold">{salesInvoices.length}건</p>
              <p className="text-xs">{salesInvoices.reduce((s, i) => s + i.total_amount, 0).toLocaleString()}원</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              <p className="text-xs text-muted-foreground">매입</p>
              <p className="text-sm font-bold">{purchaseInvoices.length}건</p>
              <p className="text-xs">{purchaseInvoices.reduce((s, i) => s + i.total_amount, 0).toLocaleString()}원</p>
            </div>
          </div>
          {invoices.length > 0 && (
            <div className="max-h-48 overflow-auto space-y-1">
              {invoices.slice(0, 10).map(inv => (
                <div key={inv.id} className="flex items-center justify-between text-xs p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.invoice_type === "매출" ? "default" : "secondary"} className="text-[10px]">
                      {inv.invoice_type}
                    </Badge>
                    <span className="truncate max-w-[120px]">{inv.item_name || inv.buyer_name || inv.supplier_name || "-"}</span>
                  </div>
                  <span className="font-medium">{inv.total_amount?.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employees */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UsersIcon className="h-4 w-4" /> 직원 현황
            <Badge variant="secondary" className="ml-auto">{employees.length}명</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 직원이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between text-sm p-2 rounded border">
                  <div>
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{emp.employee_type}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {emp.monthly_salary ? `${(emp.monthly_salary / 10000).toFixed(0)}만원` : emp.hourly_rate ? `시급 ${emp.hourly_rate.toLocaleString()}원` : "-"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery orders */}
      {deliveryOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> 배달앱 주문
              <Badge variant="secondary" className="ml-auto">{deliveryOrders.length}건</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">총 주문액</p>
                <p className="text-sm font-bold">
                  {deliveryOrders.reduce((s, o) => s + (o.total_amt || 0), 0).toLocaleString()}원
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">정산액</p>
                <p className="text-sm font-bold">
                  {deliveryOrders.reduce((s, o) => s + (o.settle_amt || 0), 0).toLocaleString()}원
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
