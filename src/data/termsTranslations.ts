import type { SupportedLang } from "@/hooks/useBrowserLanguage";

interface TermsSection {
  title: string;
  content?: string;
  list?: string[];
  orderedList?: (string | { text: string; subList?: string[] })[];
}

export interface TermsTranslation {
  pageTitle: string;
  effectiveDate: string;
  sections: TermsSection[];
}

export const termsTranslations: Record<SupportedLang, TermsTranslation> = {
  ko: {
    pageTitle: "서비스 이용약관",
    effectiveDate: "시행일: 2026년 1월 1일",
    sections: [
      {
        title: "제1조 (목적)",
        content: "본 약관은 주식회사 더김비서(이하 \"회사\")가 제공하는 '김비서' 서비스(이하 \"서비스\")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.",
      },
      {
        title: "제2조 (정의)",
        orderedList: [
          "\"서비스\"란 회사가 제공하는 AI 기반 경영 비서 서비스로서, 금융 데이터 연동, 매출·지출 분석, 세금계산서 관리, AI 챗봇 상담 등 관련 제반 서비스를 의미합니다.",
          "\"이용자\"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.",
          "\"회원\"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 말합니다.",
          "\"사업장 정보\"란 이용자가 서비스 이용을 위해 입력한 사업자등록번호, 상호명, 업태 등의 정보를 말합니다.",
        ],
      },
      {
        title: "제3조 (약관의 효력 및 변경)",
        orderedList: [
          "본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.",
          "회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.",
          "약관이 변경되는 경우 회사는 변경 내용과 시행일을 명시하여 시행일 7일 전부터 서비스 내 공지합니다.",
          "이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.",
        ],
      },
      {
        title: "제4조 (서비스의 제공)",
        orderedList: [
          {
            text: "회사는 다음과 같은 서비스를 제공합니다.",
            subList: [
              "은행 계좌 및 카드 거래내역 연동 및 조회",
              "홈택스 세금계산서 연동 및 조회",
              "매출, 지출 분석 및 리포트 제공",
              "AI 기반 경영 상담 챗봇 서비스",
              "음성 인식 기반 명령 처리",
              "기타 회사가 정하는 서비스",
            ],
          },
          "서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 다만, 시스템 정기점검, 긴급 복구, 서비스 개선 등의 사유로 서비스가 일시 중단될 수 있습니다.",
          "회사는 서비스의 제공에 필요한 경우 정기점검을 실시할 수 있으며, 정기점검 시간은 서비스 내 공지합니다.",
        ],
      },
      {
        title: "제5조 (회원가입)",
        orderedList: [
          "이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.",
          {
            text: "회사는 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.",
            subList: [
              "가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우",
              "등록 내용에 허위, 기재누락, 오기가 있는 경우",
              "기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우",
            ],
          },
          "회원가입계약의 성립 시기는 회사의 승낙이 회원에게 도달한 시점으로 합니다.",
        ],
      },
      {
        title: "제6조 (회원 탈퇴 및 자격 상실)",
        orderedList: [
          "회원은 언제든지 서비스 내 설정 메뉴를 통해 탈퇴를 요청할 수 있으며, 회사는 즉시 회원탈퇴를 처리합니다.",
          {
            text: "회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다.",
            subList: [
              "가입 신청 시에 허위 내용을 등록한 경우",
              "서비스를 이용하여 법령 또는 본 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우",
              "다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우",
            ],
          },
        ],
      },
      {
        title: "제7조 (이용자의 의무)",
        content: "이용자는 다음 행위를 하여서는 안 됩니다.",
        list: [
          "신청 또는 변경 시 허위 내용의 등록",
          "타인의 정보 도용",
          "회사가 게시한 정보의 변경",
          "회사가 정한 정보 이외의 정보 등의 송신 또는 게시",
          "회사 및 기타 제3자의 저작권 등 지적재산권에 대한 침해",
          "회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위",
          "외설 또는 폭력적인 정보를 서비스에 공개 또는 게시하는 행위",
          "서비스의 안정적 운영을 방해하는 행위",
        ],
      },
      {
        title: "제8조 (서비스 이용의 제한)",
        orderedList: [
          "회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우 서비스 이용을 제한할 수 있습니다.",
          "회사는 전시, 사변, 천재지변 또는 이에 준하는 국가비상사태가 발생하거나 발생할 우려가 있는 경우 서비스의 전부 또는 일부를 제한할 수 있습니다.",
        ],
      },
      {
        title: "제9조 (금융정보 연동 관련)",
        orderedList: [
          "서비스의 금융정보 연동 기능은 이용자가 직접 인증정보를 입력하여 제3자 API를 통해 금융기관에서 데이터를 조회하는 방식으로 제공됩니다.",
          "회사는 이용자의 금융기관 로그인 정보를 저장하지 않으며, 연동 과정에서 발생하는 오류나 금융기관의 정책 변경으로 인한 서비스 제한에 대해 책임지지 않습니다.",
          "이용자는 금융정보 연동 시 본인의 정보만을 사용해야 하며, 타인의 정보를 도용할 경우 관련 법령에 따라 처벌받을 수 있습니다.",
        ],
      },
      {
        title: "제10조 (AI 서비스 관련)",
        orderedList: [
          "AI 챗봇 및 음성 비서 서비스는 인공지능 기술을 기반으로 하며, 제공되는 정보는 참고용입니다.",
          "AI가 제공하는 분석, 조언, 예측 등은 정확성을 보장하지 않으며, 이용자는 중요한 의사결정 시 전문가의 조언을 구해야 합니다.",
          "회사는 AI 서비스의 오류, 부정확한 정보 제공으로 인한 손해에 대해 책임지지 않습니다.",
        ],
      },
      {
        title: "제11조 (저작권의 귀속)",
        orderedList: [
          "서비스에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.",
          "이용자는 서비스를 이용함으로써 얻은 정보를 회사의 사전 승낙 없이 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.",
        ],
      },
      {
        title: "제12조 (면책조항)",
        orderedList: [
          "회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.",
          "회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.",
          "회사는 이용자가 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않습니다.",
          "회사는 이용자가 게재한 정보, 자료, 사실의 신뢰도, 정확성 등 내용에 관해서는 책임을 지지 않습니다.",
        ],
      },
      {
        title: "제13조 (분쟁해결)",
        orderedList: [
          "회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리 기구를 설치·운영합니다.",
          "서비스 이용으로 발생한 분쟁에 대해 소송이 제기되는 경우, 회사의 본점 소재지를 관할하는 법원을 관할 법원으로 합니다.",
        ],
      },
      {
        title: "제14조 (준거법)",
        content: "본 약관의 해석 및 회사와 이용자 간의 분쟁에 대하여는 대한민국 법률을 적용합니다.",
      },
    ],
  },
  en: {
    pageTitle: "Terms of Service",
    effectiveDate: "Effective Date: January 1, 2026",
    sections: [
      {
        title: "Article 1 (Purpose)",
        content: "These Terms govern the rights, obligations, responsibilities, and other necessary matters between The Kim Secretary Co., Ltd. (\"Company\") and users regarding the use of the 'Mr. Kim' service (\"Service\").",
      },
      {
        title: "Article 2 (Definitions)",
        orderedList: [
          "\"Service\" refers to the AI-based business secretary service provided by the Company, including financial data integration, sales/expense analysis, tax invoice management, AI chatbot consultation, and all related services.",
          "\"User\" refers to members and non-members who receive the Service provided by the Company.",
          "\"Member\" refers to a person who has registered as a member by providing personal information to the Company.",
          "\"Business Information\" refers to business registration number, business name, type of business, etc. entered by the user.",
        ],
      },
      {
        title: "Article 3 (Effect and Amendment of Terms)",
        orderedList: [
          "These Terms take effect when posted on the service screen or notified to users by other means.",
          "The Company may amend these Terms as necessary within the scope of applicable laws.",
          "When the Terms are amended, the Company will announce the changes and effective date at least 7 days before the effective date.",
          "If a user does not agree to the amended Terms, they may discontinue use and withdraw their membership.",
        ],
      },
      {
        title: "Article 4 (Provision of Service)",
        orderedList: [
          {
            text: "The Company provides the following services:",
            subList: [
              "Bank account and card transaction integration and inquiry",
              "HomeTax tax invoice integration and inquiry",
              "Sales and expense analysis and reports",
              "AI-based business consultation chatbot",
              "Voice recognition-based command processing",
              "Other services determined by the Company",
            ],
          },
          "The Service is provided 24 hours a day, year-round. However, the Service may be temporarily suspended for system maintenance, emergency repairs, or service improvements.",
          "The Company may conduct regular maintenance as needed, and maintenance schedules will be announced within the Service.",
        ],
      },
      {
        title: "Article 5 (Membership Registration)",
        orderedList: [
          "Users apply for membership by filling in member information according to the registration form and expressing agreement to these Terms.",
          {
            text: "The Company registers applicants as members unless they fall under the following:",
            subList: [
              "Previously lost membership under these Terms",
              "False, incomplete, or erroneous registration information",
              "Technically significantly hindering membership registration",
            ],
          },
          "The membership agreement is established when the Company's approval reaches the member.",
        ],
      },
      {
        title: "Article 6 (Membership Withdrawal and Disqualification)",
        orderedList: [
          "Members may request withdrawal through the settings menu at any time, and the Company will process it immediately.",
          {
            text: "The Company may restrict or suspend membership in the following cases:",
            subList: [
              "Registering false information during application",
              "Engaging in activities prohibited by law or these Terms",
              "Interfering with others' use of the Service or misappropriating their information",
            ],
          },
        ],
      },
      {
        title: "Article 7 (User Obligations)",
        content: "Users shall not engage in the following activities:",
        list: [
          "Registering false information during application or modification",
          "Misappropriating others' information",
          "Altering information posted by the Company",
          "Transmitting or posting unauthorized information",
          "Infringing on intellectual property rights of the Company or third parties",
          "Damaging the reputation or interfering with the business of the Company or third parties",
          "Posting obscene or violent information on the Service",
          "Disrupting the stable operation of the Service",
        ],
      },
      {
        title: "Article 8 (Restriction of Service Use)",
        orderedList: [
          "The Company may restrict service use if a user violates the obligations under these Terms or disrupts normal service operation.",
          "The Company may restrict all or part of the Service in case of war, incidents, natural disasters, or equivalent national emergencies.",
        ],
      },
      {
        title: "Article 9 (Financial Information Integration)",
        orderedList: [
          "The financial information integration function is provided by users directly entering authentication credentials to query data from financial institutions through third-party APIs.",
          "The Company does not store users' financial institution login information and is not responsible for errors during integration or service restrictions due to policy changes by financial institutions.",
          "Users must use only their own information when integrating financial data; misuse of others' information may result in legal penalties.",
        ],
      },
      {
        title: "Article 10 (AI Service)",
        orderedList: [
          "AI chatbot and voice assistant services are based on artificial intelligence technology, and information provided is for reference only.",
          "Analysis, advice, and predictions provided by AI do not guarantee accuracy; users should seek professional advice for important decisions.",
          "The Company is not responsible for damages caused by errors or inaccurate information from AI services.",
        ],
      },
      {
        title: "Article 11 (Copyright)",
        orderedList: [
          "Copyright and intellectual property rights for the Service belong to the Company.",
          "Users shall not use information obtained through the Service for commercial purposes or allow third parties to use it without prior consent from the Company.",
        ],
      },
      {
        title: "Article 12 (Disclaimer)",
        orderedList: [
          "The Company is exempt from service provision liability in case of force majeure such as natural disasters.",
          "The Company is not responsible for service disruptions caused by user negligence.",
          "The Company is not responsible for expected profits lost through service use.",
          "The Company is not responsible for the reliability or accuracy of information posted by users.",
        ],
      },
      {
        title: "Article 13 (Dispute Resolution)",
        orderedList: [
          "The Company operates a damage compensation processing mechanism to address legitimate opinions or complaints.",
          "For disputes arising from service use, the court with jurisdiction over the Company's headquarters shall be the competent court.",
        ],
      },
      {
        title: "Article 14 (Governing Law)",
        content: "The laws of the Republic of Korea shall apply to the interpretation of these Terms and disputes between the Company and users.",
      },
    ],
  },
  ja: {
    pageTitle: "サービス利用規約",
    effectiveDate: "施行日：2026年1月1日",
    sections: [
      { title: "第1条（目的）", content: "本規約は、株式会社ザ・キムビソ（以下「会社」）が提供する「キムビソ」サービス（以下「サービス」）の利用に関して、会社と利用者間の権利、義務及び責任事項、その他必要な事項を規定することを目的とします。" },
      { title: "第2条（定義）", orderedList: ["「サービス」とは、会社が提供するAIベースの経営秘書サービスであり、金融データ連携、売上・支出分析、税金計算書管理、AIチャットボット相談等の関連サービスを意味します。", "「利用者」とは、本規約に基づきサービスを受ける会員及び非会員を指します。", "「会員」とは、個人情報を提供して会員登録をした者を指します。", "「事業場情報」とは、利用者がサービス利用のために入力した事業者登録番号、商号名等の情報を指します。"] },
      { title: "第3条（規約の効力及び変更）", orderedList: ["本規約はサービス画面に掲示するなどの方法で効力が発生します。", "会社は必要な場合、関連法令に違反しない範囲で本規約を変更できます。", "規約変更時は施行7日前から公知します。", "利用者は変更された規約に同意しない場合、サービスの利用を中断し退会できます。"] },
      { title: "第4条（サービスの提供）", orderedList: [{ text: "会社は以下のサービスを提供します。", subList: ["銀行口座及びカード取引内訳の連携及び照会", "ホームタックス税金計算書の連携及び照会", "売上、支出分析及びレポート提供", "AIベースの経営相談チャットボット", "音声認識ベースの命令処理", "その他会社が定めるサービス"] }, "サービスは年中無休24時間提供を原則とします。", "会社は必要に応じて定期点検を実施できます。"] },
      { title: "第5条（会員登録）", orderedList: ["利用者は会社所定の登録フォームに従い会員情報を記入し、本規約への同意を表明することで会員登録を申請します。", { text: "会社は以下に該当しない限り会員として登録します。", subList: ["以前に会員資格を喪失したことがある場合", "登録内容に虚偽や記載漏れがある場合", "技術上著しく支障がある場合"] }, "会員登録契約は会社の承諾が会員に到達した時点で成立します。"] },
      { title: "第6条（会員退会及び資格喪失）", orderedList: ["会員はいつでも設定メニューから退会を要請でき、会社は直ちに処理します。", { text: "以下の場合、会社は会員資格を制限または停止できます。", subList: ["虚偽の内容を登録した場合", "法令または本規約に違反する行為を行った場合", "他者のサービス利用を妨害した場合"] }] },
      { title: "第7条（利用者の義務）", content: "利用者は以下の行為をしてはなりません。", list: ["虚偽内容の登録", "他人の情報の盗用", "会社が掲示した情報の変更", "無許可情報の送信または掲示", "知的財産権の侵害", "名誉毀損や業務妨害", "わいせつまたは暴力的な情報の公開", "サービスの安定的運営の妨害"] },
      { title: "第8条（サービス利用の制限）", orderedList: ["会社は義務違反や正常な運営妨害時にサービス利用を制限できます。", "戦争、天災等の国家非常事態時にサービスの全部または一部を制限できます。"] },
      { title: "第9条（金融情報連携関連）", orderedList: ["金融情報連携機能は利用者が直接認証情報を入力し第三者APIを通じて照会する方式で提供されます。", "会社は金融機関ログイン情報を保存せず、連携過程でのエラーや金融機関の方針変更による制限に責任を負いません。", "利用者は本人の情報のみを使用し、他人の情報を盗用した場合は法的処罰を受ける可能性があります。"] },
      { title: "第10条（AIサービス関連）", orderedList: ["AIチャットボット及び音声アシスタントは人工知能技術に基づき、提供される情報は参考用です。", "AIが提供する分析、助言、予測等は正確性を保証せず、重要な意思決定時は専門家に相談してください。", "会社はAIサービスの誤りや不正確な情報による損害に責任を負いません。"] },
      { title: "第11条（著作権の帰属）", orderedList: ["サービスに関する著作権及び知的財産権は会社に帰属します。", "利用者はサービスを通じて得た情報を会社の事前承諾なく営利目的で利用してはなりません。"] },
      { title: "第12条（免責条項）", orderedList: ["天災等の不可抗力によりサービスを提供できない場合、責任が免除されます。", "利用者の過失によるサービス障害について責任を負いません。", "期待収益の喪失について責任を負いません。", "利用者が掲載した情報の正確性について責任を負いません。"] },
      { title: "第13条（紛争解決）", orderedList: ["会社は正当な意見や苦情に対応するため損害賠償処理機構を設置・運営します。", "紛争に対する訴訟は会社の本店所在地を管轄する裁判所とします。"] },
      { title: "第14条（準拠法）", content: "本規約の解釈及び紛争については大韓民国の法律を適用します。" },
    ],
  },
  zh: {
    pageTitle: "服务使用条款",
    effectiveDate: "生效日期：2026年1月1日",
    sections: [
      { title: "第一条（目的）", content: "本条款旨在规定The Kim Secretary Co., Ltd.（以下简称\u201C公司\u201D）提供的\u201C金秘书\u201D服务（以下简称\u201C服务\u201D）使用相关的公司与用户之间的权利、义务及责任事项等必要事项。" },
      { title: "第二条（定义）", orderedList: ["\u201C服务\u201D是指公司提供的基于AI的经营秘书服务，包括金融数据对接、销售/支出分析、税务发票管理、AI聊天机器人咨询等相关服务。", "\u201C用户\u201D是指根据本条款接受公司服务的会员和非会员。", "\u201C会员\u201D是指向公司提供个人信息并注册的用户。", "\u201C营业信息\u201D是指用户为使用服务而输入的营业执照号码、商号名称、行业类型等信息。"] },
      { title: "第三条（条款的效力及变更）", orderedList: ["本条款通过在服务界面公布或以其他方式通知用户后生效。", "公司可在不违反相关法律的范围内变更本条款。", "条款变更时，公司将在生效前7天公告变更内容和生效日期。", "用户不同意变更条款的，可以停止使用服务并注销账户。"] },
      { title: "第四条（服务的提供）", orderedList: [{ text: "公司提供以下服务：", subList: ["银行账户及信用卡交易记录对接及查询", "HomeTax税务发票对接及查询", "销售、支出分析及报告", "基于AI的经营咨询聊天机器人", "语音识别命令处理", "其他公司规定的服务"] }, "服务原则上全年无休、每天24小时提供。但因系统维护、紧急修复等原因可能临时中断。", "公司可根据需要进行定期维护，维护时间将在服务内公告。"] },
      { title: "第五条（会员注册）", orderedList: ["用户按照公司规定的注册表格填写信息并表示同意本条款，即申请注册会员。", { text: "除以下情况外，公司将注册为会员：", subList: ["曾因本条款丧失会员资格", "注册信息虚假、遗漏或错误", "技术上显著妨碍注册"] }, "会员注册合同在公司的批准到达会员时成立。"] },
      { title: "第六条（会员注销及资格丧失）", orderedList: ["会员可随时通过设置菜单申请注销，公司将立即处理。", { text: "以下情况公司可限制或暂停会员资格：", subList: ["注册时登记虚假信息", "利用服务从事违法或违反本条款的行为", "妨碍他人使用服务或盗用他人信息"] }] },
      { title: "第七条（用户义务）", content: "用户不得从事以下行为：", list: ["注册虚假信息", "盗用他人信息", "篡改公司发布的信息", "发送或发布未经授权的信息", "侵犯知识产权", "损害名誉或妨碍业务", "发布淫秽或暴力信息", "妨碍服务稳定运营"] },
      { title: "第八条（服务使用限制）", orderedList: ["用户违反义务或妨碍正常运营时，公司可限制服务使用。", "发生战争、自然灾害等国家紧急状态时，可限制全部或部分服务。"] },
      { title: "第九条（金融信息对接相关）", orderedList: ["金融信息对接功能由用户直接输入认证信息，通过第三方API查询金融机构数据。", "公司不存储用户的金融机构登录信息，对对接过程中的错误或金融机构政策变更导致的服务限制不承担责任。", "用户仅可使用本人信息进行金融数据对接，盗用他人信息将依法受到处罚。"] },
      { title: "第十条（AI服务相关）", orderedList: ["AI聊天机器人和语音助手基于人工智能技术，提供的信息仅供参考。", "AI提供的分析、建议和预测不保证准确性，用户在做出重要决策时应咨询专业人士。", "公司对AI服务错误或不准确信息造成的损害不承担责任。"] },
      { title: "第十一条（著作权归属）", orderedList: ["服务的著作权和知识产权归公司所有。", "用户不得未经公司事先同意将通过服务获得的信息用于商业目的或提供给第三方。"] },
      { title: "第十二条（免责条款）", orderedList: ["因不可抗力无法提供服务时免除责任。", "因用户过错导致的服务障碍不承担责任。", "对用户预期收益的损失不承担责任。", "对用户发布信息的准确性不承担责任。"] },
      { title: "第十三条（争议解决）", orderedList: ["公司设立并运营损害赔偿处理机构。", "因服务使用产生的诉讼，以公司总部所在地法院为管辖法院。"] },
      { title: "第十四条（准据法）", content: "本条款的解释及争议适用大韩民国法律。" },
    ],
  },
  vi: {
    pageTitle: "Điều khoản sử dụng dịch vụ",
    effectiveDate: "Ngày có hiệu lực: 1 tháng 1 năm 2026",
    sections: [
      { title: "Điều 1 (Mục đích)", content: "Điều khoản này quy định quyền, nghĩa vụ, trách nhiệm và các vấn đề cần thiết khác giữa Công ty TNHH The Kim Secretary (\"Công ty\") và người dùng liên quan đến việc sử dụng dịch vụ 'Mr. Kim' (\"Dịch vụ\")." },
      { title: "Điều 2 (Định nghĩa)", orderedList: ["\"Dịch vụ\" là dịch vụ thư ký kinh doanh dựa trên AI do Công ty cung cấp, bao gồm tích hợp dữ liệu tài chính, phân tích doanh thu/chi phí, quản lý hóa đơn thuế, tư vấn chatbot AI và các dịch vụ liên quan.", "\"Người dùng\" là thành viên và người không phải thành viên sử dụng Dịch vụ.", "\"Thành viên\" là người đã đăng ký bằng cách cung cấp thông tin cá nhân cho Công ty.", "\"Thông tin doanh nghiệp\" là số đăng ký kinh doanh, tên thương mại, v.v. do người dùng nhập."] },
      { title: "Điều 3 (Hiệu lực và sửa đổi điều khoản)", orderedList: ["Điều khoản có hiệu lực khi được đăng trên dịch vụ hoặc thông báo cho người dùng.", "Công ty có thể sửa đổi điều khoản trong phạm vi pháp luật cho phép.", "Khi sửa đổi, Công ty sẽ thông báo trước ít nhất 7 ngày.", "Người dùng không đồng ý có thể ngừng sử dụng và rút thành viên."] },
      { title: "Điều 4 (Cung cấp dịch vụ)", orderedList: [{ text: "Công ty cung cấp các dịch vụ sau:", subList: ["Tích hợp và truy vấn giao dịch tài khoản ngân hàng và thẻ", "Tích hợp và truy vấn hóa đơn thuế HomeTax", "Phân tích doanh thu, chi phí và báo cáo", "Chatbot tư vấn kinh doanh dựa trên AI", "Xử lý lệnh bằng nhận dạng giọng nói", "Các dịch vụ khác do Công ty quy định"] }, "Dịch vụ được cung cấp 24/7. Tuy nhiên, có thể tạm ngừng do bảo trì hệ thống.", "Công ty có thể thực hiện bảo trì định kỳ và sẽ thông báo trong Dịch vụ."] },
      { title: "Điều 5 (Đăng ký thành viên)", orderedList: ["Người dùng đăng ký bằng cách điền thông tin và đồng ý với điều khoản.", { text: "Công ty đăng ký thành viên trừ các trường hợp sau:", subList: ["Đã từng mất tư cách thành viên", "Thông tin đăng ký sai, thiếu hoặc lỗi", "Gây trở ngại kỹ thuật đáng kể"] }, "Hợp đồng thành viên được thiết lập khi sự chấp thuận của Công ty đến tay thành viên."] },
      { title: "Điều 6 (Rút thành viên và mất tư cách)", orderedList: ["Thành viên có thể yêu cầu rút bất cứ lúc nào qua menu cài đặt.", { text: "Công ty có thể hạn chế hoặc đình chỉ tư cách thành viên trong các trường hợp:", subList: ["Đăng ký thông tin sai", "Vi phạm pháp luật hoặc điều khoản", "Cản trở người khác sử dụng dịch vụ"] }] },
      { title: "Điều 7 (Nghĩa vụ của người dùng)", content: "Người dùng không được thực hiện các hành vi sau:", list: ["Đăng ký thông tin sai", "Đánh cắp thông tin người khác", "Thay đổi thông tin do Công ty đăng", "Gửi hoặc đăng thông tin trái phép", "Xâm phạm quyền sở hữu trí tuệ", "Gây tổn hại danh dự hoặc cản trở kinh doanh", "Đăng nội dung khiêu dâm hoặc bạo lực", "Cản trở vận hành ổn định của dịch vụ"] },
      { title: "Điều 8 (Hạn chế sử dụng dịch vụ)", orderedList: ["Công ty có thể hạn chế khi người dùng vi phạm nghĩa vụ.", "Có thể hạn chế trong tình trạng khẩn cấp quốc gia."] },
      { title: "Điều 9 (Tích hợp thông tin tài chính)", orderedList: ["Chức năng tích hợp do người dùng tự nhập thông tin xác thực qua API bên thứ ba.", "Công ty không lưu thông tin đăng nhập ngân hàng và không chịu trách nhiệm về lỗi tích hợp.", "Người dùng chỉ được sử dụng thông tin của mình, lạm dụng thông tin người khác có thể bị xử phạt."] },
      { title: "Điều 10 (Dịch vụ AI)", orderedList: ["Chatbot AI và trợ lý giọng nói dựa trên công nghệ trí tuệ nhân tạo, thông tin chỉ mang tính tham khảo.", "Phân tích, tư vấn của AI không đảm bảo chính xác, người dùng nên tham khảo chuyên gia.", "Công ty không chịu trách nhiệm về thiệt hại do lỗi hoặc thông tin không chính xác từ AI."] },
      { title: "Điều 11 (Quyền tác giả)", orderedList: ["Quyền tác giả và sở hữu trí tuệ thuộc về Công ty.", "Người dùng không được sử dụng thông tin từ dịch vụ cho mục đích thương mại mà không có sự đồng ý trước."] },
      { title: "Điều 12 (Miễn trừ trách nhiệm)", orderedList: ["Miễn trừ trách nhiệm trong trường hợp bất khả kháng.", "Không chịu trách nhiệm về sự cố do lỗi của người dùng.", "Không chịu trách nhiệm về mất lợi nhuận kỳ vọng.", "Không chịu trách nhiệm về độ chính xác của thông tin do người dùng đăng."] },
      { title: "Điều 13 (Giải quyết tranh chấp)", orderedList: ["Công ty vận hành cơ chế xử lý bồi thường thiệt hại.", "Tòa án có thẩm quyền là tòa án nơi đặt trụ sở chính của Công ty."] },
      { title: "Điều 14 (Luật áp dụng)", content: "Luật Hàn Quốc được áp dụng cho việc giải thích điều khoản và tranh chấp." },
    ],
  },
};
