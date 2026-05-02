import { useLayoutConfig } from "@/contexts/LayoutContext";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import {
  MessageCircleQuestion,
  FileText,
  Mail,
  ChevronRight,
  BookOpen,
  Shield,
} from "lucide-react";

const helpItems = [
  { title: "자주 묻는 질문", description: "FAQ 모음", url: "#faq", icon: MessageCircleQuestion },
  { title: "사용 가이드", description: "김비서 사용법 안내", url: "#guide", icon: BookOpen },
  { title: "이용약관", description: "서비스 이용약관", url: "/terms", icon: FileText },
  { title: "개인정보처리방침", description: "개인정보 보호 정책", url: "/privacy", icon: Shield },
  { title: "문의하기", description: "고객센터 연락", url: "#contact", icon: Mail },
];

export default function Help() {
  const { setConfig } = useLayoutConfig();

  useEffect(() => {
    setConfig({ title: "도움말", showBackButton: true });
  }, [setConfig]);

  return (
    <div className="space-y-4 p-4 md:p-0">
      <Card>
        <CardContent className="divide-y p-0">
          {helpItems.map((item) => {
            const isExternal = item.url.startsWith("#");
            const Wrapper = isExternal ? "div" : NavLink;
            const wrapperProps = isExternal ? {} : { to: item.url };

            return (
              <Wrapper
                key={item.title}
                {...(wrapperProps as any)}
                className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Wrapper>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">김비서 v1.0.0</p>
            <p className="text-xs text-muted-foreground">© 2026 김비서. All rights reserved.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
