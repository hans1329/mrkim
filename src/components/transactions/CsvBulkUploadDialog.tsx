import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download, X } from "lucide-react";
import { toast } from "sonner";
import { useBulkAddTransactions, type TransactionInsert } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  source_type: "card" | "bank";
  source_name: string;
  memo: string;
  valid: boolean;
  error?: string;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  });
}

function normalizeDate(raw: string): string | null {
  // YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD, YYYY.MM.DD
  const cleaned = raw.replace(/[./]/g, "-");
  const m1 = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m1) {
    const [, y, mo, d] = m1;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const m2 = raw.match(/^(\d{8})$/);
  if (m2) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return null;
}

function normalizeAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,원₩\s]/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? null : Math.abs(num);
}

function inferType(raw: string, amount: string): "income" | "expense" {
  const lower = raw.toLowerCase();
  if (lower.includes("매출") || lower.includes("income") || lower.includes("입금")) return "income";
  if (lower.includes("지출") || lower.includes("expense") || lower.includes("매입") || lower.includes("출금")) return "expense";
  // 음수면 지출
  const cleaned = amount.replace(/[,원₩\s]/g, "");
  if (cleaned.startsWith("-")) return "expense";
  return "income";
}

const SAMPLE_CSV = `날짜,거래처/내용,금액,유형(매출/지출),결제수단(카드/계좌),카드/은행명,메모
2025-03-01,스타벅스 강남점,4500,지출,카드,신한카드,커피
2025-03-01,네이버페이 매출,150000,매출,계좌,국민은행,
2025-03-02,쿠팡 사무용품,32000,지출,카드,삼성카드,복사지
2025-03-03,현금매출,80000,매출,계좌,,점심장사`;

export function CsvBulkUploadDialog() {
  const [open, setOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [defaultType, setDefaultType] = useState<"income" | "expense">("expense");
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkAdd = useBulkAddTransactions();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file, "UTF-8");
  };

  const processCSV = (text: string) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      toast.error("CSV 파일에 데이터가 없습니다");
      return;
    }

    // Skip header row
    const header = rows[0].map((h) => h.toLowerCase());
    const dateIdx = header.findIndex((h) => h.includes("날짜") || h.includes("date") || h.includes("일자"));
    const descIdx = header.findIndex((h) => h.includes("내용") || h.includes("거래처") || h.includes("description") || h.includes("적요") || h.includes("상호"));
    const amountIdx = header.findIndex((h) => h.includes("금액") || h.includes("amount"));
    const typeIdx = header.findIndex((h) => h.includes("유형") || h.includes("type") || h.includes("구분"));
    const sourceTypeIdx = header.findIndex((h) => h.includes("결제") || h.includes("수단") || h.includes("source"));
    const sourceNameIdx = header.findIndex((h) => h.includes("카드") || h.includes("은행") || h.includes("bank"));
    const memoIdx = header.findIndex((h) => h.includes("메모") || h.includes("memo") || h.includes("비고"));

    if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
      toast.error("필수 열(날짜, 거래처/내용, 금액)을 찾을 수 없습니다");
      return;
    }

    const parsed: ParsedRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.every((c) => !c.trim())) continue;

      const rawDate = row[dateIdx] || "";
      const rawDesc = row[descIdx] || "";
      const rawAmount = row[amountIdx] || "";
      const rawType = typeIdx >= 0 ? row[typeIdx] || "" : "";
      const rawSourceType = sourceTypeIdx >= 0 ? row[sourceTypeIdx] || "" : "";
      const rawSourceName = sourceNameIdx >= 0 ? row[sourceNameIdx] || "" : "";
      const rawMemo = memoIdx >= 0 ? row[memoIdx] || "" : "";

      const date = normalizeDate(rawDate);
      const amount = normalizeAmount(rawAmount);
      const type = rawType ? inferType(rawType, rawAmount) : defaultType;
      const source_type = rawSourceType.includes("계좌") || rawSourceType.toLowerCase().includes("bank") ? "bank" as const : "card" as const;

      let valid = true;
      let error: string | undefined;
      if (!date) { valid = false; error = `잘못된 날짜: ${rawDate}`; }
      else if (!rawDesc.trim()) { valid = false; error = "거래 내용 없음"; }
      else if (amount === null || amount === 0) { valid = false; error = `잘못된 금액: ${rawAmount}`; }

      parsed.push({
        date: date || rawDate,
        description: rawDesc.trim(),
        amount: amount || 0,
        type,
        source_type,
        source_name: rawSourceName,
        memo: rawMemo,
        valid,
        error,
      });
    }

    setParsedRows(parsed);
    if (parsed.length === 0) {
      toast.error("파싱 가능한 데이터가 없습니다");
    }
  };

  const validRows = parsedRows.filter((r) => r.valid);
  const invalidRows = parsedRows.filter((r) => !r.valid);

  const handleUpload = () => {
    if (validRows.length === 0) {
      toast.error("등록할 유효한 거래가 없습니다");
      return;
    }

    const transactions: TransactionInsert[] = validRows.map((r) => ({
      transaction_date: r.date,
      description: r.description,
      amount: r.amount,
      type: r.type,
      source_type: r.source_type,
      source_name: r.source_name || undefined,
      memo: r.memo || undefined,
    }));

    bulkAdd.mutate(transactions, {
      onSuccess: (result) => {
        const msg = result.skipped
          ? `${result.inserted}건 등록, ${result.skipped}건 중복 스킵`
          : `${result.inserted}건의 거래가 등록되었습니다`;
        toast.success(msg);
        setParsedRows([]);
        setFileName("");
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "벌크 등록에 실패했습니다");
      },
    });
  };

  const handleDownloadSample = () => {
    const blob = new Blob(["\uFEFF" + SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "거래내역_샘플.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          CSV 등록
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            CSV 벌크 등록
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {/* 샘플 다운로드 */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 border p-2.5">
            <p className="text-xs text-muted-foreground">샘플 CSV 파일을 참고하세요</p>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={handleDownloadSample}>
              <Download className="h-3 w-3" />
              샘플
            </Button>
          </div>

          {/* 기본 유형 설정 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">유형 열이 없으면:</span>
            <Select value={defaultType} onValueChange={(v: "income" | "expense") => setDefaultType(v)}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">매출</SelectItem>
                <SelectItem value="expense">지출</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 파일 선택 */}
          {!fileName ? (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">CSV 파일을 선택하세요</p>
              <p className="text-xs text-muted-foreground">날짜, 거래처/내용, 금액 열이 필요합니다</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFile}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 border p-2.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium truncate">{fileName}</span>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleReset}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* 파싱 결과 미리보기 */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  유효 {validRows.length}건
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    오류 {invalidRows.length}건
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[240px] rounded-lg border">
                <div className="p-1">
                  {parsedRows.map((row, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs",
                        !row.valid && "bg-destructive/5"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground shrink-0">{row.date}</span>
                          <span className="font-medium truncate">{row.description}</span>
                        </div>
                        {row.error && (
                          <p className="text-destructive text-[10px] mt-0.5">{row.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={cn(
                          "text-[10px] h-4 px-1",
                          row.type === "income" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"
                        )}>
                          {row.type === "income" ? "매출" : "지출"}
                        </Badge>
                        <span className={cn(
                          "font-semibold",
                          row.type === "income" ? "text-green-600" : "text-destructive"
                        )}>
                          {row.type === "income" ? "+" : "-"}{row.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* 등록 버튼 */}
        {validRows.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={bulkAdd.isPending}
            className="w-full h-11 mt-2"
          >
            {bulkAdd.isPending ? "등록 중..." : `${validRows.length}건 일괄 등록`}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
