// 앱 버전 관리
// 릴리즈 시 이 값을 업데이트하세요
export const APP_VERSION = "1.2.0";
export const APP_BUILD_DATE = "2026-04-14";

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.2.0",
    date: "2026-04-14",
    title: "V2 대시보드 & 비서 UX 개선",
    changes: [
      "V2 대시보드 인트로 시퀀스 추가",
      "컬러 글래스 브리핑 카드 적용",
      "앱 버전 관리 기능 추가",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-20",
    title: "세무사 매칭 & 배달앱 연동",
    changes: [
      "세무사 매칭·상담 기능",
      "배민·쿠팡이츠 데이터 연동",
      "커뮤니티 게시판 추가",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-02-01",
    title: "김비서 정식 출시",
    changes: [
      "대시보드 및 거래내역 관리",
      "홈택스·카드·계좌 연동",
      "AI 비서 채팅",
    ],
  },
];

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}
