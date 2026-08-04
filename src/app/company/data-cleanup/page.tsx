"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface TableInfo {
  name: string;
  count: number;
  error?: boolean;
}

const TABLE_DESCRIPTIONS: Record<string, string> = {
  CompanyInfo: "Thông tin cơ sở dữ liệu công ty",
  SeajongCategory: "Danh mục sản phẩm đồng bộ từ website",
  SeajongProduct: "Sản phẩm đồng bộ từ website",
  SeajongProductVariation: "Biến thể sản phẩm đồng bộ từ website",
  SeajongSyncLog: "Lịch sử đồng bộ dữ liệu website",
  LogisticsSyncLog: "Lịch sử đồng bộ kho vận",
  Client: "Khách hàng/Đối tác",
  Industry: "Ngành nghề kinh doanh",
  User: "Tài khoản người dùng hệ thống",
  Employee: "Hồ sơ nhân viên",
  LaborContract: "Hợp đồng lao động",
  EmploymentHistory: "Lịch sử công tác",
  EmployeeProbation: "Đánh giá thử việc",
  EmployeeProbationEvent: "Sự kiện trong kỳ thử việc",
  Payroll: "Bảng lương nhân viên",
  Module: "Các phân hệ chức năng hệ thống",
  DepartmentCategory: "Danh mục phòng ban",
  HrStationeryDepartmentBudget: "Ngân sách văn phòng phẩm phòng ban",
  Category: "Danh mục dùng chung",
  CategoryTypeDef: "Định nghĩa loại danh mục",
  Branch: "Chi nhánh công ty",
  Notification: "Thông báo hệ thống",
  NotificationRecipient: "Người nhận thông báo",
  Message: "Tin nhắn nội bộ",
  MessageParticipant: "Người tham gia trò chuyện",
  Customer: "Khách hàng mua hàng",
  CustomerCareHistory: "Lịch sử chăm sóc khách hàng",
  Supplier: "Nhà cung cấp",
  SupplierCategory: "Danh mục nhà cung cấp",
  SaleOrder: "Đơn hàng bán",
  SaleOrderItem: "Chi tiết đơn hàng bán",
  ProductionIncident: "Sự cố sản xuất",
  PurchaseRequest: "Yêu cầu mua hàng",
  PurchaseRequestItem: "Chi tiết yêu cầu mua",
  PurchaseOrder: "Đơn đặt hàng mua",
  PurchaseOrderItem: "Chi tiết đơn đặt hàng mua",
  PurchaseOrderActivity: "Lịch sử xử lý đơn mua",
  Expense: "Khoản chi phí",
  Debt: "Công nợ",
  Asset: "Tài sản công ty",
  InventoryCategory: "Danh mục kho hàng",
  Warehouse: "Kho lưu trữ",
  InventoryItem: "Sản phẩm/Vật tư trong kho",
  DinhMuc: "Định mức sản xuất",
  DinhMucVatTu: "Định mức vật tư tiêu hao",
  InventoryStock: "Tồn kho thực tế",
  StockMovement: "Lịch sử xuất/nhập/chuyển kho",
  StockCount: "Phiếu kiểm kê kho",
  StockCountLine: "Chi tiết kiểm kê",
  Quotation: "Báo giá cho khách hàng",
  QuotationNegotiation: "Thương lượng báo giá",
  QuotationItem: "Chi tiết báo giá",
  Contract: "Hợp đồng kinh tế",
  RetailInvoice: "Hóa đơn bán lẻ",
  RetailInvoiceItem: "Chi tiết hóa đơn bán lẻ",
  MonthlySalesSnapshot: "Báo cáo doanh thu tháng",
  Task: "Công việc cá nhân/dự án",
  TaskComment: "Bình luận công việc",
  Competitor: "Đối thủ cạnh tranh",
  MarketingAnnualPlan: "Kế hoạch marketing năm",
  MarketingTheme: "Chủ đề marketing",
  MarketingContent: "Nội dung marketing",
  MarketingMonthlyPlan: "Kế hoạch marketing tháng",
  MarketingTask: "Công việc marketing",
  MarketingTaskComment: "Bình luận công việc marketing",
  MediaFolder: "Thư mục media",
  MediaAsset: "Tài nguyên media (hình ảnh, video)",
  MarketingYearlyPlan: "Kế hoạch marketing tổng thể năm",
  MarketingGeneralPlan: "Kế hoạch marketing chung",
  MarketingYearlyGoal: "Mục tiêu marketing năm",
  MarketingYearlyTask: "Nhiệm vụ marketing năm",
  OutlineMarketingPlan: "Đề cương kế hoạch marketing",
  MarketingExecutionMonth: "Tháng triển khai marketing",
  MarketingExecutionGroup: "Nhóm thực thi marketing",
  MarketingExecutionDetail: "Chi tiết thực thi marketing",
  ApprovalRequest: "Yêu cầu cần phê duyệt",
  ApprovalComment: "Bình luận phê duyệt",
  SocialConnection: "Kết nối mạng xã hội",
  MarketingCampaign: "Chiến dịch marketing",
  MarketingLead: "Khách hàng tiềm năng (Lead)",
  PartnerCareHistory: "Lịch sử chăm sóc đối tác",
  PartnerBonusFormula: "Công thức tính thưởng đối tác",
  MarketingInsight: "Phân tích insight khách hàng",
  MarketingBudgetPlan: "Kế hoạch ngân sách marketing",
  MarketingBudgetItem: "Hạng mục ngân sách marketing",
  MarketingMonthlyBudgetTotal: "Tổng ngân sách tháng",
  MarketingMonthlyBudgetItem: "Chi tiết ngân sách tháng",
  MarketingEvent: "Sự kiện marketing",
  MarketingEventContent: "Nội dung sự kiện",
  MarketingEventTask: "Công việc sự kiện",
  RecruitmentRequest: "Yêu cầu tuyển dụng",
  Candidate: "Ứng viên",
  InterviewScorecard: "Phiếu đánh giá phỏng vấn",
  TrainingRequest: "Yêu cầu đào tạo",
  TrainingPlan: "Kế hoạch đào tạo",
  TrainingCourse: "Khóa học đào tạo",
  TrainingParticipant: "Người tham gia đào tạo",
  TrainingQuestion: "Câu hỏi đào tạo/Kiểm tra",
  PromotionRequest: "Yêu cầu thăng tiến",
  SalaryAdjustmentRequest: "Yêu cầu điều chỉnh lương",
  PersonalRequest: "Yêu cầu cá nhân (nghỉ phép, công tác)",
  Attendance: "Chấm công",
  LaborPolicy: "Chính sách nhân sự",
  BranchSubnet: "Cấu hình mạng chi nhánh (chấm công WiFi)",
  TerminationRequest: "Yêu cầu nghỉ việc",
  ChannelConnection: "Kết nối kênh bán hàng",
  OmnichannelOrder: "Đơn hàng đa kênh",
  OmnichannelOrderItem: "Chi tiết đơn hàng đa kênh",
  InsuranceConfig: "Cấu hình bảo hiểm",
  InsuranceHistory: "Lịch sử đóng bảo hiểm",
  InsuranceChange: "Thay đổi mức bảo hiểm",
  InsuranceBenefit: "Chế độ bảo hiểm hưởng",
  HrSupplyCategory: "Danh mục cấp phát nội bộ",
  HrSupplyItem: "Vật tư cấp phát nội bộ",
  HrSupplyTransaction: "Lịch sử cấp phát vật tư",
  HrStationeryNorm: "Định mức văn phòng phẩm",
  HrSupplyRequest: "Yêu cầu cấp phát vật tư",
  HrSupplyRequestItem: "Chi tiết yêu cầu cấp phát",
  HrAssetHandover: "Biên bản bàn giao tài sản",
  EmailConfig: "Cấu hình Email/SMTP",
  AttendanceConfirmation: "Xác nhận bảng công",
  PayrollConfirmation: "Xác nhận bảng lương",
  Meeting: "Lịch họp",
  SalesYearlyPlan: "Kế hoạch doanh số năm",
  SalesMonthlyPlan: "Kế hoạch doanh số tháng",
  MasterYearlyPlan: "Kế hoạch tổng thể năm",
  CabinetCategoryItem: "Hạng mục tủ trưng bày",
  BankLoan: "Hồ sơ vay vốn ngân hàng",
  OemSalesYearlyPlan: "Kế hoạch doanh số OEM năm",
  OemMasterYearlyPlan: "Kế hoạch tổng thể OEM",
  AccountingAccount: "Tài khoản kế toán",
  MonthlyBalance: "Số dư đầu kỳ/cuối kỳ",
  JournalEntry: "Bút toán",
  JournalLine: "Chi tiết bút toán",
  DefectRecord: "Biên bản hàng lỗi",
  DefectActivity: "Lịch sử xử lý hàng lỗi",
  TaxPolicyNews: "Tin tức chính sách thuế",
  TaxQA: "Hỏi đáp thuế",
  SoftSkillQA: "Hỏi đáp kỹ năng mềm",
  SalesPolicy: "Chính sách bán hàng",
  SalesPromotion: "Chương trình khuyến mãi",
  QualityInspection: "Kiểm tra chất lượng (QC)",
  LogisticsTicket: "Phiếu xuất/nhập kho (Logistics)",
  LogisticsTicketItem: "Chi tiết xuất/nhập kho",
  InventoryReservation: "Giữ chỗ tồn kho",
  InternalKpiCriteria: "Tiêu chí KPI nội bộ",
  InternalKpiReport: "Báo cáo KPI nội bộ",
  InternalKpiReportDetail: "Chi tiết báo cáo KPI",
  InternalIncomeReport: "Báo cáo thu nhập nội bộ",
  PaymentNotification: "Thông báo tiền vào (Giao dịch)",
  Revenue: "Ghi nhận doanh thu",
};

