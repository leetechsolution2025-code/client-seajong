import { type ClassValue, clsx } from "clsx";

/** Merge CSS class names (không cần tailwind-merge vì không còn dùng Tailwind) */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Chuẩn hoá chuỗi tiếng Việt: bỏ dấu, lowercase.
 * Ví dụ: "Thép ống" → "thep ong", "tHep" → "thep"
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ combining diacritical marks
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
