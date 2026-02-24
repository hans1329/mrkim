import type { SupportedLang } from "@/hooks/useBrowserLanguage";

interface PrivacySection {
  title?: string;
  content: string;
  list?: string[];
  subsections?: { title: string; list: string[] }[];
  table?: { headers: string[]; rows: string[][] };
  contact?: { title: string; items: string[] };
  companyInfo?: { title: string; items: string[] };
}

export interface PrivacyTranslation {
  pageTitle: string;
  effectiveDate: string;
  intro: string;
  sections: PrivacySection[];
}

export const privacyTranslations: Record<SupportedLang, PrivacyTranslation> = {
  ko: {
    pageTitle: "개인정보처리방침",
    effectiveDate: "시행일: 2026년 1월 1일",
    intro: "주식회사 더김비서(이하 \"회사\")는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.",
    sections: [
      {
        title: "제1조 (개인정보의 처리 목적)",
        content: "회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.",
        list: [
          "회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 등",
          "서비스 제공: 금융 데이터 조회 및 분석, AI 기반 경영 비서 서비스 제공, 맞춤형 서비스 제공 등",
          "고객 상담 및 민원 처리: 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보 등",
          "마케팅 및 광고: 신규 서비스 안내, 이벤트 정보 제공 (선택 동의 시)",
        ],
      },
      {
        title: "제2조 (개인정보의 처리 및 보유 기간)",
        content: "회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.",
        list: [
          "회원 정보: 회원 탈퇴 시까지 (단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 기간)",
          "계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)",
          "대금결제 및 재화 등의 공급에 관한 기록: 5년",
          "소비자의 불만 또는 분쟁처리에 관한 기록: 3년",
          "접속에 관한 기록: 3개월 (통신비밀보호법)",
        ],
      },
      {
        title: "제3조 (처리하는 개인정보의 항목)",
        content: "회사는 다음의 개인정보 항목을 처리하고 있습니다.",
        subsections: [
          {
            title: "1. 필수항목",
            list: [
              "이메일 주소, 비밀번호 (회원가입 시)",
              "사업자등록번호, 상호명 (서비스 이용 시)",
              "서비스 이용 기록, 접속 로그, 접속 IP 정보",
            ],
          },
          {
            title: "2. 선택항목",
            list: [
              "휴대전화번호 (알림 서비스 이용 시)",
              "금융기관 계좌정보, 카드정보 (금융 데이터 연동 시)",
              "홈택스 로그인 정보 (세금계산서 조회 시)",
            ],
          },
        ],
      },
      {
        title: "제4조 (개인정보의 제3자 제공)",
        content: "회사는 원칙적으로 이용자의 개인정보를 제1조에서 명시한 목적 범위 내에서 처리하며, 이용자의 사전 동의 없이는 본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다. 단, 다음의 경우에는 예외로 합니다.",
        list: [
          "이용자가 사전에 제3자 제공에 동의한 경우",
          "법령에 의하여 제공이 요구되는 경우",
          "서비스 제공에 따른 요금정산을 위하여 필요한 경우",
        ],
      },
      {
        title: "제5조 (개인정보처리의 위탁)",
        content: "회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.",
        table: {
          headers: ["수탁업체", "위탁업무 내용"],
          rows: [
            ["코드에프(CODEF)", "금융 데이터 연동 및 조회"],
            ["Supabase Inc.", "클라우드 데이터베이스 및 인증 서비스"],
            ["Google Cloud", "AI 서비스 제공"],
          ],
        },
      },
      {
        title: "제6조 (정보주체의 권리·의무 및 행사방법)",
        content: "이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.",
        list: [
          "개인정보 열람 요구",
          "오류 등이 있을 경우 정정 요구",
          "삭제 요구",
          "처리정지 요구",
        ],
      },
      {
        title: "제7조 (개인정보의 안전성 확보조치)",
        content: "회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.",
        list: [
          "관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육",
          "기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치",
          "물리적 조치: 전산실, 자료보관실 등의 접근통제",
        ],
      },
      {
        title: "제8조 (개인정보 보호책임자)",
        content: "회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.",
        contact: {
          title: "개인정보 보호책임자",
          items: ["성명: 송하진", "직책: 대표이사", "연락처: hajin@thenexa.io"],
        },
      },
      {
        title: "제9조 (권익침해 구제방법)",
        content: "정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.",
        list: [
          "개인정보분쟁조정위원회: (국번없이) 1833-6972",
          "개인정보침해신고센터: privacy.kisa.or.kr / (국번없이) 118",
          "대검찰청: www.spo.go.kr / (국번없이) 1301",
          "경찰청: ecrm.cyber.go.kr / (국번없이) 182",
        ],
      },
      {
        title: "제10조 (개인정보 처리방침의 변경)",
        content: "이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.",
      },
    ],
  },
  en: {
    pageTitle: "Privacy Policy",
    effectiveDate: "Effective Date: January 1, 2026",
    intro: "TKBS Inc. (hereinafter \"Company\") establishes and discloses the following privacy policy to protect users' personal information in accordance with the Personal Information Protection Act and to handle related grievances promptly and smoothly.",
    sections: [
      {
        title: "Article 1 (Purpose of Processing Personal Information)",
        content: "The Company processes personal information for the following purposes. Personal information being processed will not be used for purposes other than the following, and if the purpose of use changes, necessary measures such as obtaining separate consent will be implemented.",
        list: [
          "Membership registration and management: Confirmation of membership intent, identification/authentication for membership services, maintenance/management of membership, prevention of fraudulent use, various notices/notifications",
          "Service provision: Financial data inquiry and analysis, AI-based business secretary service, customized service provision",
          "Customer consultation and complaint handling: Identity verification, complaint confirmation, contact/notification for fact-finding, notification of processing results",
          "Marketing and advertising: New service announcements, event information provision (with optional consent)",
        ],
      },
      {
        title: "Article 2 (Processing and Retention Period)",
        content: "The Company processes and retains personal information within the retention/use period prescribed by law or agreed upon when collecting personal information from data subjects.",
        list: [
          "Member information: Until membership withdrawal (however, for the relevant period if preservation is required by related laws)",
          "Records regarding contracts or subscription withdrawal: 5 years (Act on Consumer Protection in Electronic Commerce)",
          "Records regarding payment and supply of goods: 5 years",
          "Records regarding consumer complaints or dispute resolution: 3 years",
          "Records regarding access: 3 months (Protection of Communications Secrets Act)",
        ],
      },
      {
        title: "Article 3 (Personal Information Items Processed)",
        content: "The Company processes the following personal information items.",
        subsections: [
          {
            title: "1. Required Items",
            list: [
              "Email address, password (at registration)",
              "Business registration number, business name (when using services)",
              "Service usage records, access logs, access IP information",
            ],
          },
          {
            title: "2. Optional Items",
            list: [
              "Mobile phone number (when using notification services)",
              "Financial institution account/card information (when linking financial data)",
              "HomeTax login information (when viewing tax invoices)",
            ],
          },
        ],
      },
      {
        title: "Article 4 (Provision of Personal Information to Third Parties)",
        content: "The Company processes personal information within the purpose stated in Article 1 and does not process or provide it to third parties beyond the original scope without the user's prior consent. However, exceptions are made in the following cases.",
        list: [
          "When the user has given prior consent to third-party provision",
          "When required by law",
          "When necessary for billing related to service provision",
        ],
      },
      {
        title: "Article 5 (Outsourcing of Personal Information Processing)",
        content: "The Company outsources personal information processing as follows for smooth handling of personal information.",
        table: {
          headers: ["Outsourced Company", "Outsourced Work"],
          rows: [
            ["CODEF", "Financial data integration and inquiry"],
            ["Supabase Inc.", "Cloud database and authentication services"],
            ["Google Cloud", "AI service provision"],
          ],
        },
      },
      {
        title: "Article 6 (Rights and Obligations of Data Subjects)",
        content: "Users may exercise the following rights as personal information subjects.",
        list: [
          "Request to view personal information",
          "Request for correction in case of errors",
          "Request for deletion",
          "Request to suspend processing",
        ],
      },
      {
        title: "Article 7 (Safety Measures for Personal Information)",
        content: "The Company takes the following measures to ensure the safety of personal information.",
        list: [
          "Administrative measures: Establishment and implementation of internal management plans, regular employee training",
          "Technical measures: Access control management for personal information processing systems, installation of access control systems, encryption of unique identification information, installation of security programs",
          "Physical measures: Access control for server rooms and data storage facilities",
        ],
      },
      {
        title: "Article 8 (Privacy Officer)",
        content: "The Company designates a Privacy Officer to oversee personal information processing and handle complaints and damage relief related to personal information processing.",
        contact: {
          title: "Privacy Officer",
          items: ["Name: Hajin Song", "Title: CEO", "Contact: hajin@thenexa.io"],
        },
      },
      {
        title: "Article 9 (Remedies for Rights Infringement)",
        content: "Data subjects may apply for dispute resolution or consultation to the Personal Information Dispute Mediation Committee, Korea Internet & Security Agency, etc.",
        list: [
          "Personal Information Dispute Mediation Committee: 1833-6972",
          "Personal Information Infringement Report Center: privacy.kisa.or.kr / 118",
          "Supreme Prosecutors' Office: www.spo.go.kr / 1301",
          "National Police Agency: ecrm.cyber.go.kr / 182",
        ],
      },
      {
        title: "Article 10 (Changes to Privacy Policy)",
        content: "This privacy policy is effective from the date of implementation, and if there are additions, deletions, or corrections due to changes in laws and policies, they will be announced through notices at least 7 days before implementation.",
      },
    ],
  },
  ja: {
    pageTitle: "個人情報処理方針",
    effectiveDate: "施行日：2026年1月1日",
    intro: "株式会社ザ・キムビソ（以下「会社」）は、「個人情報保護法」に基づき、利用者の個人情報を保護し、関連する苦情を迅速かつ円滑に処理できるよう、以下のとおり個人情報処理方針を策定・公開いたします。",
    sections: [
      {
        title: "第1条（個人情報の処理目的）",
        content: "会社は以下の目的のために個人情報を処理します。処理している個人情報は以下の目的以外には利用されず、利用目的が変更される場合は別途の同意を得るなど必要な措置を講じます。",
        list: [
          "会員登録及び管理：会員登録意思の確認、本人識別・認証、会員資格の維持・管理、不正利用の防止、各種通知等",
          "サービス提供：金融データの照会及び分析、AIベースの経営秘書サービス提供、カスタマイズサービス提供等",
          "顧客相談及び苦情処理：身元確認、苦情確認、事実調査のための連絡・通知、処理結果の通知等",
          "マーケティング及び広告：新サービスの案内、イベント情報の提供（選択同意時）",
        ],
      },
      {
        title: "第2条（個人情報の処理及び保有期間）",
        content: "会社は法令に基づく保有・利用期間、または情報主体から同意を得た期間内で個人情報を処理・保有します。",
        list: [
          "会員情報：退会時まで（ただし、関連法令により保存が必要な場合は該当期間）",
          "契約または申込撤回等に関する記録：5年",
          "代金決済及び財貨等の供給に関する記録：5年",
          "消費者の不満または紛争処理に関する記録：3年",
          "接続に関する記録：3ヶ月",
        ],
      },
      {
        title: "第3条（処理する個人情報の項目）",
        content: "会社は以下の個人情報項目を処理しています。",
        subsections: [
          {
            title: "1. 必須項目",
            list: [
              "メールアドレス、パスワード（会員登録時）",
              "事業者登録番号、商号名（サービス利用時）",
              "サービス利用記録、接続ログ、接続IP情報",
            ],
          },
          {
            title: "2. 選択項目",
            list: [
              "携帯電話番号（通知サービス利用時）",
              "金融機関口座情報、カード情報（金融データ連携時）",
              "ホームタックスログイン情報（税金計算書照会時）",
            ],
          },
        ],
      },
      {
        title: "第4条（個人情報の第三者提供）",
        content: "会社は原則として利用者の個人情報を第1条で明示した目的範囲内で処理し、事前の同意なく第三者に提供しません。ただし、以下の場合は例外とします。",
        list: [
          "利用者が事前に第三者提供に同意した場合",
          "法令により提供が求められる場合",
          "サービス提供に伴う料金精算のために必要な場合",
        ],
      },
      {
        title: "第5条（個人情報処理の委託）",
        content: "会社は円滑な個人情報業務処理のために以下のとおり処理業務を委託しています。",
        table: {
          headers: ["受託会社", "委託業務内容"],
          rows: [
            ["CODEF", "金融データ連携及び照会"],
            ["Supabase Inc.", "クラウドデータベース及び認証サービス"],
            ["Google Cloud", "AIサービス提供"],
          ],
        },
      },
      {
        title: "第6条（情報主体の権利・義務及び行使方法）",
        content: "利用者は個人情報主体として以下の権利を行使できます。",
        list: ["個人情報の閲覧要求", "誤り等がある場合の訂正要求", "削除要求", "処理停止要求"],
      },
      {
        title: "第7条（個人情報の安全性確保措置）",
        content: "会社は個人情報の安全性確保のために以下の措置を講じています。",
        list: [
          "管理的措置：内部管理計画の策定・実施、定期的な従業員教育",
          "技術的措置：アクセス権限管理、アクセス制御システムの設置、暗号化、セキュリティプログラムの設置",
          "物理的措置：サーバー室、資料保管室等のアクセス制御",
        ],
      },
      {
        title: "第8条（個人情報保護責任者）",
        content: "会社は個人情報処理に関する業務を統括し、情報主体の苦情処理及び被害救済のために以下のとおり個人情報保護責任者を指定しています。",
        contact: {
          title: "個人情報保護責任者",
          items: ["氏名：ソン・ハジン", "役職：代表取締役", "連絡先：hajin@thenexa.io"],
        },
      },
      {
        title: "第9条（権益侵害救済方法）",
        content: "情報主体は個人情報侵害による救済を受けるために、個人情報紛争調停委員会等に紛争解決や相談を申請できます。",
        list: [
          "個人情報紛争調停委員会：1833-6972",
          "個人情報侵害申告センター：privacy.kisa.or.kr / 118",
          "大検察庁：www.spo.go.kr / 1301",
          "警察庁：ecrm.cyber.go.kr / 182",
        ],
      },
      {
        title: "第10条（個人情報処理方針の変更）",
        content: "本個人情報処理方針は施行日より適用され、法令及び方針に基づく変更がある場合は施行7日前から公知いたします。",
      },
    ],
  },
  zh: {
    pageTitle: "隐私政策",
    effectiveDate: "生效日期：2026年1月1日",
    intro: "TKBS Inc.（以下简称\u201C公司\u201D）根据《个人信息保护法》制定并公开以下隐私政策，以保护用户的个人信息并迅速、顺畅地处理相关投诉。",
    sections: [
      {
        title: "第一条（个人信息处理目的）",
        content: "公司出于以下目的处理个人信息。正在处理的个人信息不会用于以下目的以外的用途，如使用目的发生变更，将采取另行征得同意等必要措施。",
        list: [
          "会员注册及管理：确认注册意向、身份识别/认证、会员资格维护/管理、防止不当使用、各种通知等",
          "服务提供：金融数据查询及分析、AI商务秘书服务、定制化服务等",
          "客户咨询及投诉处理：身份确认、投诉确认、事实调查联系/通知、处理结果通知等",
          "营销及广告：新服务通知、活动信息提供（经选择性同意时）",
        ],
      },
      {
        title: "第二条（个人信息处理及保留期间）",
        content: "公司在法律规定的保留/使用期间或从信息主体处收集个人信息时同意的期间内处理和保留个人信息。",
        list: [
          "会员信息：至退出会员时（但根据相关法律需要保存时为相应期间）",
          "合同或撤回订阅等相关记录：5年",
          "付款及商品供应相关记录：5年",
          "消费者投诉或纠纷处理相关记录：3年",
          "访问相关记录：3个月",
        ],
      },
      {
        title: "第三条（处理的个人信息项目）",
        content: "公司处理以下个人信息项目。",
        subsections: [
          {
            title: "1. 必填项目",
            list: [
              "电子邮箱地址、密码（注册时）",
              "营业执照号码、商号名称（使用服务时）",
              "服务使用记录、访问日志、访问IP信息",
            ],
          },
          {
            title: "2. 可选项目",
            list: [
              "手机号码（使用通知服务时）",
              "金融机构账户信息、银行卡信息（连接金融数据时）",
              "HomeTax登录信息（查看税务发票时）",
            ],
          },
        ],
      },
      {
        title: "第四条（向第三方提供个人信息）",
        content: "公司原则上在第一条所述目的范围内处理用户个人信息，未经用户事先同意不会超出原始范围处理或向第三方提供。但以下情况除外。",
        list: [
          "用户事先同意向第三方提供的情况",
          "法律要求提供的情况",
          "因服务提供需要进行费用结算的情况",
        ],
      },
      {
        title: "第五条（个人信息处理委托）",
        content: "公司为顺利处理个人信息业务，委托以下个人信息处理业务。",
        table: {
          headers: ["受托公司", "委托业务内容"],
          rows: [
            ["CODEF", "金融数据连接及查询"],
            ["Supabase Inc.", "云数据库及认证服务"],
            ["Google Cloud", "AI服务提供"],
          ],
        },
      },
      {
        title: "第六条（信息主体的权利、义务及行使方法）",
        content: "用户作为个人信息主体可行使以下权利。",
        list: ["要求查阅个人信息", "发现错误时要求更正", "要求删除", "要求停止处理"],
      },
      {
        title: "第七条（个人信息安全保障措施）",
        content: "公司为确保个人信息安全采取以下措施。",
        list: [
          "管理措施：制定和实施内部管理计划，定期员工培训",
          "技术措施：访问权限管理、访问控制系统安装、加密、安全程序安装",
          "物理措施：服务器室、资料保管室等的访问控制",
        ],
      },
      {
        title: "第八条（个人信息保护负责人）",
        content: "公司指定以下个人信息保护负责人，负责个人信息处理相关业务并处理投诉及损害救济。",
        contact: {
          title: "个人信息保护负责人",
          items: ["姓名：宋河镇", "职务：代表理事", "联系方式：hajin@thenexa.io"],
        },
      },
      {
        title: "第九条（权益侵害救济方法）",
        content: "信息主体可向个人信息纠纷调解委员会等机构申请纠纷解决或咨询。",
        list: [
          "个人信息纠纷调解委员会：1833-6972",
          "个人信息侵害举报中心：privacy.kisa.or.kr / 118",
          "大检察厅：www.spo.go.kr / 1301",
          "警察厅：ecrm.cyber.go.kr / 182",
        ],
      },
      {
        title: "第十条（隐私政策的变更）",
        content: "本隐私政策自生效日起适用，如因法律和政策变更而有增删或修正，将在实施前7天通过公告通知。",
      },
    ],
  },
  vi: {
    pageTitle: "Chính sách bảo mật",
    effectiveDate: "Ngày có hiệu lực: 1 tháng 1 năm 2026",
    intro: "TKBS Inc. (sau đây gọi là \"Công ty\") xây dựng và công khai chính sách xử lý thông tin cá nhân sau đây để bảo vệ thông tin cá nhân của người dùng theo Luật Bảo vệ Thông tin Cá nhân.",
    sections: [
      {
        title: "Điều 1 (Mục đích xử lý thông tin cá nhân)",
        content: "Công ty xử lý thông tin cá nhân cho các mục đích sau. Thông tin cá nhân đang được xử lý sẽ không được sử dụng cho mục đích khác ngoài các mục đích sau.",
        list: [
          "Đăng ký và quản lý thành viên: Xác nhận ý định đăng ký, xác minh danh tính, duy trì/quản lý tư cách thành viên, ngăn chặn sử dụng gian lận",
          "Cung cấp dịch vụ: Truy vấn và phân tích dữ liệu tài chính, dịch vụ thư ký kinh doanh dựa trên AI, cung cấp dịch vụ tùy chỉnh",
          "Tư vấn khách hàng và xử lý khiếu nại: Xác minh danh tính, xác nhận khiếu nại, liên hệ/thông báo để điều tra thực tế",
          "Tiếp thị và quảng cáo: Thông báo dịch vụ mới, cung cấp thông tin sự kiện (khi đồng ý tùy chọn)",
        ],
      },
      {
        title: "Điều 2 (Thời gian xử lý và lưu giữ)",
        content: "Công ty xử lý và lưu giữ thông tin cá nhân trong thời gian lưu giữ/sử dụng theo quy định của pháp luật hoặc được đồng ý khi thu thập.",
        list: [
          "Thông tin thành viên: Cho đến khi rút thành viên",
          "Hồ sơ hợp đồng hoặc rút đăng ký: 5 năm",
          "Hồ sơ thanh toán và cung cấp hàng hóa: 5 năm",
          "Hồ sơ khiếu nại hoặc giải quyết tranh chấp: 3 năm",
          "Hồ sơ truy cập: 3 tháng",
        ],
      },
      {
        title: "Điều 3 (Các mục thông tin cá nhân được xử lý)",
        content: "Công ty xử lý các mục thông tin cá nhân sau.",
        subsections: [
          {
            title: "1. Mục bắt buộc",
            list: [
              "Địa chỉ email, mật khẩu (khi đăng ký)",
              "Số đăng ký kinh doanh, tên thương mại (khi sử dụng dịch vụ)",
              "Nhật ký sử dụng dịch vụ, nhật ký truy cập, thông tin IP truy cập",
            ],
          },
          {
            title: "2. Mục tùy chọn",
            list: [
              "Số điện thoại di động (khi sử dụng dịch vụ thông báo)",
              "Thông tin tài khoản/thẻ ngân hàng (khi liên kết dữ liệu tài chính)",
              "Thông tin đăng nhập HomeTax (khi xem hóa đơn thuế)",
            ],
          },
        ],
      },
      {
        title: "Điều 4 (Cung cấp thông tin cá nhân cho bên thứ ba)",
        content: "Công ty về nguyên tắc xử lý thông tin trong phạm vi mục đích nêu tại Điều 1 và không cung cấp cho bên thứ ba mà không có sự đồng ý trước. Tuy nhiên, ngoại trừ các trường hợp sau.",
        list: [
          "Khi người dùng đã đồng ý trước về việc cung cấp cho bên thứ ba",
          "Khi pháp luật yêu cầu cung cấp",
          "Khi cần thiết cho việc thanh toán phí dịch vụ",
        ],
      },
      {
        title: "Điều 5 (Ủy thác xử lý thông tin cá nhân)",
        content: "Công ty ủy thác xử lý thông tin cá nhân như sau để xử lý công việc thuận lợi.",
        table: {
          headers: ["Công ty nhận ủy thác", "Nội dung công việc ủy thác"],
          rows: [
            ["CODEF", "Tích hợp và truy vấn dữ liệu tài chính"],
            ["Supabase Inc.", "Cơ sở dữ liệu đám mây và dịch vụ xác thực"],
            ["Google Cloud", "Cung cấp dịch vụ AI"],
          ],
        },
      },
      {
        title: "Điều 6 (Quyền và nghĩa vụ của chủ thể thông tin)",
        content: "Người dùng có thể thực hiện các quyền sau với tư cách là chủ thể thông tin cá nhân.",
        list: ["Yêu cầu xem thông tin cá nhân", "Yêu cầu chỉnh sửa khi có sai sót", "Yêu cầu xóa", "Yêu cầu ngừng xử lý"],
      },
      {
        title: "Điều 7 (Biện pháp đảm bảo an toàn thông tin cá nhân)",
        content: "Công ty thực hiện các biện pháp sau để đảm bảo an toàn thông tin cá nhân.",
        list: [
          "Biện pháp quản lý: Xây dựng và thực hiện kế hoạch quản lý nội bộ, đào tạo nhân viên định kỳ",
          "Biện pháp kỹ thuật: Quản lý quyền truy cập, cài đặt hệ thống kiểm soát truy cập, mã hóa, cài đặt chương trình bảo mật",
          "Biện pháp vật lý: Kiểm soát truy cập phòng máy chủ, kho lưu trữ",
        ],
      },
      {
        title: "Điều 8 (Người chịu trách nhiệm bảo vệ thông tin cá nhân)",
        content: "Công ty chỉ định người chịu trách nhiệm bảo vệ thông tin cá nhân như sau.",
        contact: {
          title: "Người chịu trách nhiệm bảo vệ thông tin cá nhân",
          items: ["Họ tên: Song Ha-jin", "Chức vụ: Giám đốc điều hành", "Liên hệ: hajin@thenexa.io"],
        },
      },
      {
        title: "Điều 9 (Phương pháp cứu trợ quyền lợi bị xâm phạm)",
        content: "Chủ thể thông tin có thể đăng ký giải quyết tranh chấp hoặc tư vấn tại Ủy ban Hòa giải Tranh chấp Thông tin Cá nhân.",
        list: [
          "Ủy ban Hòa giải Tranh chấp TTCN: 1833-6972",
          "Trung tâm Báo cáo Xâm phạm TTCN: privacy.kisa.or.kr / 118",
          "Viện Kiểm sát Tối cao: www.spo.go.kr / 1301",
          "Cảnh sát: ecrm.cyber.go.kr / 182",
        ],
      },
      {
        title: "Điều 10 (Thay đổi chính sách bảo mật)",
        content: "Chính sách bảo mật này có hiệu lực từ ngày thi hành và nếu có thay đổi sẽ được thông báo trước 7 ngày.",
      },
    ],
  },
};
