 import { Card, CardContent } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { useNavigate } from "react-router-dom";
 import { 
   CreditCard, 
   Wallet, 
   Users, 
   ArrowRightLeft, 
   Bell,
   ArrowRight,
   FileText,
   CheckCircle2
 } from "lucide-react";
 
 const features = [
   { icon: FileText, label: "홈택스 현황", description: "세금계산서 자동 수집" },
   { icon: CreditCard, label: "최근 거래 내역", description: "카드/계좌 거래 자동 수집" },
   { icon: Wallet, label: "예치금 현황", description: "세금 예치금 관리" },
   { icon: Users, label: "직원 현황", description: "급여 및 4대보험 관리" },
   { icon: ArrowRightLeft, label: "자동이체 현황", description: "정기 결제 모니터링" },
   { icon: Bell, label: "최근 알림", description: "중요 알림 및 일정" },
 ];
 
const benefits = [
  "매출/지출 자동 분류 및 분석",
  "부가세 신고 자료 자동 정리",
  "AI 기반 재무 인사이트 제공",
];

 export function IntegratedConnectionCard() {
   const navigate = useNavigate();
 
   return (
     <Card className="overflow-hidden bg-card">
       <CardContent className="p-0">
         {/* 헤더 섹션 */}
         <div className="bg-primary/5 p-6 text-center space-y-2">
           <div className="flex justify-center">
             <img 
               src="/images/icc-5.webp" 
               alt="김비서" 
               className="h-16 w-16 object-contain opacity-90"
             />
           </div>
           <h3 className="text-lg font-semibold">데이터를 연동하면</h3>
           <p className="text-sm text-muted-foreground">
             김비서가 이런 서비스를 제공해드려요
           </p>
         </div>

         {/* 기능 목록 섹션 */}
         <div className="p-6 space-y-5">
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
             {features.map((feature, index) => (
               <div 
                 key={index}
                 className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 min-h-[60px]"
               >
                 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                   <feature.icon className="h-4 w-4 text-primary" />
                 </div>
                 <div className="flex-1">
                   <p className="text-sm font-medium">{feature.label}</p>
                   <p className="text-xs text-muted-foreground">{feature.description}</p>
                 </div>
               </div>
             ))}
           </div>

           {/* 혜택 목록 */}
           <div className="flex flex-col md:flex-row md:justify-between gap-2 pt-2">
             {benefits.map((benefit, index) => (
               <div key={index} className="flex items-center gap-2 text-sm">
                 <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                 <span className="text-muted-foreground">{benefit}</span>
               </div>
             ))}
           </div>

           {/* 연동 버튼 */}
           <Button 
             onClick={() => navigate("/onboarding")} 
             className="w-full gap-2 h-12 text-base"
             size="lg"
           >
             지금 바로 연동하기
             <ArrowRight className="h-4 w-4" />
           </Button>
           
           <p className="text-xs text-center text-muted-foreground">
             홈택스, 카드사, 은행 계정을 안전하게 연동해요
           </p>
         </div>
       </CardContent>
     </Card>
   );
 }