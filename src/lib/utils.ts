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
