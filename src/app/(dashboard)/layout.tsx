"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { SidebarAccordion } from "@/components/layout/SidebarAccordion";
import { ToastProvider } from "@/components/ui/Toast";
import { useAnimationPrefs } from "@/hooks/useAnimationPrefs";
import { CreateRequestModal } from "@/app/(dashboard)/hr/recruitment/components/CreateRequestModal";
import { CreateTrainingRequestModal } from "@/app/(dashboard)/hr/training/components/CreateTrainingRequestModal";

// ── Types ──────────────────────────────────────────────────────────────────
type SidebarItem = { name: string; href: string; icon?: string; requiredOrder?: number };
type SidebarSection = { group: string; icon?: string; items: SidebarItem[]; flat?: boolean };
type DeptSidebar = { label: string; icon: string; sections: SidebarSection[] };

// ── Accordion nav groups cho từng phòng ban ────────────────────────────────
const DEPT_NAV_GROUPS: Record<string, { key: string; label: string; icon: string; flat?: boolean; items: SidebarItem[] }[]> = {
  "/board": [
    {
      key: "admin", label: "Quản trị hệ thống", icon: "bi-shield-lock",
      items: [
        { name: "Thông tin doanh nghiệp", href: "/board/company" },
        { name: "Quản lý danh mục", href: "/board/categories" },
        { name: "Phân quyền người dùng", href: "/board/users" },
        { name: "Nội quy lao động", href: "/board/labor-policy" },
      ],
    },
    {
      key: "business", label: "Kinh doanh", icon: "bi-briefcase", flat: true,
      items: [{ name: "Kinh doanh", href: "/board/customers" }],
    },
    {
      key: "finance", label: "Tài chính", icon: "bi-cash-stack",
      items: [
        { name: "Công nợ và chi phí", href: "/board/debts" },
        { name: "Tài sản cố định", href: "/board/assets" },
        { name: "Báo cáo tài chính", href: "/board/finance-reports", requiredOrder: 2 },
      ],
    },
    {
      key: "operations", label: "Vận hành hệ thống", icon: "bi-gear-wide-connected",
      items: [
        { name: "Thực hiện đơn hàng", href: "/board/orders" },
        { name: "Quản trị công việc", href: "/board/tasks", requiredOrder: 2 },
        { name: "Hàng hoá trong kho", href: "/board/inventory" },
      ],
    },
    {
      key: "hr", label: "Nhân sự", icon: "bi-people", flat: true,
      items: [{ name: "Nhân sự", href: "/board/hr" }],
    },
    {
      key: "approvals", label: "Phê duyệt tài liệu", icon: "bi-check2-square", flat: true,
      items: [{ name: "Phê duyệt tài liệu", href: "/board/approvals" }],
    },
  ],


  "/hr": [
    {
      key: "recruitment", label: "Tuyển dụng", icon: "bi-person-plus",
      items: [
        { name: "Quản trị tuyển dụng", href: "/hr/recruitment" },
        { name: "Yêu cầu tuyển dụng", href: "#recruitment-request" },
        { name: "Phỏng vấn ứng viên", href: "/hr/interviews" }, 
      ],
    },
    {
      key: "training", label: "Đào tạo và thử việc", icon: "bi-mortarboard",
      items: [
        { name: "Kế hoạch đào tạo", href: "/hr/training" },
        { name: "Tạo yêu cầu đào tạo", href: "#training-request" },
        { name: "Theo dõi thử việc", href: "/hr/probation" },
      ],
    },
    {
      key: "personnel", label: "Nhân sự", icon: "bi-people",
      items: [
        { name: "Quản lý hồ sơ nhân viên", href: "/hr/employees" },
        { name: "Điều chuyển và đề bạt", href: "/hr/promotions" },
        { name: "Sa thải và thôi việc", href: "/hr/terminations" },
      ],
    },
    {
      key: "welfare", label: "Phúc lợi", icon: "bi-cash-coin",
      items: [
        { name: "Chấm công và tính lương", href: "/hr/attendance-payroll" },
        { name: "Bảo hiểm", href: "/hr/insurance" },
        { name: "Điều chỉnh thu nhập", href: "/hr/salary-adjustments" },
      ],
    },
    {
      key: "stationery_tools", label: "Văn phòng phẩm và dụng cụ", icon: "bi-archive", flat: true,
      items: [{ name: "Văn phòng phẩm và dụng cụ", href: "/hr/stationery" }],
    },
    {
      key: "hr_approvals", label: "Phê duyệt yêu cầu", icon: "bi-check2-square", flat: true,
      items: [{ name: "Phê duyệt yêu cầu", href: "/hr/approvals" }],
    },
  ],
  "/plan_finance": [
    {
      key: "customers", label: "Khách hàng", icon: "bi-people", flat: true,
      items: [{ name: "Khách hàng", href: "/plan_finance/customers" }],
    },
    {
      key: "sales", label: "Bán hàng", icon: "bi-cart3", flat: true,
      items: [{ name: "Bán hàng", href: "/plan_finance/sales" }],
    },
    {
      key: "finance", label: "Tài chính", icon: "bi-coin",
      items: [
        { name: "Tài sản cố định", href: "/plan_finance/assets" },
        { name: "Hàng hoá trong kho", href: "/plan_finance/inventory" },
        { name: "Mua hàng", href: "/plan_finance/purchasing" },
        { name: "Chấm công & lương", href: "/plan_finance/payroll" },
      ],
    },
    {
      key: "debt_expense", label: "Công nợ và chi phí", icon: "bi-receipt",
      items: [
        { name: "Nhà cung cấp", href: "/plan_finance/suppliers" },
        { name: "Quản lý công nợ và chi phí", href: "/plan_finance/debts" },
      ],
    },
  ],
};



