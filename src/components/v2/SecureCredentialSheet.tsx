import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, FileKey, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type SecureService = "hometax" | "card" | "account" | "baemin" | "coupangeats";

export interface SecureCredentialPayload {
  service: SecureService;
  institution?: string;
  auth_type?: "cert" | "id_pw" | "simple";
  login_id?: string;
  password?: string;
  cert_file?: File;
  cert_password?: string;
}

interface Props {
  open: boolean;
  service: SecureService;
  institution?: string;
  authType?: "cert" | "id_pw" | "simple";
  loginId?: string;
  onClose: () => void;
  onSubmit: (payload: SecureCredentialPayload) => Promise<void> | void;
}

const SERVICE_LABEL: Record<SecureService, string> = {
  hometax: "홈택스",
  card: "카드사",
  account: "은행",
  baemin: "배달의민족",
  coupangeats: "쿠팡이츠",
};

export function SecureCredentialSheet({
  open,
  service,
  institution,
  authType,
  loginId,
  onClose,
  onSubmit,
}: Props) {
  const [password, setPassword] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const title = institution
    ? `${institution} ${SERVICE_LABEL[service]} 연동`
    : `${SERVICE_LABEL[service]} 연동`;

  const reset = () => {
    setPassword("");
    setCertFile(null);
    setCertPassword("");
    setShowPw(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authType === "cert") {
      if (!certFile) return toast.error("인증서 파일(.pfx/.p12)을 선택해주세요");
      if (!certPassword) return toast.error("인증서 비밀번호를 입력해주세요");
    } else {
      if (!password) return toast.error("비밀번호를 입력해주세요");
    }

    setSubmitting(true);
    try {
      await onSubmit({
        service,
        institution,
        auth_type: authType,
        login_id: loginId,
        password: authType === "cert" ? undefined : password,
        cert_file: certFile || undefined,
        cert_password: authType === "cert" ? certPassword : undefined,
      });
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "연동에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={() => !submitting && onClose()}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[120] rounded-t-3xl"
            style={{
              background: "rgba(20,20,28,0.96)",
              backdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              maxHeight: "85vh",
            }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(52,199,89,0.18)" }}
                >
                  <Lock className="w-4 h-4" style={{ color: "#34C759" }} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white">{title}</p>
                  <p className="text-[11px] text-white/55">보안 입력 영역</p>
                </div>
              </div>
              <button
                onClick={() => !submitting && onClose()}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white"
                disabled={submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-7 pt-2 space-y-4">
              {loginId && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5">
                  <span className="text-[12px] text-white/55">아이디</span>
                  <span className="text-[13px] text-white/90 font-medium">{loginId}</span>
                </div>
              )}

              {authType === "cert" ? (
                <>
                  <div>
                    <label className="text-[12px] text-white/70 mb-1.5 block">
                      공동인증서 파일 (.pfx / .p12)
                    </label>
                    <label
                      className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed cursor-pointer hover:bg-white/5"
                      style={{ borderColor: "rgba(255,255,255,0.18)" }}
                    >
                      <FileKey className="w-4 h-4 text-white/60" />
                      <span className="text-[13px] text-white/80 truncate">
                        {certFile ? certFile.name : "파일 선택"}
                      </span>
                      <input
                        type="file"
                        accept=".pfx,.p12"
                        className="hidden"
                        onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-[12px] text-white/70 mb-1.5 block">
                      인증서 비밀번호
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={certPassword}
                        onChange={(e) => setCertPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full px-3 py-3 pr-11 rounded-xl bg-white/5 border border-white/10 text-white text-[14px] outline-none focus:border-white/30"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/50"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[12px] text-white/70 mb-1.5 block">비밀번호</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-3 py-3 pr-11 rounded-xl bg-white/5 border border-white/10 text-white text-[14px] outline-none focus:border-white/30"
                      placeholder="••••••••"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/50"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-white/45 leading-relaxed">
                비밀번호는 화면을 통해서만 입력하며, 음성 녹음이나 채팅 기록에 절대 저장되지 않아요.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#34C759,#30B0C7)",
                  color: "white",
                }}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                연동 시작
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
