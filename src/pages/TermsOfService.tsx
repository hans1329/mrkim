 import { ArrowLeft } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 
 export default function TermsOfService() {
   const navigate = useNavigate();
 
   return (
     <div className="min-h-screen bg-background">
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
           <h1 className="text-lg font-semibold">서비스 이용약관</h1>
         </div>
       </header>
 
       {/* 본문 */}
       <main className="container max-w-3xl mx-auto px-4 py-8">
         <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
           <section>
             <p className="text-muted-foreground text-sm">
               시행일: 2026년 1월 1일
             </p>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제1조 (목적)</h2>
             <p>
               본 약관은 주식회사 더김비서(이하 "회사")가 제공하는 '김비서' 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
             </p>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제2조 (정의)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li><strong>"서비스"</strong>란 회사가 제공하는 AI 기반 경영 비서 서비스로서, 금융 데이터 연동, 매출·지출 분석, 세금계산서 관리, AI 챗봇 상담 등 관련 제반 서비스를 의미합니다.</li>
               <li><strong>"이용자"</strong>란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
               <li><strong>"회원"</strong>이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
               <li><strong>"사업장 정보"</strong>란 이용자가 서비스 이용을 위해 입력한 사업자등록번호, 상호명, 업태 등의 정보를 말합니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제3조 (약관의 효력 및 변경)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
               <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
               <li>약관이 변경되는 경우 회사는 변경 내용과 시행일을 명시하여 시행일 7일 전부터 서비스 내 공지합니다. 다만, 이용자에게 불리한 약관 변경의 경우에는 30일 전부터 공지합니다.</li>
               <li>이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다. 변경된 약관의 시행일 이후에도 서비스를 계속 이용하는 경우 약관 변경에 동의한 것으로 봅니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제4조 (서비스의 제공)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>회사는 다음과 같은 서비스를 제공합니다.
                 <ul className="list-disc pl-5 mt-2 space-y-1">
                   <li>은행 계좌 및 카드 거래내역 연동 및 조회</li>
                   <li>홈택스 세금계산서 연동 및 조회</li>
                   <li>매출, 지출 분석 및 리포트 제공</li>
                   <li>AI 기반 경영 상담 챗봇 서비스</li>
                   <li>음성 인식 기반 명령 처리</li>
                   <li>기타 회사가 정하는 서비스</li>
                 </ul>
               </li>
               <li>서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 다만, 시스템 정기점검, 긴급 복구, 서비스 개선 등의 사유로 서비스가 일시 중단될 수 있습니다.</li>
               <li>회사는 서비스의 제공에 필요한 경우 정기점검을 실시할 수 있으며, 정기점검 시간은 서비스 내 공지합니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제5조 (회원가입)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
               <li>회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.
                 <ul className="list-disc pl-5 mt-2 space-y-1">
                   <li>가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                   <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                   <li>기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                 </ul>
               </li>
               <li>회원가입계약의 성립 시기는 회사의 승낙이 회원에게 도달한 시점으로 합니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제6조 (회원 탈퇴 및 자격 상실)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>회원은 언제든지 서비스 내 설정 메뉴를 통해 탈퇴를 요청할 수 있으며, 회사는 즉시 회원탈퇴를 처리합니다.</li>
               <li>회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다.
                 <ul className="list-disc pl-5 mt-2 space-y-1">
                   <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                   <li>서비스를 이용하여 법령 또는 본 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
                   <li>다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</li>
                 </ul>
               </li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제7조 (이용자의 의무)</h2>
             <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
             <ul className="list-disc pl-5 space-y-2 mt-3">
               <li>신청 또는 변경 시 허위 내용의 등록</li>
               <li>타인의 정보 도용</li>
               <li>회사가 게시한 정보의 변경</li>
               <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
               <li>회사 및 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
               <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
               <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
               <li>서비스의 안정적 운영을 방해하는 행위</li>
             </ul>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제8조 (서비스 이용의 제한)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우 서비스 이용을 제한할 수 있습니다.</li>
               <li>회사는 전시, 사변, 천재지변 또는 이에 준하는 국가비상사태가 발생하거나 발생할 우려가 있는 경우 서비스의 전부 또는 일부를 제한할 수 있습니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제9조 (금융정보 연동 관련)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>서비스의 금융정보 연동 기능은 이용자가 직접 인증정보를 입력하여 제3자 API(코드에프 등)를 통해 금융기관에서 데이터를 조회하는 방식으로 제공됩니다.</li>
               <li>회사는 이용자의 금융기관 로그인 정보를 저장하지 않으며, 연동 과정에서 발생하는 오류나 금융기관의 정책 변경으로 인한 서비스 제한에 대해 책임지지 않습니다.</li>
               <li>이용자는 금융정보 연동 시 본인의 정보만을 사용해야 하며, 타인의 정보를 도용할 경우 관련 법령에 따라 처벌받을 수 있습니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제10조 (AI 서비스 관련)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>AI 챗봇 및 음성 비서 서비스는 인공지능 기술을 기반으로 하며, 제공되는 정보는 참고용입니다.</li>
               <li>AI가 제공하는 분석, 조언, 예측 등은 정확성을 보장하지 않으며, 이용자는 중요한 의사결정 시 전문가의 조언을 구해야 합니다.</li>
               <li>회사는 AI 서비스의 오류, 부정확한 정보 제공으로 인한 손해에 대해 책임지지 않습니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제11조 (저작권의 귀속)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>서비스에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.</li>
               <li>이용자는 서비스를 이용함으로써 얻은 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제12조 (면책조항)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
               <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
               <li>회사는 이용자가 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖에 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</li>
               <li>회사는 이용자가 게재한 정보, 자료, 사실의 신뢰도, 정확성 등 내용에 관해서는 책임을 지지 않습니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제13조 (분쟁해결)</h2>
             <ol className="list-decimal pl-5 space-y-2">
               <li>회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리 기구를 설치·운영합니다.</li>
               <li>서비스 이용으로 발생한 분쟁에 대해 소송이 제기되는 경우, 회사의 본점 소재지를 관할하는 법원을 관할 법원으로 합니다.</li>
             </ol>
           </section>
 
           <section>
             <h2 className="text-lg font-semibold border-b pb-2">제14조 (준거법)</h2>
             <p>본 약관의 해석 및 회사와 이용자 간의 분쟁에 대하여는 대한민국 법률을 적용합니다.</p>
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