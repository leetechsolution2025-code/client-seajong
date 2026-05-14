import * as XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../public/inventory_template.xlsx");

// ── Sheet 1: Hàng hoá ────────────────────────────────────────────────────────
const headers = [
  "Tên hàng hoá *",       // A
  "Mã SKU",               // B
  "Danh mục",             // C
  "Đơn vị tính *",        // D
  "Tồn đầu kỳ",           // E
  "Tồn tối thiểu",        // F
  "Giá nhập (VNĐ)",       // G
  "Giá bán (VNĐ)",        // H
  "Nhà cung cấp",         // I
  "Thông số kỹ thuật",    // J
  "Ghi chú",              // K
  // ── Định mức ──
  "Mã định mức",          // L  (DinhMuc.code)
  "Tên định mức",         // M  (DinhMuc.tenDinhMuc)
  "Vật tư định mức",      // N  nhiều vật tư cách nhau bởi ;
                          //    Mỗi vật tư: TênVậtTư|SốLượng|ĐơnVịTính|GhiChú
];

// Ví dụ minh hoạ — cột N có nhiều vật tư cách bởi ;
const examples = [
  [
    "Bàn làm việc gỗ sồi", "BAN-001", "Nội thất", "Cái", 10, 2, 2500000, 3500000,
    "Công ty ABC", "Kích thước: 120x60x75cm", "Màu nâu",
    "DM-BAN-001", "Định mức sản xuất bàn",
    "Gỗ sồi|5|m²|Loại A;Sơn PU|1|Lít|Sơn bóng;Vít M6|20|Cái|",
  ],
  [
    "Ghế văn phòng xoay", "GHE-002", "Nội thất", "Chiếc", 20, 3, 1200000, 1800000,
    "Nội thất XYZ", "Tải trọng tối đa: 120kg", "",
    "DM-GHE-002", "Định mức ghế văn phòng",
    "Khung thép|2|kg|;Đệm mút|1|Bộ|Độ dày 5cm;Bánh xe|5|Cái|",
  ],
  [
    "Máy tính xách tay Dell", "LAPTOP-003", "Điện tử", "Chiếc", 5, 1, 18000000, 22000000,
    "Dell Việt Nam", "Intel Core i5, RAM 8GB, SSD 256GB", "Bảo hành 12 tháng",
    "", "", "",
  ],
  [
    "Cáp USB-C 1m", "CABLE-004", "Phụ kiện", "Cái", 50, 10, 50000, 120000,
    "", "", "",
    "", "", "",
  ],
  [
    "Giấy A4 SX Plus", "GIAY-005", "Văn phòng phẩm", "Hộp", 30, 5, 80000, 120000,
    "PT Sài Gòn", "500 tờ/hộp, 70gsm", "",
    "", "", "",
  ],
];

const dataRows = [headers, ...examples];

