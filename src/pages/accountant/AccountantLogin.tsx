import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";

export default function AccountantLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Verify this user is a tax accountant (user_id → email fallback + auto-link)
      let { data: accountant } = await supabase
        .from("tax_accountants")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!accountant && authData.user.email) {
        const { data: emailMatch } = await supabase
          .from("tax_accountants")
          .select("id")
          .eq("email", authData.user.email)
          .is("user_id", null)
          .maybeSingle();

        if (emailMatch) {
          await supabase
            .from("tax_accountants")
            .update({ user_id: authData.user.id })
            .eq("id", emailMatch.id);
          accountant = emailMatch;
        }
      }

      if (!accountant) {
        await supabase.auth.signOut();
        toast.error("세무사 계정이 아닙니다. 회원가입을 먼저 진행해주세요.");
        return;
      }

      toast.success("로그인 성공!");
      navigate("/accountant", { replace: true });
    } catch (error: any) {
      const msg = error?.message?.includes("Invalid login")
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : "로그인에 실패했습니다.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">김비서 파트너</CardTitle>
          <CardDescription>
            김비서 파트너 전용 로그인
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accountant@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              아직 계정이 없으신가요?{" "}
              <Link to="/accountant/signup" className="text-primary font-medium hover:underline">
                회원가입
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
