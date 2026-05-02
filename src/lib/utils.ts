import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 한글 받침 여부 확인
export function hasBatchim(str: string): boolean {
  const lastChar = str[str.length - 1];
  if (!lastChar) return false;
  const code = lastChar.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return (code - 0xAC00) % 28 !== 0;
}

// 한글 조사 헬퍼: 이/가, 은/는, 을/를, 와/과, 이에요/예요
export function josa(name: string, particle: "이/가" | "은/는" | "을/를" | "와/과" | "이에요/예요"): string {
  const b = hasBatchim(name);
  const map: Record<string, [string, string]> = {
    "이/가": ["이", "가"],
    "은/는": ["은", "는"],
    "을/를": ["을", "를"],
    "와/과": ["과", "와"],
    "이에요/예요": ["이에요", "예요"],
  };
  const [withBatchim, withoutBatchim] = map[particle];
  return `${name}${b ? withBatchim : withoutBatchim}`;
}

// ============ 랜덤 아바타 ============
// DiceBear를 이용한 재미있는 랜덤 아바타 생성
// seed(user_id 등)를 기반으로 일관된 아바타 반환
const AVATAR_STYLES = [
  "adventurer",
  "fun-emoji",
  "bottts",
  "lorelei",
  "micah",
  "notionists",
  "pixel-art",
] as const;

type AvatarStyle = typeof AVATAR_STYLES[number];

function getAvatarStyleFromSeed(seed: string): AvatarStyle {
  // seed 문자열의 문자 코드 합산으로 인덱스 결정 (일관성 보장)
  const sum = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_STYLES[sum % AVATAR_STYLES.length];
}

/**
 * 사용자 ID 기반으로 재미있는 랜덤 아바타 URL 반환
 * avatar_url이 없을 때 대체 이미지로 사용
 */
export function getRandomAvatarUrl(seed: string): string {
  const style = getAvatarStyleFromSeed(seed);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
