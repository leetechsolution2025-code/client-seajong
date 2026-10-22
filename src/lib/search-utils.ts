/**
 * Utility hỗ trợ tìm kiếm tiếng Việt không dấu / có dấu và đa biến thể
 */

/**
 * Loại bỏ dấu tiếng Việt
 */
export function removeAccents(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Sinh danh sách các biến thể của từ khoá tìm kiếm:
 * - Nguyên bản (trimmed)
 * - Chữ thường, chữ hoa
 * - Dạng không dấu, không dấu chữ thường, không dấu chữ hoa
 */
export function getSearchVariants(term: string | null | undefined): string[] {
  if (!term) return [];
  const trimmed = term.trim();
  if (!trimmed) return [];

  const set = new Set<string>();
  set.add(trimmed);
  set.add(trimmed.toLowerCase());
  set.add(trimmed.toUpperCase());

  const noAccent = removeAccents(trimmed);
  set.add(noAccent);
  set.add(noAccent.toLowerCase());
  set.add(noAccent.toUpperCase());

  return Array.from(set).filter(Boolean);
}

/**
 * So khớp chuỗi trong bộ nhớ:
 * Trả về true nếu text chứa searchTerm (hỗ trợ cả có dấu, không dấu, hoa, thường)
 */
export function matchesSearch(text: string | null | undefined, searchTerm: string | null | undefined): boolean {
  if (!searchTerm || !searchTerm.trim()) return true;
  if (!text) return false;

  const rawText = text.toLowerCase();
  const rawSearch = searchTerm.trim().toLowerCase();
  if (rawText.includes(rawSearch)) return true;

  const cleanText = removeAccents(rawText);
  const cleanSearch = removeAccents(rawSearch);
  return cleanText.includes(cleanSearch);
}
