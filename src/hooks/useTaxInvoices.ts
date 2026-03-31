import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { toast } from "sonner";

interface TaxInvoice {
  id: string;
  invoice_type: "sales" | "purchase";
  invoice_date: string;
  supplier_name: string | null;
  supplier_business_number: string | null;
  buyer_name: string | null;
  buyer_business_number: string | null;
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  item_name: string | null;
}

interface SyncStatus {
  last_sync_at: string | null;
  sync_status: string;
  sales_count: number;
  purchase_count: number;
  total_sales_amount: number;
  total_purchase_amount: number;
}

interface UseTaxInvoicesReturn {
  invoices: TaxInvoice[];
  syncStatus: SyncStatus | null;
  loading: boolean;
  syncing: boolean;
  syncTaxInvoices: () => Promise<void>;
  refetch: () => Promise<void>;
  salesTotal: number;
  purchaseTotal: number;
  vatPayable: number;
  hasConnectedId: boolean;
}

export function useTaxInvoices(): UseTaxInvoicesReturn {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hasConnectedId, setHasConnectedId] = useState(false);
  const { profile } = useProfile();

  const fetchInvoices = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 세금계산서 조회
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("tax_invoices")
        .select("*")
        .order("invoice_date", { ascending: false });

      if (invoiceError) throw invoiceError;
      setInvoices((invoiceData as TaxInvoice[]) || []);

      // 동기화 상태 조회
      const { data: statusData, error: statusError } = await supabase
        .from("hometax_sync_status")
        .select("*")
        .single();

      if (!statusError && statusData) {
        setSyncStatus(statusData as SyncStatus);
      }
    } catch (error) {
      console.error("Error fetching tax invoices:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncTaxInvoices = useCallback(async () => {
    if (!profile?.business_registration_number) {
      toast.error("사업자등록번호가 등록되어 있지 않습니다.");
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("codef-tax-invoice", {
        body: {
          action: "all",
          businessNumber: profile.business_registration_number,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`세금계산서 동기화 완료! 매출 ${data.data.salesCount}건, 매입 ${data.data.purchaseCount}건`);
        await fetchInvoices();
      } else {
        toast.error(data.error || "동기화에 실패했습니다.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("세금계산서 동기화 중 오류가 발생했습니다.");
    } finally {
      setSyncing(false);
    }
  }, [profile?.business_registration_number, fetchInvoices]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // 계산된 값들
  const salesTotal = invoices
    .filter(inv => inv.invoice_type === "sales")
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  const purchaseTotal = invoices
    .filter(inv => inv.invoice_type === "purchase")
    .reduce((sum, inv) => sum + inv.total_amount, 0);

  // 부가세 예상 납부액 (매출세액 - 매입세액)
  const salesTax = invoices
    .filter(inv => inv.invoice_type === "sales")
    .reduce((sum, inv) => sum + inv.tax_amount, 0);

  const purchaseTax = invoices
    .filter(inv => inv.invoice_type === "purchase")
    .reduce((sum, inv) => sum + inv.tax_amount, 0);

  const vatPayable = salesTax - purchaseTax;

  return {
    invoices,
    syncStatus,
    loading,
    syncing,
    syncTaxInvoices,
    refetch: fetchInvoices,
    salesTotal,
    purchaseTotal,
    vatPayable,
  };
}
