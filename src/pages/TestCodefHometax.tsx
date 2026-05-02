import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildPfxFromKoreanDerKey, type PfxBuildResult } from "@/lib/koreanCertToPfx";

type RegisterMode = "der_key" | "pfx";
type PfxAlgo = "3des" | "aes128" | "aes192" | "aes256" | "seed-cbc";

interface RegisterResult {
  ok: boolean;
  status: number | null;
  body: any;
  elapsedMs: number;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const autoDetectClientType = (bizNum: string): "B" | "P" => {
  const digits = bizNum.replace(/\D/g, "");
  if (digits.length < 5) return "P";
  const mid = parseInt(digits.slice(3, 5), 10);
  return mid >= 81 && mid <= 99 ? "B" : "P";
};

export default function TestCodefHometax() {
  const [businessNumber, setBusinessNumber] = useState("");
  const [certPassword, setCertPassword] = useState("");
  const [mode, setMode] = useState<RegisterMode>("der_key");
  const [derFile, setDerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [pfxBase64Paste, setPfxBase64Paste] = useState<string>("");
  const [clientTypeOverride, setClientTypeOverride] = useState<"auto" | "B" | "P">("auto");
  const [convertInBrowser, setConvertInBrowser] = useState(true);
  const [conversionNote, setConversionNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<RegisterResult | null>(null);
  const [connectedId, setConnectedId] = useState<string>("");
  const [invoiceResult, setInvoiceResult] = useState<RegisterResult | null>(null);

  const [pfxAlgo, setPfxAlgo] = useState<PfxAlgo>("seed-cbc");
  const [pfxUseMac, setPfxUseMac] = useState(true);
  const [pfxCount, setPfxCount] = useState(2048);
  const [pfxSaltSize, setPfxSaltSize] = useState(8);
  const [pfxFriendlyName, setPfxFriendlyName] = useState(true);
  const [pfxLocalKeyId, setPfxLocalKeyId] = useState(true);
  const [buildDiagnostics, setBuildDiagnostics] = useState<PfxBuildResult["diagnostics"] | null>(null);

  // 간편인증 테스트 state
  const [simpleUserName, setSimpleUserName] = useState("");
  const [simpleBirthDate, setSimpleBirthDate] = useState("");
  const [simplePhoneNo, setSimplePhoneNo] = useState("");
  const [simpleProvider, setSimpleProvider] = useState<"1" | "5" | "6" | "8">("1");
  const [simpleStep1Result, setSimpleStep1Result] = useState<RegisterResult | null>(null);
  const [simpleStep2Result, setSimpleStep2Result] = useState<RegisterResult | null>(null);
  const [simpleTwoWayInfo, setSimpleTwoWayInfo] = useState<any>(null);
  const [simpleKeyword, setSimpleKeyword] = useState<string | null>(null);

  const effectiveClientType =
    clientTypeOverride === "auto" ? autoDetectClientType(businessNumber) : clientTypeOverride;

  const callFunction = async (
    name: string,
    body: any,
  ): Promise<RegisterResult> => {
    const started = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke(name, { body });
      const elapsedMs = Math.round(performance.now() - started);
      if (error) {
        return {
          ok: false,
          status: (error as any)?.context?.status ?? null,
          body: {
            __invoke_error: true,
            message: error.message,
            name: error.name,
            raw: error,
          },
          elapsedMs,
        };
      }
      return { ok: true, status: 200, body: data, elapsedMs };
    } catch (e: any) {
      return {
        ok: false,
        status: null,
        body: { __thrown: true, message: e?.message ?? String(e) },
        elapsedMs: Math.round(performance.now() - started),
      };
    }
  };

  const handleVerifyBusiness = async () => {
    if (!businessNumber) return;
    setLoading(true);
    setVerifyResult(null);
    const res = await callFunction("codef-hometax", { businessNumber });
    setVerifyResult(res);
    setLoading(false);
  };

  // ────────── 간편인증 1차 호출 ──────────
  const handleSimpleStep1 = async () => {
    if (!businessNumber || !simpleUserName || !simpleBirthDate || !simplePhoneNo) return;
    setLoading(true);
    setSimpleStep1Result(null);
    setSimpleStep2Result(null);
    setSimpleTwoWayInfo(null);
    setSimpleKeyword(null);

    const res = await callFunction("codef-hometax", {
      action: "register_simple",
      businessNumber,
      userName: simpleUserName,
      birthDate: simpleBirthDate.replace(/\D/g, ""),
      phoneNo: simplePhoneNo.replace(/\D/g, ""),
      loginTypeLevel: simpleProvider,
      clientType: effectiveClientType,
    });
    setSimpleStep1Result(res);

    if (res.ok && res.body?.status === "pending" && res.body?.twoWayInfo) {
      setSimpleTwoWayInfo(res.body.twoWayInfo);
      setSimpleKeyword(res.body.simpleKeyword || null);
    } else if (res.ok && res.body?.status === "completed") {
      // 드물지만 1차만에 성공하는 경우
      setConnectedId(res.body.connectedId || "");
    }
    setLoading(false);
  };

  // ────────── 간편인증 2차 호출 (확인 완료 후) ──────────
  const handleSimpleStep2 = async () => {
    if (!simpleTwoWayInfo) return;
    setLoading(true);
    setSimpleStep2Result(null);

    const res = await callFunction("codef-hometax", {
      action: "register_simple",
      businessNumber,
      userName: simpleUserName,
      birthDate: simpleBirthDate.replace(/\D/g, ""),
      phoneNo: simplePhoneNo.replace(/\D/g, ""),
      loginTypeLevel: simpleProvider,
      clientType: effectiveClientType,
      twoWayInfo: simpleTwoWayInfo,
    });
    setSimpleStep2Result(res);

    if (res.ok && res.body?.status === "completed" && res.body?.connectedId) {
      setConnectedId(res.body.connectedId);
    }
    setLoading(false);
  };

  const PROVIDER_LABELS: Record<string, string> = {
    "1": "카카오톡",
    "5": "통신사 PASS",
    "6": "네이버",
    "8": "토스",
  };

  const handleRegister = async () => {
    if (!businessNumber || !certPassword) return;
    if (mode === "der_key" && (!derFile || !keyFile)) return;
    if (mode === "pfx" && !pfxFile && !pfxBase64Paste.trim()) return;

    setLoading(true);
    setRegisterResult(null);
    setConnectedId("");
    setConversionNote("");
    setBuildDiagnostics(null);

    const payload: Record<string, unknown> = {
      action: "register",
      businessNumber,
      certPassword,
      clientType: effectiveClientType,
    };

    try {
      if (mode === "der_key" && derFile && keyFile) {
        const derB64 = await fileToBase64(derFile);
        const keyB64 = await fileToBase64(keyFile);
        if (convertInBrowser) {
          const t0 = performance.now();
          const result = await buildPfxFromKoreanDerKey(derB64, keyB64, certPassword, {
            algorithm: pfxAlgo,
            useMac: pfxUseMac,
            count: pfxCount,
            saltSize: pfxSaltSize,
            includeFriendlyName: pfxFriendlyName,
            includeLocalKeyId: pfxLocalKeyId,
          });
          const ms = Math.round(performance.now() - t0);
          payload.certFileBase64 = result.pfxBase64;
          setBuildDiagnostics(result.diagnostics);
          setConversionNote(
            `✅ PFX 합성 완료 (${ms}ms · ${result.diagnostics.pfxByteLength}B · 키-인증서 매칭=${result.diagnostics.keyCertPaired ? "OK" : "FAIL"}). certFileBase64로 전송.`
          );
        } else {
          payload.derFileBase64 = derB64;
          payload.keyFileBase64 = keyB64;
          setConversionNote("원본 DER+KEY 그대로 전송 (derFileBase64 + keyFileBase64).");
        }
      } else if (mode === "pfx") {
        if (pfxBase64Paste.trim()) {
          const cleaned = pfxBase64Paste.replace(/\s/g, "");
          payload.certFileBase64 = cleaned;
          setConversionNote(`붙여넣은 PFX base64 전송 (${cleaned.length} chars).`);
        } else if (pfxFile) {
          payload.certFileBase64 = await fileToBase64(pfxFile);
          setConversionNote("업로드된 PFX 파일 그대로 전송.");
        }
      }
    } catch (e: any) {
      setConversionNote(`❌ 클라이언트 측 PFX 합성 실패: ${e?.message ?? String(e)}`);
      setLoading(false);
      return;
    }

    const res = await callFunction("codef-hometax", payload);
    setRegisterResult(res);

    if (res.ok && res.body?.connectedId) {
      setConnectedId(res.body.connectedId);
    }
    setLoading(false);
  };

  const handleFetchInvoice = async () => {
    if (!businessNumber || !connectedId) return;
    setLoading(true);
    setInvoiceResult(null);
    const res = await callFunction("codef-tax-invoice", {
      action: "all",
      businessNumber,
      connectedId,
    });
    setInvoiceResult(res);
    setLoading(false);
  };

  const renderResult = (result: RegisterResult | null, label: string) => {
    if (!result) return null;
    const errorList: any[] = result.body?.details ?? [];
    const resultCode = result.body?.code;
    return (
      <div className="mt-3 rounded-lg border border-neutral-700 bg-neutral-900/60 p-3 text-sm">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              result.ok ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <span className="font-mono text-xs text-neutral-400">
            {label} · HTTP {result.status ?? "?"} · {result.elapsedMs}ms
          </span>
        </div>
        {resultCode && (
          <div className="mb-2 font-mono text-xs">
            <span className="text-neutral-400">result.code: </span>
            <span className="text-amber-300">{resultCode}</span>
          </div>
        )}
        {errorList.length > 0 && (
          <div className="mb-2 rounded bg-rose-950/50 p-2">
            <div className="mb-1 text-xs text-rose-300">errorList:</div>
            {errorList.map((e, i) => (
              <div key={i} className="font-mono text-xs text-rose-200">
                [{e.code}] {e.message || e.extraMessage || JSON.stringify(e)}
              </div>
            ))}
          </div>
        )}
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-neutral-300">
          {JSON.stringify(result.body, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen overflow-y-auto bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">CODEF 홈택스 진단 테스트</h1>
          <p className="mt-1 text-sm text-neutral-400">
            codef-hometax (account register) + codef-tax-invoice 동작 확인용. 응답은 모두 raw JSON으로 출력됩니다.
          </p>
        </header>

        {/* Step 0: Business verify */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="mb-3 text-lg font-semibold">0. 사업자 상태 조회 (공개)</h2>
          <p className="mb-3 text-xs text-neutral-400">
            connectedId 없이 호출 가능한 유일한 API. 이게 실패하면 CODEF 크레덴셜/네트워크 문제입니다.
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded bg-neutral-800 px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="사업자번호 (예: 1234567890)"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
            />
            <button
              onClick={handleVerifyBusiness}
              disabled={loading || !businessNumber}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-40"
            >
              사업자 조회
            </button>
          </div>
          {renderResult(verifyResult, "businessVerify")}
        </section>

        {/* 간편인증 (권장) */}
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold">★ 간편인증 등록 (권장)</h2>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              loginType 5
            </span>
          </div>
          <p className="mb-4 text-xs text-neutral-400">
            공인인증서 없이 카카오/PASS/네이버/토스 중 하나로 대표자 본인 인증.
            법인(1인 대표) 지원. CF-04025 우회 가능성.
          </p>

          <div className="space-y-3">
            {/* 대표자 정보 입력 */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">
                <span className="mb-1 block text-neutral-400">대표자명</span>
                <input
                  value={simpleUserName}
                  onChange={(e) => setSimpleUserName(e.target.value)}
                  className="block w-full rounded bg-neutral-800 px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="홍길동"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block text-neutral-400">생년월일 (YYYYMMDD)</span>
                <input
                  value={simpleBirthDate}
                  onChange={(e) => setSimpleBirthDate(e.target.value)}
                  className="block w-full rounded bg-neutral-800 px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="19800101"
                  maxLength={8}
                />
              </label>
            </div>
            <label className="block text-xs">
              <span className="mb-1 block text-neutral-400">대표자 휴대폰 (- 없이)</span>
              <input
                value={simplePhoneNo}
                onChange={(e) => setSimplePhoneNo(e.target.value)}
                className="block w-full rounded bg-neutral-800 px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="01012345678"
              />
            </label>

            {/* 간편인증 공급자 선택 */}
            <div>
              <div className="mb-1.5 text-xs text-neutral-400">간편인증 공급자</div>
              <div className="grid grid-cols-4 gap-2">
                {(["1", "5", "6", "8"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSimpleProvider(p)}
                    className={`rounded py-2 text-xs ${
                      simpleProvider === p
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {PROVIDER_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1 버튼 */}
            <button
              onClick={handleSimpleStep1}
              disabled={
                loading ||
                !businessNumber ||
                !simpleUserName ||
                !simpleBirthDate ||
                !simplePhoneNo
              }
              className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-40"
            >
              {loading ? "요청 중..." : `1차 호출 (${PROVIDER_LABELS[simpleProvider]} 인증 요청)`}
            </button>

            {/* 1차 응답 */}
            {renderResult(simpleStep1Result, "1차 호출")}

            {/* 2차 대기·실행 */}
            {simpleTwoWayInfo && (
              <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">
                    {PROVIDER_LABELS[simpleProvider]} 앱에서 확인을 눌러주세요
                  </span>
                </div>
                {simpleKeyword && (
                  <p className="mb-2 text-[11px] text-neutral-400">
                    앱에 표시되는 키워드: <span className="font-mono text-amber-200">{simpleKeyword}</span>
                  </p>
                )}
                <button
                  onClick={handleSimpleStep2}
                  disabled={loading}
                  className="w-full rounded bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-500 disabled:opacity-40"
                >
                  {loading ? "확인 중..." : "확인 완료 → 2차 호출"}
                </button>
                {renderResult(simpleStep2Result, "2차 호출")}
              </div>
            )}
          </div>
        </section>

        {/* Step 1: Register */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="mb-3 text-lg font-semibold">1. 공동인증서 계정 등록</h2>

          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setMode("der_key")}
              className={`rounded px-3 py-1 text-xs ${
                mode === "der_key" ? "bg-sky-600 text-white" : "bg-neutral-800 text-neutral-400"
              }`}
            >
              DER + KEY (NPKI)
            </button>
            <button
              onClick={() => setMode("pfx")}
              className={`rounded px-3 py-1 text-xs ${
                mode === "pfx" ? "bg-sky-600 text-white" : "bg-neutral-800 text-neutral-400"
              }`}
            >
              PFX / P12
            </button>
          </div>

          {mode === "der_key" && (
            <label className="mb-3 flex cursor-pointer items-start gap-2 rounded border border-neutral-800 bg-neutral-900/60 p-3 text-xs">
              <input
                type="checkbox"
                checked={convertInBrowser}
                onChange={(e) => setConvertInBrowser(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium text-neutral-200">
                  브라우저에서 PFX로 합성 후 전송 (권장)
                </span>
                <span className="mt-1 block text-neutral-400">
                  체크 시: <code>buildPfxFromKoreanDerKey</code> 로 SEED-CBC 복호화 + PFX 합성 →
                  <code className="ml-1">certFileBase64</code>로 전송.
                  <br />
                  해제 시: DER + KEY 를 <code>derFileBase64 / keyFileBase64</code>로 원본 전송.
                </span>
              </span>
            </label>
          )}

          {mode === "der_key" && convertInBrowser && (
            <details className="mb-3 rounded border border-neutral-800 bg-neutral-900/40 p-3 text-xs" open>
              <summary className="cursor-pointer font-medium text-neutral-200">
                PFX 합성 고급 옵션 (CF-04025 회피용)
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-neutral-400">algorithm</span>
                  <select
                    value={pfxAlgo}
                    onChange={(e) => setPfxAlgo(e.target.value as PfxAlgo)}
                    className="w-full rounded bg-neutral-800 px-2 py-1 font-mono"
                  >
                    <option value="seed-cbc">★ seed-cbc (Korean KISA — CODEF 호환)</option>
                    <option value="3des">3des (PBE-SHA1-3DES)</option>
                    <option value="aes128">aes128</option>
                    <option value="aes192">aes192</option>
                    <option value="aes256">aes256</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-neutral-400">iteration count</span>
                  <select
                    value={pfxCount}
                    onChange={(e) => setPfxCount(parseInt(e.target.value, 10))}
                    className="w-full rounded bg-neutral-800 px-2 py-1 font-mono"
                  >
                    <option value={1024}>1024</option>
                    <option value={2048}>2048 (default)</option>
                    <option value={10000}>10000</option>
                    <option value={100000}>100000</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-neutral-400">salt size (bytes)</span>
                  <select
                    value={pfxSaltSize}
                    onChange={(e) => setPfxSaltSize(parseInt(e.target.value, 10))}
                    className="w-full rounded bg-neutral-800 px-2 py-1 font-mono"
                  >
                    <option value={8}>8 (default)</option>
                    <option value={16}>16</option>
                    <option value={20}>20</option>
                  </select>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pfxUseMac}
                    onChange={(e) => setPfxUseMac(e.target.checked)}
                  />
                  <span className="text-neutral-300">useMac (SHA1)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pfxFriendlyName}
                    onChange={(e) => setPfxFriendlyName(e.target.checked)}
                  />
                  <span className="text-neutral-300">friendlyName 포함</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pfxLocalKeyId}
                    onChange={(e) => setPfxLocalKeyId(e.target.checked)}
                  />
                  <span className="text-neutral-300">localKeyId 포함</span>
                </label>
              </div>
              <p className="mt-3 text-[11px] text-neutral-500">
                실패할 때마다 algorithm(3des↔aes256) → useMac(off) → count(10000/100000) 순으로 바꿔보세요.
              </p>
            </details>
          )}

          <div className="space-y-3">
            {mode === "der_key" ? (
              <>
                <label className="block text-xs">
                  <span className="mb-1 block text-neutral-400">signCert.der</span>
                  <input
                    type="file"
                    accept=".der,.cer"
                    onChange={(e) => setDerFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-neutral-700 file:px-3 file:py-1 file:text-white"
                  />
                  {derFile && (
                    <span className="mt-1 block font-mono text-[10px] text-neutral-500">
                      {derFile.name} · {derFile.size} bytes
                    </span>
                  )}
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-neutral-400">signPri.key</span>
                  <input
                    type="file"
                    accept=".key"
                    onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-neutral-700 file:px-3 file:py-1 file:text-white"
                  />
                  {keyFile && (
                    <span className="mt-1 block font-mono text-[10px] text-neutral-500">
                      {keyFile.name} · {keyFile.size} bytes
                    </span>
                  )}
                </label>
              </>
            ) : (
              <>
                <label className="block text-xs">
                  <span className="mb-1 block text-neutral-400">.pfx / .p12 파일</span>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={(e) => setPfxFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-neutral-700 file:px-3 file:py-1 file:text-white"
                  />
                  {pfxFile && (
                    <span className="mt-1 block font-mono text-[10px] text-neutral-500">
                      {pfxFile.name} · {pfxFile.size} bytes
                    </span>
                  )}
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-neutral-400">
                    또는 PFX base64 붙여넣기 (codefCert / https://cert.codef.io/#/api 출력)
                  </span>
                  <textarea
                    value={pfxBase64Paste}
                    onChange={(e) => setPfxBase64Paste(e.target.value)}
                    placeholder="MIIMWgIBAzCCDCQGCSqGSIb3DQ..."
                    rows={4}
                    className="block w-full resize-y rounded bg-neutral-800 px-3 py-2 font-mono text-[10px] outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {pfxBase64Paste.trim() && (
                    <span className="mt-1 block font-mono text-[10px] text-emerald-400">
                      ✅ 붙여넣기된 PFX 우선 사용 ({pfxBase64Paste.replace(/\s/g, "").length} chars)
                    </span>
                  )}
                </label>
              </>
            )}

            <label className="block text-xs">
              <span className="mb-1 block text-neutral-400">인증서 비밀번호</span>
              <input
                type="password"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                className="block w-full rounded bg-neutral-800 px-3 py-2 font-mono text-sm outline-none focus:ring-1 focus:ring-sky-500"
                autoComplete="new-password"
              />
            </label>

            <div>
              <div className="mb-1 text-xs text-neutral-400">
                clientType (자동 감지: <code className="text-amber-300">{effectiveClientType}</code>
                {clientTypeOverride === "auto" && " — 사업자번호 4-5자리로 판정"})
              </div>
              <div className="flex gap-2">
                {(["auto", "B", "P"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setClientTypeOverride(v)}
                    className={`rounded px-3 py-1 text-xs ${
                      clientTypeOverride === v
                        ? "bg-sky-600 text-white"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {v === "auto" ? "자동" : v === "B" ? "법인(B)" : "개인(P)"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={
                loading ||
                !businessNumber ||
                !certPassword ||
                (mode === "der_key"
                  ? !derFile || !keyFile
                  : !pfxFile && !pfxBase64Paste.trim())
              }
              className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-40"
            >
              {loading ? "요청 중..." : "계정 등록 테스트"}
            </button>
          </div>

          {conversionNote && (
            <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/40 p-2 text-xs text-neutral-300">
              {conversionNote}
            </div>
          )}

          {buildDiagnostics && (
            <div className="mt-2 rounded border border-neutral-800 bg-neutral-900/40 p-3 text-[11px] font-mono text-neutral-300">
              <div className="mb-1 text-neutral-400">PFX 합성 진단</div>
              <div>
                algorithm={buildDiagnostics.optionsApplied.algorithm} · mac=
                {String(buildDiagnostics.optionsApplied.useMac)} · count=
                {buildDiagnostics.optionsApplied.count} · saltSize=
                {buildDiagnostics.optionsApplied.saltSize} · friendlyName=
                {String(buildDiagnostics.optionsApplied.includeFriendlyName)} · localKeyId=
                {String(buildDiagnostics.optionsApplied.includeLocalKeyId)}
              </div>
              <div>
                key↔cert paired:{" "}
                <span className={buildDiagnostics.keyCertPaired ? "text-emerald-300" : "text-rose-300"}>
                  {String(buildDiagnostics.keyCertPaired)}
                </span>{" "}
                · RSA {buildDiagnostics.rsaModulusBitLength} bit · PFX {buildDiagnostics.pfxByteLength} bytes
              </div>
              <div className="truncate">cert subject: {buildDiagnostics.certSubject}</div>
              <div className="truncate">cert issuer: {buildDiagnostics.certIssuer}</div>
              <div>
                cert serial: {buildDiagnostics.certSerialNumber} · valid{" "}
                {buildDiagnostics.certNotBefore.slice(0, 10)} → {buildDiagnostics.certNotAfter.slice(0, 10)}
              </div>
            </div>
          )}

          {renderResult(registerResult, "codef-hometax / register")}
        </section>

        {/* Step 2: Invoice fetch */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
          <h2 className="mb-3 text-lg font-semibold">2. 전자세금계산서 조회</h2>
          <p className="mb-3 text-xs text-neutral-400">
            Step 1에서 발급된 connectedId 로 조회. (tax-invoice 함수는 로그인 JWT 필요 — 로그인 후에만 성공)
          </p>
          <div className="mb-3">
            <label className="block text-xs">
              <span className="mb-1 block text-neutral-400">connectedId</span>
              <input
                value={connectedId}
                onChange={(e) => setConnectedId(e.target.value)}
                placeholder="Step 1 성공 시 자동 채움 (수동 입력도 가능)"
                className="block w-full rounded bg-neutral-800 px-3 py-2 font-mono text-xs outline-none focus:ring-1 focus:ring-sky-500"
              />
            </label>
          </div>
          <button
            onClick={handleFetchInvoice}
            disabled={loading || !businessNumber || !connectedId}
            className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40"
          >
            {loading ? "요청 중..." : "세금계산서 조회"}
          </button>
          {renderResult(invoiceResult, "codef-tax-invoice")}
        </section>

        <footer className="border-t border-neutral-800 pt-4 text-[11px] text-neutral-500">
          <p>
            ⚠️ 이 페이지는 진단 전용입니다. 인증서/비밀번호는 서버로 전송되어 Supabase Edge Function을 통해 CODEF에 제출됩니다.
            테스트 후 이 라우트는 제거하세요.
          </p>
        </footer>
      </div>
    </div>
  );
}
