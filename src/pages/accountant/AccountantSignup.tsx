import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Briefcase, Check, X } from "lucide-react";

const PASSWORD_RULES = [
  { key: "length", label: "8자 이상", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "대문자 포함", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "소문자 포함", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "숫자 포함", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "특수문자 포함", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function AccountantSignup() {
  const [step, setStep] = useState<"form" | "done">("form");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Profile fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [firmName, setFirmName] = useState("");
  const [region, setRegion] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [industryTypes, setIndustryTypes] = useState("");
  const [bio, setBio] = useState("");

  const allRulesPass = PASSWORD_RULES.every(r => r.test(password));
  const passwordsMatch = password === passwordConfirm;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPass) {
      toast.error("비밀번호 조건을 모두 충족해주세요.");
      return;
    }
    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/accountant/login",
          data: { name },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast.error("이미 등록된 이메일입니다.");
        } else {
          toast.error(authError.message);
        }
        return;
      }

      if (!authData.user) {
        toast.error("회원가입에 실패했습니다.");
        return;
      }

      // 2. Create tax_accountants record linked to the auth user
      const { error: insertError } = await supabase
        .from("tax_accountants")
        .insert({
          user_id: authData.user.id,
          name,
          email,
          phone: phone || null,
          firm_name: firmName || null,
          region: region || null,
          specialties: specialties ? specialties.split(",").map(s => s.trim()).filter(Boolean) : [],
          industry_types: industryTypes ? industryTypes.split(",").map(s => s.trim()).filter(Boolean) : [],
          bio: bio || null,
          is_active: true,
        });

      if (insertError) {
        console.error("Failed to create accountant record:", insertError);
        toast.error("세무사 정보 등록에 실패했습니다. 관리자에게 문의해주세요.");
        return;
      }

      setStep("done");
      toast.success("회원가입이 완료되었습니다!");
    } catch (error: any) {
      toast.error("회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">가입 완료!</CardTitle>
            <CardDescription>
              이메일 인증 후 로그인해주세요. 인증 메일이 발송되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/accountant/login")}>
              로그인 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">파트너 회원가입</CardTitle>
          <CardDescription>
            김비서 파트너에 가입하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Required fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">이메일 *</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="accountant@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">비밀번호 *</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
              />
              {password && (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {PASSWORD_RULES.map(rule => (
                    <div key={rule.key} className="flex items-center gap-1.5 text-xs">
                      {rule.test(password) ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-destructive" />
                      )}
                      <span className={rule.test(password) ? "text-green-600" : "text-muted-foreground"}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional profile fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firmName">사무소명</Label>
                <Input
                  id="firmName"
                  value={firmName}
                  onChange={e => setFirmName(e.target.value)}
                  placeholder="홍길동 세무회계사무소"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region">지역</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  placeholder="서울 강남구"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialties">전문 분야</Label>
                <Input
                  id="specialties"
                  value={specialties}
                  onChange={e => setSpecialties(e.target.value)}
                  placeholder="부가세, 종합소득세, 법인세"
                />
                <p className="text-[10px] text-muted-foreground">쉼표로 구분</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industryTypes">전문 업종</Label>
              <Input
                id="industryTypes"
                value={industryTypes}
                onChange={e => setIndustryTypes(e.target.value)}
                placeholder="음식점, 소매업, IT"
              />
              <p className="text-[10px] text-muted-foreground">쉼표로 구분</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">자기소개</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="간단한 자기소개를 입력해주세요"
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !allRulesPass}>
              {loading ? "가입 처리 중..." : "회원가입"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link to="/accountant/login" className="text-primary font-medium hover:underline">
                로그인
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
