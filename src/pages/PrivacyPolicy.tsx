 import { ArrowLeft } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 
 export default function PrivacyPolicy() {
   const navigate = useNavigate();
 
   return (
     <div className="fixed inset-0 overflow-y-auto bg-background z-50">
       {/* 헤더 */}
       <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
         <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
           <Button
             variant="ghost"
             size="icon"
             onClick={() => navigate(-1)}
             className="shrink-0"
           >
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <h1 className="text-lg font-semibold">개인정보처리방침</h1>
         </div>
       </header>
 
       {/* 본문 */}
       <main className="container max-w-3xl mx-auto px-4 py-8">
         <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
           <section>
             <p className="text-muted-foreground text-sm">
               시행일: 2026년 1월 1일
             </p>
             <p className="mt-4">
               주식회사 더김비서(이하 "회사")는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
             </p>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제1조 (개인정보의 처리 목적)</h2>
             <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
             <ul className="list-disc pl-5 space-y-2 mt-3">
               <li><strong>회원 가입 및 관리:</strong> 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 등</li>
               <li><strong>서비스 제공:</strong> 금융 데이터 조회 및 분석, AI 기반 경영 비서 서비스 제공, 맞춤형 서비스 제공 등</li>
               <li><strong>고객 상담 및 민원 처리:</strong> 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보 등</li>
               <li><strong>마케팅 및 광고:</strong> 신규 서비스 안내, 이벤트 정보 제공 (선택 동의 시)</li>
             </ul>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제2조 (개인정보의 처리 및 보유 기간)</h2>
             <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
             <ul className="list-disc pl-5 space-y-2 mt-3">
               <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 (단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간)</li>
               <li><strong>계약 또는 청약철회 등에 관한 기록:</strong> 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
               <li><strong>대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년</li>
               <li><strong>소비자의 불만 또는 분쟁처리에 관한 기록:</strong> 3년</li>
               <li><strong>접속에 관한 기록:</strong> 3개월 (통신비밀보호법)</li>
             </ul>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제3조 (처리하는 개인정보의 항목)</h2>
             <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
             <div className="mt-3 space-y-4">
               <div>
                 <h3 className="font-medium">1. 필수항목</h3>
                 <ul className="list-disc pl-5 space-y-1 mt-2">
                   <li>이메일 주소, 비밀번호 (회원가입 시)</li>
                   <li>사업자등록번호, 상호명 (서비스 이용 시)</li>
                   <li>서비스 이용 기록, 접속 로그, 접속 IP 정보</li>
                 </ul>
               </div>
               <div>
                 <h3 className="font-medium">2. 선택항목</h3>
                 <ul className="list-disc pl-5 space-y-1 mt-2">
                   <li>휴대전화번호 (알림 서비스 이용 시)</li>
                   <li>금융기관 계좌정보, 카드정보 (금융 데이터 연동 시)</li>
                   <li>홈택스 로그인 정보 (세금계산서 조회 시)</li>
                 </ul>
               </div>
             </div>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제4조 (개인정보의 제3자 제공)</h2>
             <p>회사는 원칙적으로 이용자의 개인정보를 제1조에서 명시한 목적 범위 내에서 처리하며, 이용자의 사전 동의 없이는 본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다. 단, 다음의 경우에는 예외로 합니다.</p>
             <ul className="list-disc pl-5 space-y-2 mt-3">
               <li>이용자가 사전에 제3자 제공에 동의한 경우</li>
               <li>법령에 의하여 제공이 요구되는 경우</li>
               <li>서비스 제공에 따른 요금정산을 위하여 필요한 경우</li>
             </ul>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제5조 (개인정보처리의 위탁)</h2>
             <p>회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
             <div className="mt-3 overflow-x-auto">
               <table className="w-full text-sm border">
                 <thead>
                   <tr className="bg-muted/50">
                     <th className="border px-3 py-2 text-left">수탁업체</th>
                     <th className="border px-3 py-2 text-left">위탁업무 내용</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr>
                     <td className="border px-3 py-2">코드에프(CODEF)</td>
                     <td className="border px-3 py-2">금융 데이터 연동 및 조회</td>
                   </tr>
                   <tr>
                     <td className="border px-3 py-2">Supabase Inc.</td>
                     <td className="border px-3 py-2">클라우드 데이터베이스 및 인증 서비스</td>
                   </tr>
                   <tr>
                     <td className="border px-3 py-2">Google Cloud</td>
                     <td className="border px-3 py-2">AI 서비스 제공</td>
                   </tr>
                 </tbody>
               </table>
             </div>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제6조 (정보주체의 권리·의무 및 행사방법)</h2>
             <p>이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.</p>
             <ul className="list-disc pl-5 space-y-2 mt-3">
               <li>개인정보 열람 요구</li>
               <li>오류 등이 있을 경우 정정 요구</li>
               <li>삭제 요구</li>
               <li>처리정지 요구</li>
             </ul>
             <p className="mt-3">권리 행사는 회사에 대해 서면, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</p>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제7조 (개인정보의 안전성 확보조치)</h2>
             <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
             <ul className="list-disc pl-5 space-y-2 mt-3">
               <li><strong>관리적 조치:</strong> 내부관리계획 수립·시행, 정기적 직원 교육</li>
               <li><strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
               <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제</li>
             </ul>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제8조 (개인정보 보호책임자)</h2>
             <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
             <div className="mt-3 p-4 bg-muted/30 rounded-lg">
               <h3 className="font-medium">개인정보 보호책임자</h3>
               <ul className="mt-2 space-y-1">
                 <li>성명: 송하진</li>
                 <li>직책: 대표이사</li>
                 <li>연락처: hajin@thenexa.io</li>
               </ul>
             </div>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제9조 (권익침해 구제방법)</h2>
             <p>정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.</p>
             <ul className="list-disc pl-5 space-y-2 mt-3">
               <li>개인정보분쟁조정위원회: (국번없이) 1833-6972</li>
               <li>개인정보침해신고센터: privacy.kisa.or.kr / (국번없이) 118</li>
               <li>대검찰청: www.spo.go.kr / (국번없이) 1301</li>
               <li>경찰청: ecrm.cyber.go.kr / (국번없이) 182</li>
             </ul>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제10조 (개인정보 처리방침의 변경)</h2>
             <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
           </section>
 
           {/* 회사 정보 */}
           <section className="mt-12 pt-8 border-t">
             <h2 className="text-lg font-semibold mb-4">회사 정보</h2>
             <div className="text-sm text-muted-foreground space-y-1">
               <p><strong>상호:</strong> 주식회사 더김비서</p>
               <p><strong>대표자:</strong> 송하진</p>
               <p><strong>사업자등록번호:</strong> 166-88-03509</p>
               <p><strong>소재지:</strong> 서울특별시 서초구 강남대로 311, 702호(서초동, 한화생명보험빌딩)</p>
               <p><strong>업태:</strong> 정보통신업, 전자상거래업</p>
               <p><strong>이메일:</strong> hajin@thenexa.io</p>
             </div>
           </section>
         </div>
       </main>
     </div>
   );
 }