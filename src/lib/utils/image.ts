/**
 * Chuẩn hóa đường dẫn hình ảnh (Logo, Avatar...).
 * Đảm bảo các đường dẫn nội bộ (như uploads/...) luôn bắt đầu bằng dấu /.
 */
export function normalizeImgSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/")) {
    return src;
  }
  return `/${src}`;
}
