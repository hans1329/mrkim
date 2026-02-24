import { ArrowLeft, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useBrowserLanguage, LANG_LABELS, type SupportedLang } from "@/hooks/useBrowserLanguage";
import { termsTranslations } from "@/data/termsTranslations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TermsOfService() {
  const navigate = useNavigate();
  const { lang, setLang } = useBrowserLanguage();
  const t = termsTranslations[lang];

  return (
    <div className="fixed inset-0 overflow-y-auto bg-background z-50">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t.pageTitle}</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Globe className="h-4 w-4" />
                <span className="text-xs">{LANG_LABELS[lang]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(LANG_LABELS) as SupportedLang[]).map((l) => (
                <DropdownMenuItem key={l} onClick={() => setLang(l)} className={lang === l ? "bg-accent" : ""}>
                  {LANG_LABELS[l]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <p className="text-muted-foreground text-sm">{t.effectiveDate}</p>
          </section>

          {t.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold border-b pb-2">{section.title}</h2>
              {section.content && <p>{section.content}</p>}
              {section.list && (
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  {section.list.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              )}
              {section.orderedList && (
                <ol className="list-decimal pl-5 space-y-2">
                  {section.orderedList.map((item, j) => {
                    if (typeof item === "string") {
                      return <li key={j}>{item}</li>;
                    }
                    return (
                      <li key={j}>
                        {item.text}
                        {item.subList && (
                          <ul className="list-disc pl-5 mt-2 space-y-1">
                            {item.subList.map((sub, k) => <li key={k}>{sub}</li>)}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          ))}

          <section className="mt-12 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-4">{lang === "ko" ? "회사 정보" : lang === "ja" ? "会社情報" : lang === "zh" ? "公司信息" : lang === "vi" ? "Thông tin công ty" : "Company Information"}</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>{lang === "ko" ? "상호" : lang === "ja" ? "商号" : lang === "zh" ? "公司名称" : lang === "vi" ? "Tên công ty" : "Company"}:</strong> 주식회사 더김비서</p>
              <p><strong>{lang === "ko" ? "대표자" : lang === "ja" ? "代表者" : lang === "zh" ? "代表" : lang === "vi" ? "Đại diện" : "CEO"}:</strong> 송하진</p>
              <p><strong>{lang === "ko" ? "사업자등록번호" : lang === "ja" ? "事業者登録番号" : lang === "zh" ? "营业执照号" : lang === "vi" ? "Số ĐKKD" : "Business Reg. No."}:</strong> 166-88-03509</p>
              <p><strong>{lang === "ko" ? "소재지" : lang === "ja" ? "所在地" : lang === "zh" ? "地址" : lang === "vi" ? "Địa chỉ" : "Address"}:</strong> 서울특별시 서초구 강남대로 311, 702호(서초동, 한화생명보험빌딩)</p>
              <p><strong>{lang === "ko" ? "업태" : lang === "ja" ? "業態" : lang === "zh" ? "行业" : lang === "vi" ? "Ngành nghề" : "Industry"}:</strong> 정보통신업, 전자상거래업</p>
              <p><strong>{lang === "ko" ? "이메일" : "Email"}:</strong> hajin@thenexa.io</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
