 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { useNavigate } from "react-router-dom";
 import { 
   CreditCard, 
   Wallet, 
   Users, 
   ArrowRightLeft, 
   Bell,
   ArrowRight 
 } from "lucide-react";
 
 const features = [
   { icon: CreditCard, label: "최근 거래 내역", description: "카드/계좌 거래 자동 수집" },
   { icon: Wallet, label: "예치금 현황", description: "세금 예치금 관리" },
   { icon: Users, label: "직원 현황", description: "급여 및 4대보험 관리" },
   { icon: ArrowRightLeft, label: "자동이체 현황", description: "정기 결제 모니터링" },
   { icon: Bell, label: "최근 알림", description: "중요 알림 및 일정" },
 ];
 
 export function IntegratedConnectionCard() {
   const navigate = useNavigate();
 
   return (
     <Card className="border-dashed border-2 border-muted-foreground/20 bg-card">
       <CardHeader className="pb-4">
         <CardTitle className="text-base">데이터 연동이 필요해요</CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* 기능 목록 */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
           {features.map((feature, index) => (
             <div 
               key={index}
               className="flex items-center gap-3 p-3 rounded-lg bg-background/60"
             >
               <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                 <feature.icon className="h-4 w-4 text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium truncate">{feature.label}</p>
                 <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
               </div>
             </div>
           ))}
         </div>
 
         {/* 연동 버튼 */}
         <Button 
           onClick={() => navigate("/onboarding")} 
           className="w-full gap-2"
         >
           연동하고 데이터 확인하기
           <ArrowRight className="h-4 w-4" />
         </Button>
         
         <p className="text-xs text-center text-muted-foreground">
           홈택스, 카드사, 은행 연동 후 실시간 데이터를 확인할 수 있어요
         </p>
       </CardContent>
     </Card>
   );
 }