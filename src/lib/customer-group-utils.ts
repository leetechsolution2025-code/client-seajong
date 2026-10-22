/**
 * Quản lý & Chuẩn hoá Nhóm Khách Hàng (Customer Group)
 * Đồng bộ giữa cơ sở dữ liệu, danh mục hệ thống và giao diện hiển thị.
 */

export interface CustomerGroupInfo {
  code: string;
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const STANDARD_CUSTOMER_GROUPS: CustomerGroupInfo[] = [
  {
    code: "dai-ly",
    name: "Đại lý",
    color: "#003087",
    badgeBg: "rgba(0, 48, 135, 0.1)",
    badgeText: "#003087",
    badgeBorder: "rgba(0, 48, 135, 0.25)",
  },
  {
    code: "ca-nhan",
    name: "Cá nhân",
    color: "#d97706",
    badgeBg: "rgba(217, 119, 6, 0.1)",
    badgeText: "#d97706",
    badgeBorder: "rgba(217, 119, 6, 0.25)",
  },
  {
    code: "du-an",
    name: "Dự án",
    color: "#7c3aed",
    badgeBg: "rgba(124, 58, 237, 0.1)",
    badgeText: "#7c3aed",
    badgeBorder: "rgba(124, 58, 237, 0.25)",
  },
  {
    code: "doanh-nghiep",
    name: "Doanh nghiệp",
    color: "#059669",
    badgeBg: "rgba(5, 150, 105, 0.1)",
    badgeText: "#059669",
    badgeBorder: "rgba(5, 150, 105, 0.25)",
  },
  {
    code: "khach-le",
    name: "Khách lẻ",
    color: "#0891b2",
    badgeBg: "rgba(8, 145, 178, 0.1)",
    badgeText: "#0891b2",
    badgeBorder: "rgba(8, 145, 178, 0.25)",
  },
  {
    code: "nha-phan-phoi",
    name: "Nhà phân phối",
    color: "#4f46e5",
    badgeBg: "rgba(79, 70, 229, 0.1)",
    badgeText: "#4f46e5",
    badgeBorder: "rgba(79, 70, 229, 0.25)",
  },
  {
    code: "doi-tac",
    name: "Đối tác",
    color: "#ea580c",
    badgeBg: "rgba(234, 88, 12, 0.1)",
    badgeText: "#ea580c",
    badgeBorder: "rgba(234, 88, 12, 0.25)",
  },
];

/**
 * Chuẩn hoá mã nhóm khách hàng từ bất kỳ định dạng nào (code DB cũ, hash, tên tiếng Việt, slug...)
 */
export function normalizeCustomerGroupCode(codeOrName: string | null | undefined, fallbackName?: string | null): string {
  if (!codeOrName && !fallbackName) return "";
  const raw = `${codeOrName || ""} ${fallbackName || ""}`.toLowerCase().trim();
  if (!raw) return "";

  // 1. Đại lý
  if (
    raw.includes("khg-20260401-1851-xgzc") ||
    raw.includes("dai-ly") ||
    raw.includes("dai_ly") ||
    raw.includes("daily") ||
    raw.includes("đại lý") ||
    raw.includes("đại lí") ||
    raw.includes("dealer") ||
    raw.includes("showroom")
  ) {
    return "dai-ly";
  }

  // 2. Cá nhân
  if (
    raw.includes("khg-20260401-3898-wxjs") ||
    raw.includes("ca-nhan") ||
    raw.includes("ca_nhan") ||
    raw.includes("canhan") ||
    raw.includes("cá nhân") ||
    raw.includes("personal")
  ) {
    return "ca-nhan";
  }

  // 3. Dự án
  if (
    raw.includes("khg-20260401-9433-skns") ||
    raw.includes("du-an") ||
    raw.includes("du_an") ||
    raw.includes("duan") ||
    raw.includes("dự án") ||
    raw.includes("project")
  ) {
    return "du-an";
  }

  // 4. Doanh nghiệp
  if (
    raw.includes("doanh-nghiep") ||
    raw.includes("doanh_nghiep") ||
    raw.includes("doanh nghiệp") ||
    raw.includes("công ty") ||
    raw.includes("enterprise")
  ) {
    return "doanh-nghiep";
  }

  // 5. Khách lẻ
  if (
    raw.includes("khach-le") ||
    raw.includes("khach_le") ||
    raw.includes("khách lẻ") ||
    raw.includes("retail")
  ) {
    return "khach-le";
  }

  // 6. Nhà phân phối
  if (
    raw.includes("nha-phan-phoi") ||
    raw.includes("nha_phan_phoi") ||
    raw.includes("nhà phân phối") ||
    raw.includes("distributor") ||
    raw.includes("npp")
  ) {
    return "nha-phan-phoi";
  }

  // 7. Đối tác
  if (
    raw.includes("doi-tac") ||
    raw.includes("doi_tac") ||
    raw.includes("đối tác") ||
    raw.includes("partner")
  ) {
    return "doi-tac";
  }

  return (codeOrName || fallbackName || "").trim();
}

/**
 * Lấy thông tin nhóm khách hàng để hiển thị nhãn và badge màu
 */
export function getCustomerGroupInfo(
  nhom: string | null | undefined,
  customCategories?: Array<{ id?: string; code?: string; name?: string; color?: string | null }>
): CustomerGroupInfo | null {
  if (!nhom) return null;

  const normalized = normalizeCustomerGroupCode(nhom);

  // 1. Tìm trong danh sách chuẩn
  const foundStandard = STANDARD_CUSTOMER_GROUPS.find(g => g.code === normalized);
  if (foundStandard) return foundStandard;

  // 2. Tìm trong danh mục Category lấy từ DB nếu có
  if (customCategories && Array.isArray(customCategories)) {
    const foundCustom = customCategories.find(
      c => c.code === nhom || c.code === normalized || c.name?.toLowerCase() === nhom.toLowerCase()
    );
    if (foundCustom && foundCustom.name) {
      const color = foundCustom.color || "#64748b";
      return {
        code: foundCustom.code || normalized || nhom,
        name: foundCustom.name,
        color,
        badgeBg: `color-mix(in srgb, ${color} 12%, transparent)`,
        badgeText: color,
        badgeBorder: `color-mix(in srgb, ${color} 25%, transparent)`,
      };
    }
  }

  // 3. Fallback có giá trị nhom nhưng chưa thuộc bộ chuẩn
  const rawClean = nhom.trim();
  if (!rawClean) return null;
  return {
    code: normalized || rawClean,
    name: rawClean,
    color: "#64748b",
    badgeBg: "rgba(100, 116, 139, 0.1)",
    badgeText: "#64748b",
    badgeBorder: "rgba(100, 116, 139, 0.25)",
  };
}

/**
 * Lấy tên hiển thị của nhóm
 */
export function getCustomerGroupLabel(
  nhom: string | null | undefined,
  customCategories?: Array<{ id?: string; code?: string; name?: string; color?: string | null }>
): string {
  const info = getCustomerGroupInfo(nhom, customCategories);
  return info?.name || "";
}

/**
 * Xây dựng danh sách options cho select dropdown nhóm khách hàng.
 * Đảm bảo các option dùng chuẩn value ("dai-ly", "ca-nhan", "du-an"...)
 * và merge đầy đủ với dữ liệu Categories từ cơ sở dữ liệu.
 */
export function buildCustomerGroupOptions(
  categoriesFromDb?: Array<{ id?: string; code?: string; name?: string; color?: string | null }>
): Array<{ label: string; value: string; color?: string }> {
  const map = new Map<string, { label: string; value: string; color?: string }>();

  // 1. Luôn đưa các nhóm tiêu chuẩn vào trước
  STANDARD_CUSTOMER_GROUPS.forEach(g => {
    map.set(g.code, { label: g.name, value: g.code, color: g.color });
  });

  // 2. Bổ sung từ DB (ghi đè tên nếu quản trị viên đổi tên danh mục)
  if (Array.isArray(categoriesFromDb)) {
    categoriesFromDb.forEach(c => {
      if (!c.name) return;
      const normalizedCode = normalizeCustomerGroupCode(c.code, c.name);
      if (normalizedCode) {
        map.set(normalizedCode, {
          label: c.name,
          value: normalizedCode,
          color: c.color || map.get(normalizedCode)?.color,
        });
      } else if (c.code) {
        map.set(c.code, {
          label: c.name,
          value: c.code,
          color: c.color || undefined,
        });
      }
    });
  }

  // 3. Trả về danh sách, ưu tiên các nhóm thông dụng lên đầu
  const priorityOrder = ["dai-ly", "ca-nhan", "du-an", "doanh-nghiep", "nha-phan-phoi", "khach-le", "doi-tac"];
  const list = Array.from(map.values());
  return list.sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.value);
    const idxB = priorityOrder.indexOf(b.value);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.label.localeCompare(b.label, "vi");
  });
}

