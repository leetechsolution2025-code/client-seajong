"use client";

import React from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";

// ── MODULE CONFIG ────────────────────────────────────────────────────────────

const MODULE_CONFIG: Record<string, { title: string; description: string; icon: string; color: any }> = {
  "products": { title: "Vật tư và hàng hoá", description: "Quản lý danh mục vật tư, hàng hoá và linh kiện đi kèm.", icon: "bi-box-seam", color: "blue" },
  "serial": { title: "Truy xuất hàng hoá", description: "Hệ thống truy xuất nguồn gốc và định danh duy nhất cho từng sản phẩm.", icon: "bi-qr-code-scan", color: "indigo" },
  "map": { title: "Sơ đồ kho", description: "Bản đồ trực quan vị trí kệ hàng, kho chi nhánh và showroom.", icon: "bi-map", color: "emerald" },
  "warehouse-setup": { title: "Thiết lập hệ thống kho", description: "Cấu hình danh mục kho, sơ đồ layout và phân vùng lưu trữ.", icon: "bi-gear-wide-connected", color: "indigo" },
  "inbound": { title: "Nhập kho", description: "Quản lý nhập hàng từ nhà cung cấp và kiểm định QC.", icon: "bi-arrow-down-left-square", color: "blue" },
  "outbound": { title: "Xuất kho", description: "Xử lý đơn hàng Online/Offline và đóng gói xuất kho.", icon: "bi-arrow-up-right-square", color: "rose" },
  "transfers": { title: "Luân chuyển nội bộ", description: "Điều chuyển hàng hóa giữa các kho và showroom.", icon: "bi-arrow-left-right", color: "amber" },
  "stocktake": { title: "Kiểm kê & Điều chỉnh", description: "Đối soát tồn kho thực tế và xử lý sai lệch.", icon: "bi-clipboard2-check", color: "violet" },
  "oms": { title: "Đơn hàng tập trung", description: "Kênh gom đơn từ Shopee, Tiki, Website và POS.", icon: "bi-hub", color: "cyan" },
  "api-hub": { title: "Trung tâm API", description: "Cấu hình kết nối sàn TMĐT và đơn vị vận chuyển.", icon: "bi-plugin", color: "indigo" },
  "accounting": { title: "Đối soát & Thanh toán", description: "Kiểm soát dòng tiền từ sàn và COD trả về.", icon: "bi-cash-stack", color: "emerald" },
  "warranty": { title: "Bảo hành & Hậu mãi", description: "Tiếp nhận và xử lý sự cố, bảo hành cho khách hàng.", icon: "bi-shield-check", color: "blue" },
  "rma": { title: "Quản lý hàng lỗi (RMA)", description: "Khu biệt trữ hàng hỏng, chờ thanh lý hoặc trả nhà cung cấp.", icon: "bi-exclamation-octagon", color: "rose" },
  "inventory-reports": { title: "Báo cáo tồn kho", description: "Phân tích giá trị và số lượng tồn kho định kỳ.", icon: "bi-bar-chart-line", color: "blue" },
  "sales-reports": { title: "Báo cáo kinh doanh", description: "Hiệu quả bán hàng và doanh thu theo kênh.", icon: "bi-graph-up-arrow", color: "emerald" },
  "audit-logs": { title: "Nhật ký hệ thống", description: "Truy vết lịch sử thao tác và biến động dữ liệu.", icon: "bi-journal-text", color: "amber" },
};

import { LogisticsInventory } from "@/components/logistics/inventory/LogisticsInventory";
import { LogisticsRMA } from "@/components/logistics/inventory/LogisticsRMA";
import { LogisticsSerial } from "@/components/logistics/inventory/LogisticsSerial";
import { WarehouseSetup } from "@/components/logistics/inventory/WarehouseSetup";
import { LogisticsInbound } from "@/components/logistics/inbound/LogisticsInbound";

export default function LogisticsModulePage() {
  const params = useParams();
  const module = params.module as string;
  const config = MODULE_CONFIG[module] || { title: module, description: "", icon: "bi-grid", color: "blue" };

  const renderModuleContent = () => {
    switch (module) {
      case "products":
        return <LogisticsInventory />;
      case "rma":
        return <LogisticsRMA />;
      case "serial":
        return <LogisticsSerial />;
      case "warehouse-setup":
        return <WarehouseSetup />;
      case "inbound":
        return <LogisticsInbound />;
      default:
        return (
          <div className="text-center p-5 border rounded-4 border-dashed" style={{ opacity: 0.5, height: "400px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <i className={`bi ${config.icon} fs-1 d-block mb-3`} />
            <h4 className="fw-bold">{config.title}</h4>
            <p className="text-muted">Nội dung nghiệp vụ đang được thiết kế...</p>
          </div>
        );
    }
  };

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader 
        title={config.title} 
        description={config.description} 
        icon={config.icon} 
        color={config.color}
      />

      <div className="flex-grow-1 px-4 pb-4 pt-2 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar">
            {renderModuleContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
