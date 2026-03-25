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
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isExistingAccount, setIsExistingAccount] = useState<boolean | null>(null);
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

  // 기존 계정이면 비밀번호 불필요, 새 계정이면 비밀번호 필수
  const isFormValid = isExistingAccount
    ? name.length > 0 && email.length > 0
    : name.length > 0 && email.length > 0 && allRulesPass && passwordsMatch;

  const handleEmailBlur = async () => {
    if (!email || !email.includes("@")) return;
    setCheckingEmail(true);
    try {
      // signUp을 호출하지 않고, 간접적으로 기존 계정 여부를 확인
      // OTP signInWithOtp를 시도하면 기존 계정 여부를 알 수 있지만,
      // 더 간단하게: signUp 시 identities 비어있으면 기존 계정
      // 여기서는 signInWithPassword를 빈 비번으로 호출하여 에러 메시지로 판단하는 대신,
      // 이미 tax_accountants에 등록되어 있는지만 확인하고,
      // 실제 auth 기존 계정 여부는 가입 시점에 판단
      const { data: existingAccountant } = await supabase
        .from("tax_accountants")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingAccountant) {
        toast.error("이미 파트너로 등록된 이메일입니다. 로그인해주세요.");
        setIsExistingAccount(null);
        return;
      }

      // auth.users 존재 여부는 signUp 응답의 identities로 판단하므로
      // 여기서는 일단 null로 두고, 가입 시 판단
      setIsExistingAccount(null);
    } catch {
      // ignore
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // 2. 먼저 signUp을 시도하여 기존 계정인지 확인
      // 기존 계정인 경우: identities가 빈 배열로 반환됨 (user_repeated_signup)
      // 이때 비밀번호는 무시되므로 임시 비밀번호로 호출
      const tempPassword = isExistingAccount ? "TempCheck1!TempCheck1!" : password;

      if (!isExistingAccount && (!allRulesPass || !passwordsMatch)) {
        toast.error(!allRulesPass ? "비밀번호 조건을 모두 충족해주세요." : "비밀번호가 일치하지 않습니다.");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
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

      // 3. 기존 계정인지 확인 (identities가 비어있으면 이미 가입된 사용자)
      const isExisting = !authData.user.identities || authData.user.identities.length === 0;

      // 4. Create tax_accountants record
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
        toast.error("세무사 정보 등록에 실패했습니다. 관리자에게 문의해주세요.");
        return;
      }

      if (isExisting) {
        setStep("existing");
        toast.success("파트너 등록이 완료되었습니다!");
      } else {
        setStep("done");
        toast.success("회원가입이 완료되었습니다!");
      }
    } catch (error: any) {
      toast.error("회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: signUp으로 기존 계정 여부를 먼저 확인하는 2단계 플로우
  const handleCheckEmail = async () => {
    if (!email || !email.includes("@") || !name) {
      toast.error("이름과 이메일을 입력해주세요.");
      return;
    }
    setCheckingEmail(true);
    try {
      // tax_accountants에 이미 등록되어 있는지 확인
      const { data: existingAccountant } = await supabase
        .from("tax_accountants")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingAccountant) {
        toast.error("이미 파트너로 등록된 이메일입니다. 로그인해주세요.");
        return;
      }

      // signUp으로 기존 auth 계정 여부 확인 (dry-run 느낌)
      // 임시 비밀번호로 signUp → identities 비어있으면 기존 계정
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: "TempDryRun1!Check",
        options: {
          emailRedirectTo: window.location.origin + "/accountant/login",
          data: { name },
        },
      });

      if (authError) {
        // 에러가 나도 기존 계정 아닐 수 있음
        setIsExistingAccount(false);
        return;
      }

      if (authData.user) {
        const isExisting = !authData.user.identities || authData.user.identities.length === 0;
        setIsExistingAccount(isExisting);

        if (isExisting) {
          // 기존 계정이므로 비밀번호 없이 바로 프로필 생성 가능
          toast.info("기존 김비서 계정이 확인되었습니다. 추가 정보를 입력해주세요.");
        } else {
          // 새 계정이 생성됨 - 이미 signUp이 호출되었으므로 인증 메일 발송됨
          // 프로필 정보를 입력받고 tax_accountants 레코드만 생성하면 됨
          toast.info("인증 메일이 발송되었습니다. 추가 정보를 입력하고 가입을 완료해주세요.");
        }
      }
    } catch {
      setIsExistingAccount(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  // 기존 계정의 경우: 비밀번호 없이 프로필만 생성
  const handleExistingAccountSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: existingAccountant } = await supabase
        .from("tax_accountants")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingAccountant) {
        toast.error("이미 파트너로 등록된 이메일입니다.");
        return;
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

      setStep("existing");
      toast.success("파트너 등록이 완료되었습니다!");
    } catch {
      toast.error("등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 새 계정의 경우: 이미 signUp이 호출되었으므로 프로필만 생성
  const handleNewAccountSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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

      setStep("done");
      toast.success("회원가입이 완료되었습니다!");
    } catch {
      toast.error("등록에 실패했습니다.");
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

  // Step 1: 이메일 확인 전 (기존 계정 여부 모름)
  if (isExistingAccount === null) {
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
            <CardContent className="space-y-4">
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
              <Button
                className="w-full"
                onClick={handleCheckEmail}
                disabled={checkingEmail || !email || !email.includes("@") || !name}
              >
                {checkingEmail ? "확인 중..." : "다음"}
              </Button>
              <div className="text-center">
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
      </div>
    );
  }

  // Step 2: 기존 계정인 경우 - 비밀번호 입력 없이 프로필만
  if (isExistingAccount === true) {
    return (
      <div className="h-full overflow-y-auto bg-muted/30">
        <div className="min-h-full flex items-start justify-center p-4 py-8">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">파트너 정보 입력</CardTitle>
              <CardDescription>
                기존 김비서 계정이 확인되었습니다. 파트너 정보를 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-primary/5 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  기존 계정({email})으로 등록됩니다. 등록 후 <strong>기존 비밀번호</strong>로 로그인해주세요.
                </p>
              </div>
              <form onSubmit={handleExistingAccountSignup} className="space-y-4">
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "등록 중..." : "파트너 등록 완료"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2: 새 계정인 경우 - 이미 signUp 완료, 프로필 정보만 추가 입력
  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">파트너 정보 입력</CardTitle>
            <CardDescription>
              계정이 생성되었습니다. 추가 정보를 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-success/5 rounded-lg flex items-start gap-2">
              <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {email}로 인증 메일이 발송되었습니다. 이메일을 확인해주세요.
              </p>
            </div>
            <form onSubmit={handleNewAccountSignup} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "등록 중..." : "가입 완료"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}