/**
 * Hàm sinh mã SKU theo tiêu chuẩn Seajong (Model-based)
 * Cấu trúc: SJ-[CATEGORY][MODEL][VERSION]-[COLOR]
 * 
 * @param categoryCode - Mã danh mục (BC, SC, LB, VB...)
 * @param modelNumber - Số thứ tự model (ví dụ: 139)
 * @param colorCode - Mã màu (SR, GR, GD, BK...), có thể để trống
 * @param version - Phiên bản (thường là A, B, C...), mặc định là trống
 * @returns string - Mã SKU chuẩn (Ví dụ: SJ-BC0139B-SR)
 */
export function sj_generateSKU(
  categoryCode: string = "HH",
  modelNumber: number = 0,
  colorCode: string = "",
  version: string = ""
): string {
  const prefix = "SJ";
  const cat = categoryCode.toUpperCase().trim();
  
  // Format số model thành 4 chữ số (ví dụ: 1 -> 0001, 139 -> 0139)
  const modelStr = String(modelNumber).padStart(4, "0");
  
  // Xử lý phiên bản (nếu có)
  const verStr = version.toUpperCase().trim();
  
  // Xử lý màu sắc (nếu có)
  const colorStr = colorCode.trim() ? `-${colorCode.toUpperCase().trim()}` : "";
  
  return `${prefix}-${cat}${modelStr}${verStr}${colorStr}`;
}