/**
 * Sinh danh sách mã tìm kiếm cho câu query Prisma tương ứng với nhóm truyền vào
 */
export function getCustomerGroupFilterQuery(nhomParam: string | null | undefined): string[] {
  if (!nhomParam) return [];
  const normalized = normalizeCustomerGroupCode(nhomParam);

  switch (normalized) {
    case "dai-ly":
      return ["dai-ly", "dai_ly", "daily", "khg-20260401-1851-xgzc", "Đại lý", "Đại lí", "dealer"];
    case "ca-nhan":
      return ["ca-nhan", "ca_nhan", "canhan", "khg-20260401-3898-wxjs", "Cá nhân", "personal"];
    case "du-an":
      return ["du-an", "du_an", "duan", "khg-20260401-9433-skns", "Dự án", "project"];
    case "doanh-nghiep":
      return ["doanh-nghiep", "doanh_nghiep", "Doanh nghiệp", "Công ty"];
    case "khach-le":
      return ["khach-le", "khach_le", "Khách lẻ"];
    case "nha-phan-phoi":
      return ["nha-phan-phoi", "nha_phan_phoi", "Nhà phân phối", "npp"];
    case "doi-tac":
      return ["doi-tac", "doi_tac", "Đối tác"];
    default:
      return [nhomParam, normalized].filter(Boolean);
  }
}
