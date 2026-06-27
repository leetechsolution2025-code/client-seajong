"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";

// ── MODULE CONFIG ────────────────────────────────────────────────────────────

const MODULE_CONFIG: Record<string, { title: string; description: string; icon: string; color: any }> = {
  "system": { title: "Hệ thống kho", description: "Bản đồ trực quan, quản lý sơ đồ kệ hàng và thiết lập bãi lưu trữ.", icon: "bi-building", color: "emerald" },
  "products": { title: "Danh mục vật tư, hàng hoá", description: "Quản lý danh mục vật tư, hàng hoá và linh kiện đi kèm.", icon: "bi-box-seam", color: "blue" },
  "serial": { title: "Truy xuất hàng hoá", description: "Hệ thống truy xuất nguồn gốc và định danh duy nhất cho từng sản phẩm.", icon: "bi-qr-code-scan", color: "indigo" },
  "map": { title: "Sơ đồ kho", description: "Bản đồ trực quan vị trí kệ hàng, kho chi nhánh và showroom.", icon: "bi-map", color: "emerald" },
  "warehouse-setup": { title: "Thiết lập hệ thống kho", description: "Cấu hình danh mục kho, sơ đồ layout và phân vùng lưu trữ.", icon: "bi-gear-wide-connected", color: "indigo" },
  "inbound": { title: "Nhập, xuất và kiểm kho", description: "Quản lý nhập kho, xuất kho và kiểm tra đối soát tồn kho thực tế.", icon: "bi-arrow-down-left-square", color: "blue" },
  "batch-packing": { title: "Gom hàng và dán nhãn", description: "Gom đơn soạn hàng loạt, đóng gói và in tem dán nhãn vận chuyển.", icon: "bi-box-seam-fill", color: "blue" },
  "transfers": { title: "Luân chuyển nội bộ", description: "Điều chuyển hàng hóa giữa các kho và showroom.", icon: "bi-arrow-left-right", color: "amber" },
  "oms": { title: "Đơn hàng tập trung", description: "Kênh gom đơn từ Shopee, Tiki, Website và POS.", icon: "bi-hub", color: "cyan" },
  "api-hub": { title: "Trung tâm API", description: "Cấu hình kết nối sàn TMĐT và đơn vị vận chuyển.", icon: "bi-plugin", color: "indigo" },
  "accounting": { title: "Đối soát & Thanh toán", description: "Kiểm soát dòng tiền từ sàn và COD trả về.", icon: "bi-cash-stack", color: "emerald" },
  "warranty": { title: "Bảo hành & Hậu mãi", description: "Tiếp nhận và xử lý sự cố, bảo hành cho khách hàng.", icon: "bi-shield-check", color: "blue" },
  "rma": { title: "Quản lý hàng lỗi (RMA)", description: "Khu biệt trữ hàng hỏng, chờ thanh lý hoặc trả nhà cung cấp.", icon: "bi-exclamation-octagon", color: "rose" },
  "inventory-reports": { title: "Báo cáo kho", description: "Phân tích giá trị và số lượng tồn kho định kỳ.", icon: "bi-bar-chart-line", color: "blue" },
  "sales-reports": { title: "Báo cáo kinh doanh", description: "Hiệu quả bán hàng và doanh thu theo kênh.", icon: "bi-graph-up-arrow", color: "emerald" },
  "audit-logs": { title: "Nhật ký hoạt động kho", description: "Truy vết lịch sử thao tác và biến động dữ liệu.", icon: "bi-journal-text", color: "amber" },
};

import { LogisticsInventory } from "@/components/logistics/inventory/LogisticsInventory";
import { LogisticsRMA } from "@/components/logistics/inventory/LogisticsRMA";
import { LogisticsSerial } from "@/components/logistics/inventory/LogisticsSerial";
import { WarehouseSetup } from "@/components/logistics/inventory/WarehouseSetup";
import { LogisticsInbound } from "@/components/logistics/inbound/LogisticsInbound";
import { LogisticsInventoryReports } from "@/components/logistics/inventory/LogisticsInventoryReports";
import { LogisticsAuditLogs } from "@/components/logistics/inventory/LogisticsAuditLogs";

export default function LogisticsModulePage() {
  const params = useParams();
  const module = params.module as string;
  const config = MODULE_CONFIG[module] || { title: module, description: "", icon: "bi-grid", color: "blue" };

  const [inboundStats, setInboundStats] = useState({
    tongMatHang: 0,
    tongGiaTri: 0,
    hetHang: 0,
    sapHet: 0
  });

  const renderModuleContent = () => {
    switch (module) {
      case "system":
        return <WarehouseSetup />;
      case "products":
        return <LogisticsInventory />;
      case "rma":
        return <LogisticsRMA />;
      case "serial":
        return <LogisticsSerial />;
      case "warehouse-setup":
        return <WarehouseSetup />;
      case "inbound":
        return <LogisticsInbound onStatsChange={setInboundStats} />;
      case "inventory-reports":
        return <LogisticsInventoryReports />;
      case "audit-logs":
        return <LogisticsAuditLogs />;
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
        {module === "inbound" && (
          <div className="row g-3" style={{ flexShrink: 0, marginBottom: "8px" }}>
            {/* Thẻ 1: Tổng số mặt hàng */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(99, 102, 241, 0.1)",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <i className="bi bi-boxes" style={{ fontSize: 18 }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.02em" }}>Tổng số mặt hàng</p>
                  <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>
                    {inboundStats.tongMatHang}
                  </p>
                </div>
              </div>
            </div>

            {/* Thẻ 2: Tổng giá trị kho */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <i className="bi bi-cash-stack" style={{ fontSize: 18 }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.02em" }}>Tổng giá trị kho</p>
                  <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>
                    {inboundStats.tongGiaTri.toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>
            </div>

            {/* Thẻ 3: Sắp hết hàng */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(245, 158, 11, 0.1)",
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <i className="bi bi-exclamation-triangle" style={{ fontSize: 18 }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.02em" }}>Sắp hết hàng</p>
                  <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>
                    {inboundStats.sapHet}
                  </p>
                </div>
              </div>
            </div>

            {/* Thẻ 4: Đã hết hàng */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <i className="bi bi-x-circle" style={{ fontSize: 18 }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", letterSpacing: "0.02em" }}>Đã hết hàng</p>
                  <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.2 }}>
                    {inboundStats.hetHang}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          <div 
            className={`flex-grow-1 custom-scrollbar ${
              module === "inbound" || module === "products" || module === "inventory-reports" ? "d-flex flex-column overflow-hidden" : "overflow-auto"
            } ${module === "inventory-reports" ? "p-0" : "pt-4 px-4 pb-3"}`}
            style={{ minHeight: 0 }}
          >
            {renderModuleContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
