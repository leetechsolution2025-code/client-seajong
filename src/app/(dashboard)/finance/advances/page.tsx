"use client";

import { useState, useEffect } from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Table } from "@/components/ui/Table";
import { BrandButton } from "@/components/ui/BrandButton";

export default function AdvancesPage() {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedAdvance, setSelectedAdvance] = useState<any>(null);

  const [advancesData, setAdvancesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/finance/advances');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setAdvancesData(data);
        }
      } catch (error) {
        console.error("Failed to fetch advances:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 10000); // Tự động làm mới mỗi 10 giây
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const totalAmount = advancesData.reduce((acc: any, curr: any) => acc + curr.amount, 0);
  const totalPaid = advancesData.reduce((acc: any, curr: any) => acc + curr.paidAmount, 0);
  const totalDebt = totalAmount - totalPaid;
  const pendingRequests = advancesData.filter((item: any) => item.status === "pending").length;

  // Grouping logic
  const groupedData = advancesData.reduce((acc: any, curr: any) => {
    if (!acc[curr.employeeName]) {
      acc[curr.employeeName] = [];
    }
    acc[curr.employeeName].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  const toggleGroup = (employeeName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [employeeName]: !prev[employeeName]
    }));
  };

  const tableRows: any[] = [];
  Object.entries(groupedData).forEach(([employeeName, itemsRaw]) => {
    const items = itemsRaw as any[];
    const totalGroupAmount = items.reduce((sum: number, item: any) => sum + item.amount, 0);
    const totalGroupPaid = items.reduce((sum: number, item: any) => sum + item.paidAmount, 0);
    const hasPending = items.some((item: any) => item.status === "pending");
    
    // Group Header Row
    tableRows.push({
      isGroupHeader: true,
      employeeName,
      itemCount: items.length,
      hasPending,
      totalAmount: totalGroupAmount,
      totalPaid: totalGroupPaid,
      id: `group-${employeeName}`
    });

    // Group Items
    if (expandedGroups[employeeName]) {
      tableRows.push(...items.map((item: any, idx: number) => ({ 
        ...item, 
        isGroupItem: true, 
        groupIndex: idx + 1 
      })));
    }
  });

  const columns = [
    {
      header: "STT",
      colSpan: (row: any) => row.isGroupHeader ? 5 : 1,
      render: (row: any, index: number) => {
        if (row.isGroupHeader) {
          const isExpanded = expandedGroups[row.employeeName];
          return (
            <div 
              className="d-flex align-items-center gap-2 text-primary user-select-none" 
              style={{ cursor: "pointer", marginLeft: "-8px" }}
              onClick={() => toggleGroup(row.employeeName)}
            >
              <div 
                className="d-flex align-items-center justify-content-center bg-light rounded" 
                style={{ width: 24, height: 24, transition: "0.2s" }}
              >
                <i className={`bi bi-chevron-${isExpanded ? "down" : "right"}`} style={{ fontSize: 12 }} />
              </div>
              <span className="fw-bold">{row.employeeName}</span>
              <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill px-2">
                {row.itemCount} phiếu
              </span>
              {row.hasPending && (
                <span className="badge bg-danger rounded-pill px-2 ms-1" style={{ fontSize: 9 }}>MỚI</span>
              )}
              <span className="ms-auto text-muted d-flex align-items-center gap-3 pe-2" style={{ fontSize: 12 }}>
                <span>Tổng ứng: <strong className="text-primary">{row.totalAmount.toLocaleString("vi-VN")} đ</strong></span>
                <span>Đã trả: <strong className="text-success">{row.totalPaid.toLocaleString("vi-VN")} đ</strong></span>
                <span>Còn nợ: <strong className="text-danger">{(row.totalAmount - row.totalPaid).toLocaleString("vi-VN")} đ</strong></span>
              </span>
            </div>
          );
        }
        return <span className="text-muted ms-3">{row.groupIndex}</span>;
      },
      width: "80px",
    },
    {
      header: "Mã phiếu & Trạng thái",
      colSpan: (row: any) => row.isGroupHeader ? 0 : 1,
      render: (row: any) => {
        if (row.isGroupHeader) return null;
        const statusText = row.status === "approved" ? "Đã duyệt" : row.status === "pending" ? "Chờ duyệt" : "Đã hoàn ứng";
        const statusColor = row.status === "approved" ? "text-success" : row.status === "pending" ? "text-warning-emphasis" : "text-muted";
        return (
          <div className="d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
            <span className="fw-bold text-dark">{row.id}</span>
            <span className="text-muted opacity-50">|</span>
            <span className={`fw-medium ${statusColor}`}>
              {statusText}
            </span>
          </div>
        );
      },
    },
    {
      header: "Số tiền (đ)",
      colSpan: (row: any) => row.isGroupHeader ? 0 : 1,
      render: (row: any) => row.isGroupHeader ? null : <span className="fw-bold text-primary">{row.amount?.toLocaleString("vi-VN")}</span>,
    },
    {
      header: "Đã trả (đ)",
      colSpan: (row: any) => row.isGroupHeader ? 0 : 1,
      render: (row: any) => row.isGroupHeader ? null : <span className="fw-bold text-success">{row.paidAmount?.toLocaleString("vi-VN")}</span>,
    },
    {
      header: "Lý do",
      colSpan: (row: any) => row.isGroupHeader ? 0 : 1,
      render: (row: any) => row.isGroupHeader ? null : <span>{row.reason}</span>,
    },
  ];

  const customTickerNews = [
    { text: `• Đã tạm ứng trong năm: <span class="fw-bold">${totalAmount.toLocaleString("vi-VN")} đ</span>`, type: 'text' },
    { text: `• Đã tạm ứng trong tháng: <span class="fw-bold">${totalPaid.toLocaleString("vi-VN")} đ</span>`, type: 'text' },
    { text: `• Còn nợ tạm ứng: <span class="fw-bold text-danger">${totalDebt.toLocaleString("vi-VN")} đ</span>`, type: 'text' },
    { text: `• Yêu cầu chờ duyệt: <span class="fw-bold text-danger">${pendingRequests} yêu cầu</span>`, type: 'text' }
  ];

  return (
    <StandardPage
      title="Quản lý tạm ứng"
      description="Quản lý các khoản tạm ứng nhân viên và đối soát"
      icon="bi-cash"
      color="emerald"
      useCard={false}
      customTickerNews={customTickerNews}
    >
      <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0, gap: "1rem" }}>
        {/* Main Content Card */}
        <div className="bg-white border rounded-4 d-flex flex-column flex-grow-1 position-relative shadow-sm overflow-hidden p-0" style={{ minHeight: 400 }}>
          {/* Card Header */}
          <div className="px-4 py-3 border-bottom bg-light bg-opacity-50">
            <SectionTitle 
              title={`Dữ liệu tạm ứng và hoàn tạm ứng năm ${new Date().getFullYear()}`} 
              icon="bi-table" 
              className="mb-0" 
              action={
                <select className="form-select form-select-sm" style={{ width: 180, fontSize: 13 }}>
                  <option value="">Tất cả phòng ban</option>
                  <option value="sales">Kinh doanh</option>
                  <option value="marketing">Marketing</option>
                  <option value="production">Sản xuất</option>
                  <option value="logistics">Kho vận</option>
                  <option value="admin">Hành chính nhân sự</option>
                </select>
              }
            />
          </div>

          {/* Filters Toolbar */}
          <div className="px-4 py-2 border-bottom d-flex flex-wrap align-items-center gap-2 bg-white">
            <select className="form-select form-select-sm" style={{ width: 160, fontSize: 13 }}>
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="debt">Đang nợ tạm ứng</option>
              <option value="completed">Đã hoàn ứng</option>
            </select>

            <div className="d-flex align-items-center gap-2">
              <span className="text-muted" style={{ fontSize: 13 }}>Ngày tạm ứng:</span>
              <input 
                type="date" 
                className="form-control form-control-sm text-muted" 
                style={{ width: 140, fontSize: 13 }} 
                title="Ngày tạm ứng" 
              />
            </div>

            <div className="border-start border-2 opacity-25 mx-1" style={{ height: 20 }}></div>

            <BrandButton variant="outline" icon="bi-clock-history" style={{ height: 31, fontSize: 12, borderRadius: 6, fontWeight: 500, padding: "0 12px" }}>
              Đến hạn
              <span className="badge bg-primary text-white rounded-circle ms-1" style={{ fontSize: 10, padding: "3px 6px" }}>2</span>
            </BrandButton>
            <BrandButton variant="outline" icon="bi-exclamation-octagon" style={{ height: 31, fontSize: 12, borderRadius: 6, fontWeight: 500, padding: "0 12px", color: "#dc3545", borderColor: "#dc3545" }}>
              Quá hạn
              <span className="badge bg-danger text-white rounded-circle ms-1" style={{ fontSize: 10, padding: "3px 6px" }}>1</span>
            </BrandButton>

            <div className="position-relative ms-auto" style={{ width: 300 }}>
              <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 13 }} />
              <input 
                type="text" 
                className="form-control form-control-sm ps-4" 
                placeholder="Tìm kiếm nhân viên, lý do..."
                style={{ fontSize: 13 }}
              />
            </div>
          </div>

          {/* Card Body - Table */}
          <div className="flex-grow-1 overflow-auto bg-white p-3">
            <Table 
              rows={tableRows} 
              columns={columns} 
              rowKey={(row) => row.id}
              onRowClick={(row) => {
                if (!row.isGroupHeader) setSelectedAdvance(row);
              }}
              emptyText="Chưa có dữ liệu tạm ứng nào" 
              emptyIcon="bi-inbox"
            />
          </div>
        </div>
        
      </div>

      {/* Offcanvas for Advance Details */}
      {selectedAdvance && (
        <div 
          className="offcanvas-backdrop fade show" 
          onClick={() => setSelectedAdvance(null)} 
          style={{ zIndex: 1040 }}
        />
      )}
      <div 
        className={`offcanvas offcanvas-end ${selectedAdvance ? "show" : ""}`} 
        style={{ 
          width: "400px", 
          visibility: selectedAdvance ? "visible" : "hidden", 
          zIndex: 1050,
          borderLeft: "1px solid var(--border)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
          transition: "transform 0.3s ease-in-out",
          transform: selectedAdvance ? "translateX(0)" : "translateX(100%)"
        }}
      >
        <div className="offcanvas-header border-bottom px-4 py-3 flex-shrink-0 bg-light">
          <h5 className="offcanvas-title fw-bold d-flex align-items-center gap-2" style={{ fontSize: 16 }}>
            <i className="bi bi-file-text-fill text-primary"></i>
            Chi tiết phiếu {selectedAdvance?.id}
          </h5>
          <button type="button" className="btn-close shadow-none" onClick={() => setSelectedAdvance(null)}></button>
        </div>
        
        <div className="offcanvas-body p-4 d-flex flex-column gap-3" style={{ fontSize: 13 }}>
          {/* Employee Info Card */}
          <div className="d-flex align-items-center gap-3 p-3 border rounded-3 bg-white shadow-sm">
            <div 
              className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm flex-shrink-0" 
              style={{ width: 44, height: 44, fontSize: 16 }}
            >
              {selectedAdvance?.employeeName?.split(" ").pop()?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="fw-bold text-dark" style={{ fontSize: 14 }}>{selectedAdvance?.employeeName}</div>
              <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                {selectedAdvance?.role || "Nhân viên"} • {selectedAdvance?.department || "Phòng ban chung"}
              </div>
            </div>
          </div>

          <div className="d-flex flex-column mt-2 gap-3">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
              <span className="text-muted fw-medium text-uppercase" style={{ fontSize: 11, letterSpacing: "0.5px" }}>Trạng thái</span>
              <span 
                className={`badge bg-opacity-10 rounded-pill px-3 py-1 ${
                  selectedAdvance?.status === "approved" || selectedAdvance?.status === "debt"
                    ? "bg-success text-success border border-success" 
                    : selectedAdvance?.status === "pending" 
                      ? "bg-warning text-warning-emphasis border border-warning" 
                      : "bg-secondary text-secondary border border-secondary"
                }`} 
                style={{ fontSize: 11, borderWidth: "1px", borderStyle: "solid", borderColor: "currentColor" }}
              >
                {selectedAdvance?.status === "approved" || selectedAdvance?.status === "debt" ? "Đã duyệt" : selectedAdvance?.status === "pending" ? "Chờ duyệt" : "Đã hoàn ứng"}
              </span>
            </div>

            <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
              <span className="text-muted fw-medium text-uppercase" style={{ fontSize: 11, letterSpacing: "0.5px" }}>Số tiền tạm ứng</span>
              <span className="fw-bold text-primary" style={{ fontSize: 15 }}>{selectedAdvance?.amount?.toLocaleString("vi-VN")} đ</span>
            </div>

            <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
              <span className="text-muted fw-medium text-uppercase" style={{ fontSize: 11, letterSpacing: "0.5px" }}>Đã trả</span>
              <span className="fw-bold text-success" style={{ fontSize: 14 }}>{selectedAdvance?.paidAmount?.toLocaleString("vi-VN")} đ</span>
            </div>
            
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
              <span className="text-muted fw-medium text-uppercase" style={{ fontSize: 11, letterSpacing: "0.5px" }}>Còn nợ</span>
              <span className="fw-bold text-danger" style={{ fontSize: 14 }}>{((selectedAdvance?.amount || 0) - (selectedAdvance?.paidAmount || 0)).toLocaleString("vi-VN")} đ</span>
            </div>

            <div className="pt-1">
              <div className="text-muted fw-medium text-uppercase mb-2" style={{ fontSize: 11, letterSpacing: "0.5px" }}>Lý do tạm ứng</div>
              <div className="text-dark p-3 rounded-3 border bg-light" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {selectedAdvance?.reason}
              </div>
            </div>
          </div>
        </div>

        {selectedAdvance?.status !== "completed" && (
          <div className="offcanvas-footer p-4 border-top bg-light flex-shrink-0">
            {(() => {
              // Footer for "approved" or "debt"
              if (selectedAdvance?.status === "approved" || selectedAdvance?.status === "debt") {
                return (
                  <div className="d-flex gap-2">
                    <BrandButton 
                      variant="outline" 
                      className="flex-grow-1" 
                      style={{ color: "#fd7e14", borderColor: "#fd7e14", borderRadius: "8px" }}
                      onClick={() => setSelectedAdvance(null)}
                    >
                      Nhắc nợ
                    </BrandButton>
                    <BrandButton 
                      className="flex-grow-1"
                      style={{ borderRadius: "8px" }}
                      onClick={() => setSelectedAdvance(null)}
                    >
                      Đã hoàn ứng
                    </BrandButton>
                  </div>
                );
              }

              // Footer for "pending"
              // Mock Policy Settings
              const requireAllApproval = false; // Thay đổi thành true để test trường hợp "Tất cả yêu cầu đều phải trình duyệt"
              const approvalThreshold = 5000000; // 5.000.000 đ

              const isAmountOverThreshold = (selectedAdvance?.amount || 0) >= approvalThreshold;
              const disableDirectAction = requireAllApproval || isAmountOverThreshold;
              const disableSubmitApproval = !requireAllApproval && !isAmountOverThreshold;

              return (
                <div className="d-flex gap-2">
                  <BrandButton 
                    variant="outline" 
                    className="flex-grow-1" 
                    style={{ color: "#dc3545", borderColor: "#dc3545", borderRadius: "8px", opacity: disableDirectAction ? 0.5 : 1 }}
                    onClick={() => setSelectedAdvance(null)}
                    disabled={disableDirectAction}
                  >
                    Từ chối
                  </BrandButton>
                  <BrandButton 
                    variant="outline" 
                    className="flex-grow-1" 
                    style={{ color: "#fd7e14", borderColor: "#fd7e14", borderRadius: "8px", opacity: disableSubmitApproval ? 0.5 : 1 }}
                    onClick={() => setSelectedAdvance(null)}
                    disabled={disableSubmitApproval}
                  >
                    Trình duyệt
                  </BrandButton>
                  <BrandButton 
                    className="flex-grow-1"
                    style={{ borderRadius: "8px", opacity: disableDirectAction ? 0.5 : 1 }}
                    onClick={() => setSelectedAdvance(null)}
                    disabled={disableDirectAction}
                  >
                    Duyệt
                  </BrandButton>
                </div>
              );
            })()}
          </div>
        )}
      </div>

    </StandardPage>
  );
}
