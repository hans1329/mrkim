import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Briefcase, Check, X, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const PASSWORD_RULES = [
  { key: "length", label: "8자 이상", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "대문자 포함", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "소문자 포함", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "숫자 포함", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "특수문자 포함", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function AccountantSignup() {
  const [step, setStep] = useState<"form" | "done" | "existing">("form");
  const [loading, setLoading] = useState(false);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
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

  const isFormValid = hasExistingAccount
    ? name.length > 0 && email.length > 0 && email.includes("@")
    : name.length > 0 && email.length > 0 && email.includes("@") && allRulesPass && passwordsMatch;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);

    try {
      // 1. 이미 tax_accountants에 같은 이메일이 있는지 확인
      const { data: existingAccountant } = await supabase
        .from("tax_accountants")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingAccountant) {
        toast.error("이미 파트너로 등록된 이메일입니다. 로그인해주세요.");
        return;
      }

      if (hasExistingAccount) {
        // 기존 계정: auth signUp 호출 없이 tax_accountants 레코드만 생성
        const { error: insertError } = await supabase
          .from("tax_accountants")
          .insert({
            user_id: null,
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
          toast.error("세무사 정보 등록에 실패했습니다.");
          return;
        }

        setStep("existing");
        toast.success("파트너 등록이 완료되었습니다!");
      } else {
        // 새 계정: auth signUp + tax_accountants 레코드 생성
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
            toast.error("이미 등록된 이메일입니다. '기존 김비서 계정이 있습니다'를 활성화해주세요.");
          } else {
            toast.error(authError.message);
          }
          return;
        }

        if (!authData.user) {
          toast.error("회원가입에 실패했습니다.");
          return;
        }

        // identities가 비어있으면 이미 가입된 사용자 (user_repeated_signup)
        const isRepeated = !authData.user.identities || authData.user.identities.length === 0;

        if (isRepeated) {
          // 이미 가입된 계정인데 새 계정으로 시도한 경우
          // 비밀번호는 무시되었으므로 기존 비밀번호 안내
          toast.warning("이미 가입된 이메일입니다. 기존 비밀번호로 로그인해주세요.");
        }

        const { error: insertError } = await supabase
          .from("tax_accountants")
          .insert({
            user_id: null,
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
          toast.error("세무사 정보 등록에 실패했습니다.");
          return;
        }

        if (isRepeated) {
          setStep("existing");
          toast.success("파트너 등록이 완료되었습니다!");
        } else {
          setStep("done");
          toast.success("회원가입이 완료되었습니다!");
        }
      }
    } catch (error: any) {
      toast.error("회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "existing") {
    return (
      <div className="h-full overflow-y-auto bg-muted/30">
        <div className="min-h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-success" />
              </div>
              <CardTitle className="text-xl">파트너 등록 완료!</CardTitle>
              <CardDescription>
                기존 김비서 계정으로 파트너 등록이 완료되었습니다.<br />
                <strong>기존 비밀번호</strong>로 로그인해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/accountant/login")}>
                로그인 페이지로 이동
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="h-full overflow-y-auto bg-muted/30">
        <div className="min-h-full flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-success" />
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
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
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
              {/* 기존 계정 여부 토글 */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="existing-toggle" className="text-sm font-normal cursor-pointer">
                    기존 김비서 계정이 있습니다
                  </Label>
                </div>
                <Switch
                  id="existing-toggle"
                  checked={hasExistingAccount}
                  onCheckedChange={(checked) => {
                    setHasExistingAccount(checked);
                    if (checked) {
                      setPassword("");
                      setPasswordConfirm("");
                    }
                  }}
                />
              </div>

              {hasExistingAccount && (
                <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    기존 계정의 이메일을 입력해주세요. 등록 후 <strong>기존 비밀번호</strong>로 파트너 포털에 로그인할 수 있습니다.
                  </p>
                </div>
              )}

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

              {/* 새 계정인 경우에만 비밀번호 입력 */}
              {!hasExistingAccount && (
                <>
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
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <X className="h-3 w-3 text-destructive" />
                            )}
                            <span className={rule.test(password) ? "text-success" : "text-muted-foreground"}>
                              {rule.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password-confirm">비밀번호 확인 *</Label>
                    <Input
                      id="signup-password-confirm"
                      type="password"
                      value={passwordConfirm}
                      onChange={e => setPasswordConfirm(e.target.value)}
                      placeholder="비밀번호 재입력"
                      required
                    />
                    {passwordConfirm && !passwordsMatch && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <X className="h-3 w-3" /> 비밀번호가 일치하지 않습니다
                      </p>
                    )}
                    {passwordConfirm && passwordsMatch && (
                      <p className="text-xs text-success flex items-center gap-1">
                        <Check className="h-3 w-3" /> 비밀번호 일치
                      </p>
                    )}
                  </div>
                </>
              )}

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

              <Button type="submit" className="w-full" disabled={loading || !isFormValid}>
                {loading ? "처리 중..." : hasExistingAccount ? "파트너 등록" : "회원가입"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                이미 파트너 계정이 있으신가요?{" "}
                <Link to="/accountant/login" className="text-primary font-medium hover:underline">
                  로그인
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}