// ── Sheet 2: Hướng dẫn ────────────────────────────────────────────────────────
const guideRows = [
  ["HƯỚNG DẪN NHẬP DỮ LIỆU HÀNG HOÁ"],
  [],
  ["Cột", "Bắt buộc", "Mô tả", "Ví dụ"],
  ["Tên hàng hoá *",    "Có",    "Tên đầy đủ của hàng hoá",                                          "Bàn làm việc gỗ sồi"],
  ["Mã SKU",            "Không", "Mã định danh (tự tạo nếu bỏ trống)",                               "BAN-001"],
  ["Danh mục",          "Không", "Tên danh mục (phải trùng với danh mục trong hệ thống)",             "Nội thất"],
  ["Đơn vị tính *",     "Có",    "Cái / Chiếc / Bộ / Cuộn / Tấm / Thanh / Kg / Tấn / m / m² / m³ / Hộp / Thùng / Lít", "Cái"],
  ["Tồn đầu kỳ",        "Không", "Số lượng tồn ban đầu (số nguyên ≥ 0)",                             "10"],
  ["Tồn tối thiểu",     "Không", "Ngưỡng tồn kho tối thiểu để cảnh báo",                             "2"],
  ["Giá nhập (VNĐ)",    "Không", "Giá nhập (để trống hoặc 0 nếu chưa có)",                           "2500000"],
  ["Giá bán (VNĐ)",     "Không", "Giá bán dự kiến",                                                  "3500000"],
  ["Nhà cung cấp",      "Không", "Tên nhà cung cấp",                                                 "Công ty ABC"],
  ["Thông số kỹ thuật", "Không", "Mô tả chi tiết kỹ thuật",                                          "Kích thước: 120x60cm"],
  ["Ghi chú",           "Không", "Ghi chú thêm",                                                     "Màu nâu"],
  [],
  ["── THÔNG TIN ĐỊNH MỨC VẬT TƯ (không bắt buộc) ──"],
  ["Mã định mức",       "Không", "Mã định mức duy nhất. Bỏ trống nếu không có định mức.",            "DM-BAN-001"],
  ["Tên định mức",      "Không", "Mô tả ngắn về định mức",                                           "Định mức sản xuất bàn"],
  ["Vật tư định mức",   "Không", "Danh sách vật tư, mỗi vật tư cách nhau bởi dấu chấm phẩy (;)",    "Gỗ sồi|5|m²|Loại A;Vít M6|20|Cái|"],
  [],
  ["  📌 Định dạng mỗi vật tư: TênVậtTư|SốLượng|ĐơnVịTính|GhiChú"],
  ["  • TênVậtTư   : bắt buộc"],
  ["  • SốLượng    : số thực, mặc định 1 nếu bỏ trống"],
  ["  • ĐơnVịTính  : tuỳ chọn (Cái, kg, m², Lít...)"],
  ["  • GhiChú     : tuỳ chọn"],
  [],
  ["  📌 Ví dụ nhiều vật tư:"],
  ["  Gỗ sồi|5|m²|Loại A;Bu lông M6|20|Cái|;Sơn PU|1|Lít|Sơn bóng"],
  ["  → 3 vật tư: Gỗ sồi 5m² (Loại A) + Bu lông M6 20 cái + Sơn PU 1 lít (Sơn bóng)"],
  [],
  ["  📌 Lưu ý:"],
  ["  • Nếu Mã định mức đã tồn tại trong hệ thống, vật tư sẽ được gộp vào định mức đó"],
  ["  • Định mức chỉ được tạo mới khi có ít nhất Mã định mức hoặc Vật tư định mức"],
  [],
  ["── LƯU Ý CHUNG ──"],
  ["• Không xoá hàng tiêu đề (hàng đầu tiên trong sheet 'Hàng hoá')"],
  ["• Xoá các hàng VÍ DỤ trước khi nhập thực tế"],
  ["• Cột có dấu * là bắt buộc"],
  ["• Số lượng và giá phải là số (không nhập chữ hay ký tự đặc biệt)"],
];

// ── Build workbook ─────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new();

// Sheet 1 — Hàng hoá
const ws1 = XLSX.utils.aoa_to_sheet(dataRows);
ws1["!cols"] = [
  { wch: 30 }, // Tên hàng hoá
  { wch: 14 }, // Mã SKU
  { wch: 18 }, // Danh mục
  { wch: 14 }, // Đơn vị tính
  { wch: 12 }, // Tồn đầu kỳ
  { wch: 14 }, // Tồn tối thiểu
  { wch: 16 }, // Giá nhập
  { wch: 16 }, // Giá bán
  { wch: 20 }, // Nhà cung cấp
  { wch: 30 }, // Thông số
  { wch: 20 }, // Ghi chú
  { wch: 16 }, // Mã định mức
  { wch: 28 }, // Tên định mức
  { wch: 60 }, // Vật tư định mức
];
XLSX.utils.book_append_sheet(wb, ws1, "Hàng hoá");

// Sheet 2 — Hướng dẫn
const ws2 = XLSX.utils.aoa_to_sheet(guideRows);
ws2["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 62 }, { wch: 42 }];
XLSX.utils.book_append_sheet(wb, ws2, "Hướng dẫn");

XLSX.writeFile(wb, outPath);
console.log("✅ Generated:", outPath);