// ── Sidebar config riêng cho từng phòng ban ────────────────────────────────
const DEPT_SIDEBARS: Record<string, DeptSidebar> = {
  "/board": {
    label: "Ban Giám đốc", icon: "bi-building",
    sections: [],
  },
  "/exec": {
    label: "Văn phòng TGĐ", icon: "bi-person-badge",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/exec", icon: "bi-speedometer2" },
          { name: "Lịch công tác", href: "/exec/calendar", icon: "bi-calendar-event" },
          { name: "Thông báo nội bộ", href: "/exec/announcements", icon: "bi-megaphone" },
        ]
      },
      {
        group: "Điều phối", items: [
          { name: "Văn bản đến/đi", href: "/exec/documents", icon: "bi-envelope-paper" },
          { name: "Chỉ đạo TGĐ", href: "/exec/directives", icon: "bi-journal-text" },
        ]
      },
    ],
  },
  "/hr": {
    label: "Nhân sự", icon: "bi-people",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/hr", icon: "bi-speedometer2" },
          { name: "Quản lý hồ sơ nhân viên", href: "/hr/employees", icon: "bi-person-lines-fill" },
          { name: "Sơ đồ tổ chức", href: "/hr/org-chart", icon: "bi-diagram-3" },
        ]
      },
      {
        group: "Tuyển dụng", items: [
          { name: "Quản trị tuyển dụng", href: "/hr/recruitment", icon: "bi-kanban" },
          { name: "Yêu cầu tuyển dụng", href: "#recruitment-request", icon: "bi-file-earmark-plus" },
          { name: "Phỏng vấn ứng viên", href: "/hr/interviews", icon: "bi-chat-quote" },
        ]
      },
      {
        group: "Quản lý", items: [
          { name: "Chấm công", href: "/hr/attendance", icon: "bi-clock-history" },
          { name: "Nghỉ phép", href: "/hr/leaves", icon: "bi-calendar-check" },
          { name: "Lương & Phúc lợi", href: "/hr/payroll", icon: "bi-cash-coin" },
          { name: "Đào tạo và thử việc", href: "/hr/training", icon: "bi-mortarboard" },
        ]
      },
    ],
  },
  "/finance": {
    label: "Tài chính – Kế toán", icon: "bi-cash-stack",
    sections: [
      {
        group: "Quản lý tài chính", items: [
          { name: "Quản lý tài sản", href: "/finance/assets", icon: "bi-building" },
          { name: "Quản lý công nợ và chi phí", href: "/finance/debts", icon: "bi-receipt" },
          { name: "Hàng hoá trong kho", href: "/finance/inventory", icon: "bi-box-seam" },
        ]
      },
      {
        group: "Kế toán", items: [
          { name: "Bán hàng", href: "/finance/sales", icon: "bi-cart3" },
          { name: "Tạm ứng", href: "/finance/advances", icon: "bi-cash" },
        ]
      },
      {
        group: "Báo cáo", items: [
          { name: "Báo cáo tài chính", href: "/finance/reports", icon: "bi-file-earmark-bar-graph", requiredOrder: 2 },
        ]
      },
    ],
  },
  "/legal": {
    label: "Pháp chế", icon: "bi-shield-check",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/legal", icon: "bi-speedometer2" },
          { name: "Hợp đồng", href: "/legal/contracts", icon: "bi-file-earmark-text" },
          { name: "Giấy phép", href: "/legal/licenses", icon: "bi-patch-check" },
        ]
      },
      {
        group: "Tuân thủ", items: [
          { name: "Quy chế nội bộ", href: "/legal/policies", icon: "bi-book" },
          { name: "Rủi ro pháp lý", href: "/legal/risks", icon: "bi-exclamation-triangle" },
          { name: "Tranh chấp", href: "/legal/disputes", icon: "bi-balance-scale" },
        ]
      },
    ],
  },
  "/it": {
    label: "Công nghệ thông tin", icon: "bi-cpu",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/it", icon: "bi-speedometer2" },
          { name: "Hệ thống", href: "/it/systems", icon: "bi-hdd-stack" },
          { name: "Giám sát", href: "/it/monitoring", icon: "bi-activity" },
        ]
      },
      {
        group: "Quản lý", items: [
          { name: "Thiết bị", href: "/it/assets", icon: "bi-laptop" },
          { name: "Yêu cầu hỗ trợ", href: "/it/tickets", icon: "bi-headset" },
          { name: "Tài khoản & Quyền", href: "/it/access", icon: "bi-person-lock" },
          { name: "Backup & Security", href: "/it/security", icon: "bi-shield-lock" },
        ]
      },
    ],
  },
  "/admin_ops": {
    label: "Hành chính – VP", icon: "bi-clipboard2-check",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/admin_ops", icon: "bi-speedometer2" },
          { name: "Văn bản", href: "/admin_ops/documents", icon: "bi-file-earmark-ruled" },
          { name: "Con dấu", href: "/admin_ops/stamps", icon: "bi-stamp" },
        ]
      },
      {
        group: "Hành chính", items: [
          { name: "Tài sản VP", href: "/admin_ops/assets", icon: "bi-archive" },
          { name: "Phòng họp", href: "/admin_ops/rooms", icon: "bi-door-open" },
          { name: "Xe công vụ", href: "/admin_ops/vehicles", icon: "bi-car-front" },
        ]
      },
    ],
  },
  "/sales": {
    label: "Kinh doanh", icon: "bi-graph-up-arrow",
    sections: [
      {
        group: "Phát triển đại lý", icon: "bi-people", items: [
          { name: "Danh sách đại lý", href: "/sales/partners", icon: "bi-person-badge" },
          { name: "Chính sách và bảng giá", href: "/sales/pricing", icon: "bi-tags" },
          { name: "Hạn mức công nợ", href: "/sales/credit-limit", icon: "bi-shield-check" },
        ]
      },
      {
        group: "Mua hàng", icon: "bi-cart-plus", items: [
          { name: "Dự báo nhu cầu", href: "/sales/procurement/forecast", icon: "bi-graph-up" },
          { name: "Đơn mua hàng", href: "/sales/procurement/orders", icon: "bi-cart-check" },
          { name: "Đối soát", href: "/sales/procurement/audit", icon: "bi-clipboard-check" },
        ]
      },
      {
        group: "Bán hàng", icon: "bi-shop", items: [
          { name: "Báo giá", href: "/sales/quotations", icon: "bi-file-text" },
          { name: "Đơn bán hàng", href: "/sales/orders", icon: "bi-truck" },
          { name: "Phễu đơn đa kênh", href: "/sales/omnichannel", icon: "bi-funnel" },
          { name: "Báo giữ hàng", icon: "bi-lock", href: "/sales/reservation" },
        ]
      },
      {
        group: "Dịch vụ và tiện ích", icon: "bi-gear", items: [
          { name: "Dịch vụ đi kèm", href: "/sales/services", icon: "bi-plus-circle" },
          { name: "Tra cứu tồn thực tế", href: "/sales/inventory", icon: "bi-qr-code-scan" },
        ]
      },
    ],
  },
  "/marketing": {
    label: "Marketing", icon: "bi-megaphone",
    sections: [
      {
        group: "Sản phẩm và thương hiệu", items: [
          { name: "Nhận diện thương hiệu", href: "/marketing/brand", icon: "bi-award" },
          { name: "Sản phẩm", href: "/marketing/products", icon: "bi-box-seam" },
          { name: "Theo dõi đối thủ", href: "/marketing/competitors", icon: "bi-binoculars" },
          { name: "Thư viện tài nguyên", href: "/marketing/catalogue", icon: "bi-book" },
        ]
      },
      {
        group: "Kế hoạch", items: [
          { name: "Xây dựng kế hoạch", href: "/marketing/plan/yearly", icon: "bi-calendar2-range" },
          { name: "Kế hoạch tháng", href: "/marketing/plan/monthly", icon: "bi-calendar-check" },
          { name: "Duyệt kế hoạch", href: "/marketing/plan/approvals", icon: "bi-check2-square", requiredOrder: 2 },
        ]
      },
      {
        group: "Quản lý chiến dịch", items: [
          { name: "Chiến dịch", href: "/marketing/campaigns", icon: "bi-lightning-charge" },
          { name: "Phân phối Lead", href: "/marketing/lead-distribution", icon: "bi-share" },
        ]
      },
      {
        group: "Sự kiện và đại lý", items: [
          { name: "Sự kiện", href: "/marketing/events", icon: "bi-calendar-event" },
          { name: "Đại lý", href: "/marketing/dealers", icon: "bi-building" },
        ]
      },
      {
        group: "Quản trị công việc", flat: true, items: [
          { name: "Quản trị công việc", href: "/marketing/tasks", icon: "bi-kanban", requiredOrder: 2 },
        ]
      },
      {
        group: "Báo cáo", items: [
          { name: "Tổng hợp", href: "/marketing/reports", icon: "bi-bar-chart-line", requiredOrder: 2 },
          { name: "Hiệu quả kênh", href: "/marketing/reports/channels", icon: "bi-graph-up", requiredOrder: 2 },
        ]
      },
    ],
  },
  "/product": {
    label: "Sản phẩm", icon: "bi-box-seam",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/product", icon: "bi-speedometer2" },
          { name: "Danh mục SP", href: "/product/catalog", icon: "bi-grid" },
          { name: "Roadmap", href: "/product/roadmap", icon: "bi-signpost-2" },
        ]
      },
      {
        group: "Phát triển", items: [
          { name: "Yêu cầu tính năng", href: "/product/features", icon: "bi-list-stars" },
          { name: "Phiên bản", href: "/product/versions", icon: "bi-tag" },
          { name: "Phản hồi KH", href: "/product/feedback", icon: "bi-chat-dots" },
        ]
      },
    ],
  },
  "/bd": {
    label: "Phát triển KD", icon: "bi-diagram-3",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/bd", icon: "bi-speedometer2" },
          { name: "Đối tác", href: "/bd/partners", icon: "bi-handshake" },
          { name: "Thị trường mới", href: "/bd/markets", icon: "bi-globe" },
        ]
      },
      {
        group: "Dự án", items: [
          { name: "Đề xuất hợp tác", href: "/bd/proposals", icon: "bi-file-earmark-plus" },
          { name: "Theo dõi deals", href: "/bd/deals", icon: "bi-kanban" },
        ]
      },
    ],
  },
  "/cs": {
    label: "Chăm sóc KH", icon: "bi-headset",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/cs", icon: "bi-speedometer2" },
          { name: "Yêu cầu hỗ trợ", href: "/cs/tickets", icon: "bi-ticket-detailed" },
          { name: "Khiếu nại", href: "/cs/complaints", icon: "bi-exclamation-circle" },
        ]
      },
      {
        group: "Quản lý", items: [
          { name: "Cơ sở kiến thức", href: "/cs/knowledge", icon: "bi-book" },
          { name: "Đánh giá KH", href: "/cs/ratings", icon: "bi-star" },
          { name: "Báo cáo CS", href: "/cs/reports", icon: "bi-bar-chart", requiredOrder: 2 },
        ]
      },
    ],
  },
  "/pr": {
    label: "Quan hệ công chúng", icon: "bi-broadcast",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/pr", icon: "bi-speedometer2" },
          { name: "Tin tức & Báo chí", href: "/pr/news", icon: "bi-newspaper" },
          { name: "Mạng xã hội", href: "/pr/social", icon: "bi-share" },
        ]
      },
      {
        group: "Quan hệ", items: [
          { name: "Liên hệ báo chí", href: "/pr/contacts", icon: "bi-person-rolodex" },
          { name: "Khủng hoảng TT", href: "/pr/crisis", icon: "bi-shield-exclamation" },
        ]
      },
    ],
  },
  "/ops": {
    label: "Vận hành", icon: "bi-gear-wide-connected",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/ops", icon: "bi-speedometer2" },
          { name: "Quy trình", href: "/ops/processes", icon: "bi-diagram-2" },
          { name: "KPIs vận hành", href: "/ops/kpis", icon: "bi-bar-chart-steps" },
        ]
      },
      {
        group: "Điều phối", items: [
          { name: "Phân công CV", href: "/ops/tasks", icon: "bi-kanban" },
          { name: "Sự cố", href: "/ops/incidents", icon: "bi-exclamation-octagon" },
        ]
      },
    ],
  },
  "/logistics": {
    label: "Kho vận – Logistics", icon: "bi-truck",
    sections: [
      {
        group: "Danh mục", icon: "bi-collection", items: [
          { name: "Vật tư và hàng hoá", href: "/logistics/products", icon: "bi-box-seam" },
          { name: "Truy xuất hàng hoá", href: "/logistics/serial", icon: "bi-qr-code-scan" },
          { name: "Sơ đồ kho", href: "/logistics/map", icon: "bi-map" },
          { name: "Thiết lập hệ thống kho", href: "/logistics/warehouse-setup", icon: "bi-gear" },
        ]
      },
      {
        group: "Vận hành kho", icon: "bi-hammer", items: [
          { name: "Nhập kho", href: "/logistics/inbound", icon: "bi-arrow-down-left-square" },
          { name: "Xuất kho", href: "/logistics/outbound", icon: "bi-arrow-up-right-square" },
          { name: "Luân chuyển nội bộ", href: "/logistics/transfers", icon: "bi-arrow-left-right" },
          { name: "Kiểm kê & Điều chỉnh", href: "/logistics/stocktake", icon: "bi-clipboard2-check" },
        ]
      },
      {
        group: "Bán hàng đa kênh", icon: "bi-shop-window", items: [
          { name: "Đơn hàng tập trung", href: "/logistics/oms", icon: "bi-globe" },
          { name: "Trung tâm API", href: "/logistics/api-hub", icon: "bi-plugin" },
          { name: "Đối soát & Thanh toán", href: "/logistics/accounting", icon: "bi-cash-stack" },
        ]
      },
      {
        group: "Quản lý dịch vụ và chất lượng", icon: "bi-shield-check", items: [
          { name: "Bảo hành & Hậu mãi", href: "/logistics/warranty", icon: "bi-shield-check" },
          { name: "Quản lý hàng lỗi (RMA)", href: "/logistics/rma", icon: "bi-exclamation-octagon" },
        ]
      },
      {
        group: "Báo cáo và phân tích", icon: "bi-bar-chart-fill", items: [
          { name: "Báo cáo tồn kho", href: "/logistics/inventory-reports", icon: "bi-bar-chart-line" },
          { name: "Báo cáo kinh doanh", href: "/logistics/sales-reports", icon: "bi-graph-up-arrow" },
          { name: "Nhật ký hệ thống", href: "/logistics/audit-logs", icon: "bi-journal-text" },
        ]
      },
    ],
  },
  "/purchase": {
    label: "Mua hàng", icon: "bi-cart3",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/purchase", icon: "bi-speedometer2" },
          { name: "Yêu cầu mua", href: "/purchase/requests", icon: "bi-file-earmark-plus" },
          { name: "Đơn mua hàng", href: "/purchase/orders", icon: "bi-cart-check" },
        ]
      },
      {
        group: "Nhà cung cấp", items: [
          { name: "Danh sách NCC", href: "/purchase/suppliers", icon: "bi-building" },
          { name: "Đánh giá NCC", href: "/purchase/evaluations", icon: "bi-star" },
          { name: "Báo giá", href: "/purchase/quotes", icon: "bi-receipt" },
        ]
      },
    ],
  },
  "/qa": {
    label: "Đảm bảo chất lượng", icon: "bi-patch-check",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/qa", icon: "bi-speedometer2" },
          { name: "Tiêu chuẩn CL", href: "/qa/standards", icon: "bi-award" },
          { name: "Kiểm tra", href: "/qa/inspections", icon: "bi-search" },
        ]
      },
      {
        group: "Kiểm soát", items: [
          { name: "Lỗi & NCR", href: "/qa/defects", icon: "bi-bug" },
          { name: "Hành động KP", href: "/qa/actions", icon: "bi-tools" },
          { name: "Báo cáo QA", href: "/qa/reports", icon: "bi-file-earmark-bar-graph", requiredOrder: 2 },
        ]
      },
    ],
  },
  "/rd": {
    label: "R&D", icon: "bi-lightbulb",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/rd", icon: "bi-speedometer2" },
          { name: "Dự án R&D", href: "/rd/projects", icon: "bi-kanban" },
          { name: "Sáng kiến", href: "/rd/innovations", icon: "bi-lightbulb" },
        ]
      },
      {
        group: "Nghiên cứu", items: [
          { name: "Tài liệu kỹ thuật", href: "/rd/docs", icon: "bi-file-code" },
          { name: "Thí nghiệm", href: "/rd/experiments", icon: "bi-flask" },
          { name: "Bằng sáng chế", href: "/rd/patents", icon: "bi-award" },
        ]
      },
    ],
  },
  "/production": {
    label: "Sản xuất", icon: "bi-tools",
    sections: [
      {
        group: "Điều hành sản xuất", items: [
          { name: "Lệnh sản xuất", href: "/production/orders", icon: "bi-file-earmark-text" },
          { name: "Dây chuyền", href: "/production/lines", icon: "bi-diagram-2" },
        ]
      },
      {
        group: "Xử lý hàng lỗi", flat: true, items: [
          { name: "Xử lý hàng lỗi", href: "/production/defects", icon: "bi-exclamation-octagon" },
        ]
      },
      {
        group: "Hàng hoá", items: [
          { name: "Kho hàng", href: "/production/inventory", icon: "bi-box-seam" },
          { name: "Xây dựng định mức", href: "/production/bom", icon: "bi-list-check" },
          { name: "Tính giá bán", href: "/production/pricing", icon: "bi-currency-dollar" },
        ]
      },
    ],
  },
  "/facility": {
    label: "Kỹ thuật – CSVC", icon: "bi-wrench-adjustable",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/facility", icon: "bi-speedometer2" },
          { name: "Tài sản cố định", href: "/facility/assets", icon: "bi-building" },
          { name: "Bảo trì", href: "/facility/maintenance", icon: "bi-wrench" },
        ]
      },
      {
        group: "Cơ sở vật chất", items: [
          { name: "Điện – Nước", href: "/facility/utilities", icon: "bi-lightning" },
          { name: "Sửa chữa", href: "/facility/repairs", icon: "bi-hammer" },
          { name: "Yêu cầu kỹ thuật", href: "/facility/requests", icon: "bi-clipboard-plus" },
        ]
      },
    ],
  },
  "/security": {
    label: "Bảo vệ – An ninh", icon: "bi-shield-lock",
    sections: [
      {
        group: "Tổng quan", items: [
          { name: "Tổng quan", href: "/security", icon: "bi-speedometer2" },
          { name: "Ca trực", href: "/security/shifts", icon: "bi-clock" },
          { name: "Sự cố an ninh", href: "/security/incidents", icon: "bi-exclamation-octagon" },
        ]
      },
      {
        group: "Kiểm soát", items: [
          { name: "Ra vào", href: "/security/access", icon: "bi-door-open" },
          { name: "Camera giám sát", href: "/security/cameras", icon: "bi-camera-video" },
          { name: "Khách & xe", href: "/security/visitors", icon: "bi-person-badge" },
        ]
      },
    ],
  },
  "/plan_finance": {
    label: "Tài chính – Kinh doanh", icon: "bi-coin",
    sections: [
      {
        group: "Khách hàng", items: [
          { name: "Khách hàng", href: "/plan_finance/customers", icon: "bi-people" },
        ]
      },
      {
        group: "Bán hàng", items: [
          { name: "Bán hàng", href: "/plan_finance/sales", icon: "bi-cart3" },
        ]
      },
      {
        group: "Tài chính", items: [
          { name: "Tài sản cố định", href: "/plan_finance/assets", icon: "bi-building" },
          { name: "Hàng hoá trong kho", href: "/plan_finance/inventory", icon: "bi-boxes" },
          { name: "Mua hàng", href: "/plan_finance/purchasing", icon: "bi-bag" },
          { name: "Chấm công & lương", href: "/plan_finance/payroll", icon: "bi-person-check" },
        ]
      },
      {
        group: "Công nợ và chi phí", items: [
          { name: "Nhà cung cấp", href: "/plan_finance/suppliers", icon: "bi-building-check" },
          { name: "Quản lý công nợ và chi phí", href: "/plan_finance/debts", icon: "bi-receipt" },
        ]
      },
    ],
  },
};

