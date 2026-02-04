import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Building2, CreditCard, Landmark } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ConnectionType = "hometax" | "card" | "account";

interface ConnectionSuccessModalProps {
  open: boolean;
  type: ConnectionType | null;
  onContinue: () => void;
}

const connectionInfo: Record<ConnectionType, {
  title: string;
  description: string;
  icon: typeof Building2;
  color: string;
  bgColor: string;
}> = {
  hometax: {
    title: "국세청 연결 완료!",
    description: "이제 매출, 세금계산서, 부가세 현황을\n자동으로 확인할 수 있어요",
    icon: Building2,
    color: "text-blue-500",
    bgColor: "from-blue-500 to-blue-400",
  },
  card: {
    title: "카드 연결 완료!",
    description: "지출 내역이 자동으로 분류되어\n비용 관리가 더 쉬워져요",
    icon: CreditCard,
    color: "text-purple-500",
    bgColor: "from-purple-500 to-purple-400",
  },
  account: {
    title: "계좌 연결 완료!",
    description: "입출금 내역을 실시간으로 확인하고\n자금 흐름을 파악할 수 있어요",
    icon: Landmark,
    color: "text-green-500",
    bgColor: "from-green-500 to-green-400",
  },
};

export function ConnectionSuccessModal({ open, type, onContinue }: ConnectionSuccessModalProps) {
  if (!type) return null;
  
  const info = connectionInfo[type];
  const Icon = info.icon;

  return (
    <Dialog open={open}>
      <DialogContent 
        className="w-[calc(100%-2rem)] max-w-sm border-0 bg-card rounded-xl p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* 상단 그라데이션 영역 */}
        <div className={cn(
          "bg-gradient-to-br p-8 text-center",
          info.bgColor
        )}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5, delay: 0.1 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Sparkles className="w-6 h-6 text-yellow-300 absolute -top-1 -right-1" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Sparkles className="w-4 h-4 text-yellow-300 absolute -bottom-1 -left-1" />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            <h2 className="text-2xl font-bold text-white">
              {info.title}
            </h2>
          </motion.div>
        </div>

        {/* 하단 콘텐츠 영역 */}
        <div className="p-6 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center"
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-muted",
              info.color
            )}>
              <Icon className="w-6 h-6" />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground whitespace-pre-line leading-relaxed"
          >
            {info.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button 
              onClick={onContinue}
              size="lg"
              className="w-full"
            >
              계속하기
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