export default function DataCleanupPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { success, error: showError } = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetTable, setTargetTable] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/database/tables");
      if (!res.ok) throw new Error("Failed to fetch tables");
      const data = await res.json();
      setTables(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!targetTable) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/database/tables/${targetTable}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi xoá");
      }
      success(`Đã xoá rỗng bảng ${targetTable}`);
      fetchTables();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setTargetTable(null);
    }
  };

  const confirmDelete = (tableName: string) => {
    setTargetTable(tableName);
    setDeleteModalOpen(true);
  };

  const filteredTables = tables.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px", color: "var(--foreground)" }}>
            Làm sạch dữ liệu
          </h1>
          <p style={{ color: "var(--muted-foreground)", margin: 0, fontSize: 14 }}>
            Quản lý các bảng trong cơ sở dữ liệu và xoá rỗng (truncate) toàn bộ dữ liệu khi cần thiết. 
          </p>
        </div>
        <button 
          onClick={fetchTables} 
          disabled={loading}
          style={{ 
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", 
            background: "var(--card)", fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}
        >
          <i className="bi bi-arrow-clockwise" /> Làm mới
        </button>
      </div>

      <div style={{ background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <i className="bi bi-search text-muted-foreground" />
          <input 
            type="text"
            placeholder="Tìm kiếm tên bảng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", flex: 1, fontSize: 14 }}
          />
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted-foreground)" }}>TÊN BẢNG (TABLE)</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "var(--muted-foreground)" }}>SỐ BẢN GHI</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "var(--muted-foreground)", width: 120 }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)" }}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredTables.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)" }}>
                    Không tìm thấy bảng nào
                  </td>
                </tr>
              ) : filteredTables.map((t) => (
                <tr key={t.name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                      {TABLE_DESCRIPTIONS[t.name] || "Bảng lưu trữ dữ liệu hệ thống"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {t.error ? (
                      <span style={{ color: "#ef4444" }}>Lỗi đếm</span>
                    ) : (
                      <span style={{ 
                        display: "inline-block", padding: "2px 8px", borderRadius: 12, 
                        background: t.count > 0 ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)", 
                        color: t.count > 0 ? "#3b82f6" : "#64748b",
                        fontWeight: 700
                      }}>
                        {t.count.toLocaleString("vi-VN")}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => confirmDelete(t.name)}
                      disabled={t.count === 0}
                      style={{
                        padding: "6px 12px", borderRadius: 6, border: "none",
                        background: t.count > 0 ? "rgba(239,68,68,0.1)" : "transparent",
                        color: t.count > 0 ? "#ef4444" : "var(--muted-foreground)",
                        fontSize: 12, fontWeight: 600,
                        cursor: t.count > 0 ? "pointer" : "not-allowed",
                        opacity: t.count > 0 ? 1 : 0.5
                      }}
                    >
                      <i className="bi bi-trash3" style={{ marginRight: 4 }} /> Xoá rỗng
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(0,0,0,0.5)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "var(--card)", padding: 24, borderRadius: 16, width: "100%", maxWidth: 400,
            border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: "#ef4444", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="bi bi-exclamation-triangle-fill" /> Cảnh báo rủi ro
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Bạn chuẩn bị xoá toàn bộ dữ liệu trong bảng <strong>{targetTable}</strong>. <br /><br />
              Hành động này sẽ làm rỗng bảng ngay lập tức và <strong>KHÔNG THỂ HOÀN TÁC</strong>. Nếu bảng này đang được liên kết từ bảng khác, hệ thống sẽ báo lỗi.
              <br /><br />
              Bạn có chắc chắn muốn xoá rỗng bảng này không?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button 
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--foreground)", fontSize: 14, fontWeight: 600, cursor: "pointer"
                }}
              >
                Hủy
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: "#ef4444", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8
                }}
              >
                {deleting ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-trash3-fill" />}
                Xác nhận xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