// Tìm dept key từ pathname (vd: /hr/employees → /hr)
function getDeptKey(pathname: string): string {
  return Object.keys(DEPT_SIDEBARS)
    .filter((k) => pathname === k || pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0] || "";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { prefs: animPrefs } = useAnimationPrefs();

  const [isMobile, setIsMobile] = useState(false);
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);
  const [isCreateTrainingModalOpen, setIsCreateTrainingModalOpen] = useState(false);

  // Lắng nghe sự kiện mở modal từ các component con/trigger
  useEffect(() => {
    const handleOpenTraining = () => setIsCreateTrainingModalOpen(true);
    const handleOpenRecruitment = () => setIsCreateRequestModalOpen(true);

    window.addEventListener("open-training-request-modal", handleOpenTraining);
    window.addEventListener("open-recruitment-request-modal", handleOpenRecruitment);

    return () => {
      window.removeEventListener("open-training-request-modal", handleOpenTraining);
      window.removeEventListener("open-recruitment-request-modal", handleOpenRecruitment);
    };
  }, []);

  // Fetch thông tin công ty từ API (real-time, không phụ thuộc JWT session)
  const [companyInfo, setCompanyInfo] = useState<{ name?: string; slogan?: string | null } | null>(null);
  useEffect(() => {
    fetch("/api/company")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCompanyInfo(d); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      // iPad Pro & smaller (<=1024) -> true (collapse / hide)
      setIsCollapsed(mobile);
    };

    handleResize(); // trigger once on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMenuSelect = () => {
    // Nếu màn hình nhỏ thì đóng sidebar khi click
    if (isMobile) {
      setIsCollapsed(true);
    }
  };

  // Lưu trữ department đang truy cập để giữ sidebar khi vào các trang cá nhân (/my)
  const [activeDeptKey, setActiveDeptKey] = useState(""); // "" để server & client render giống nhau

  useEffect(() => {
    const key = getDeptKey(pathname);
    if (key && !pathname.startsWith("/my")) {
      // Trang phòng ban thực sự → cập nhật và lưu
      setActiveDeptKey(key);
      localStorage.setItem("activeDeptKey", key);
    } else if (pathname.startsWith("/my")) {
      // Trang cá nhân → khôi phục từ localStorage (chạy sau hydration, tránh mismatch)
      const saved = localStorage.getItem("activeDeptKey");
      if (saved) setActiveDeptKey(saved);
    }
  }, [pathname]);

  const sidebar = DEPT_SIDEBARS[activeDeptKey];

  const clientName = session?.user?.clientName || "";
  // Ưu tiên slogan từ API (real-time), fallback về session (cached)
  const sloganText = companyInfo?.slogan || session?.user?.clientSlogan || companyInfo?.name || clientName || "Hệ điều hành doanh nghiệp";
  const overviewHref = activeDeptKey || "/";

  return (
    <ToastProvider>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", background: "var(--background)", color: "var(--foreground)" }}>

        {/* TOPBAR */}
        <React.Suspense fallback={<div style={{ height: 62 }} />}>
          <Topbar onToggleSidebar={() => setIsCollapsed(!isCollapsed)} />
        </React.Suspense>

        {/* Spacer — độ cao topbar */}
        <div style={{ height: 62, flexShrink: 0 }} />

        {/* BODY */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>

          {/* Overlay mờ nếu đang mở sidebar trên màn hình nhỏ */}
          <AnimatePresence>
            {isMobile && !isCollapsed && sidebar && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCollapsed(true)}
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }}
              />
            )}
          </AnimatePresence>

          {/* Sidebar — chỉ hiện khi đang trong một phòng ban */}
          {sidebar && (
            <motion.aside
              initial={false}
              animate={animPrefs.sidebarMotion ? {
                width: isCollapsed ? 0 : 300,
                x: isMobile && isCollapsed ? -300 : 0
              } : {
                width: isCollapsed ? 0 : 300,
                x: isMobile && isCollapsed ? -300 : 0
              }}
              transition={animPrefs.sidebarMotion
                ? { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
                : { duration: 0 }
              }
              className="app-sidebar"
              style={{
                display: "flex", flexDirection: "column", height: "100%",
                flexShrink: 0, overflow: "hidden", minWidth: 0,
                position: isMobile ? "absolute" : "relative",
                left: 0, top: 0, bottom: 0,
                zIndex: 40,
                background: isMobile ? "var(--background)" : undefined,
                boxShadow: isMobile ? "4px 0 24px rgba(0,0,0,0.15)" : undefined,
              }}
            >
              {/* ── Slogan ── */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ padding: "12px 16px 20px", flexShrink: 0, textAlign: "center" }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0, opacity: 0.75, whiteSpace: "normal", wordBreak: "break-word", overflow: "visible" }}>
                      {sloganText}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Accordion nav theo dept ── */}
              <React.Suspense fallback={<div style={{ flex: 1 }} />}>
                <SidebarAccordion
                  overviewHref={overviewHref}
                  isCollapsed={isCollapsed}
                  userRole={session?.user?.role}
                  userLevelOrder={session?.user?.levelOrder}
                  groups={(() => {
                    let baseGroups = [...(DEPT_NAV_GROUPS[activeDeptKey] ||
                      (sidebar?.sections?.map(s => ({
                        key: s.group.toLowerCase().replace(/\s+/g, "_"),
                        label: s.group,
                        icon: s.icon || s.items[0]?.icon || "bi-circle",
                        items: s.items,
                        flat: s.flat
                      })) || []))];
  
                    // Nếu không phải phòng HR, và là cấp quản lý (levelOrder <= 2)
                    // thì thêm nhóm "Tuyển dụng" vào cuối
                    const isHR = activeDeptKey === "/hr";
                    const isManager = (session?.user?.levelOrder ?? 99) <= 2;
                    const isAdmin = session?.user?.role === "SUPERADMIN" || session?.user?.role === "admin";
  
                    if (!isHR && (isManager || isAdmin) && !baseGroups.some(g => g.key === "dept_recruitment")) {
                      baseGroups.push({
                        key: "dept_recruitment",
                        label: "Tuyển dụng và đào tạo",
                        icon: "bi-person-plus",
                        items: [
                          { name: "Tạo yêu cầu", href: "/my/hr-requests" },
                          { name: "Phỏng vấn ứng viên", href: "/hr/interviews" },
                        ]
                      });
                    }
  
                    return baseGroups;
                  })()}
                  onMenuSelect={handleMenuSelect}
                  onRequestRecruitment={() => setIsCreateRequestModalOpen(true)}
                  onRequestTraining={() => setIsCreateTrainingModalOpen(true)}
                />
              </React.Suspense>

            </motion.aside>

          )}

          {/* Main Content */}
          <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}
            onClick={() => { if (isMobile && !isCollapsed) setIsCollapsed(true); }}
          >
            <React.Suspense fallback={
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            }>
              {animPrefs.pageTransition ? (
                <AnimatePresence>
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    style={{ height: "100%" }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div style={{ height: "100%" }}>{children}</div>
              )}
            </React.Suspense>
          </main>
        </div>
      </div>
      <CreateRequestModal
        isOpen={isCreateRequestModalOpen}
        onClose={() => setIsCreateRequestModalOpen(false)}
        onSuccess={() => {
          setIsCreateRequestModalOpen(false);
        }}
      />
      <CreateTrainingRequestModal
        isOpen={isCreateTrainingModalOpen}
        onClose={() => setIsCreateTrainingModalOpen(false)}
        onSuccess={() => {
          setIsCreateTrainingModalOpen(false);
          // Redirect to training page or refresh if already there
          if (pathname === "/hr/training") {
            window.location.reload();
          }
        }}
      />
    </ToastProvider>
  );
}

