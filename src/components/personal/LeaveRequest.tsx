"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RequestCard } from "./RequestCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { BrandButton } from "@/components/ui/BrandButton";
import { PersonalRequestOffcanvas } from "./PersonalRequestOffcanvas";

const REQUEST_TYPES = [
  {
    id: "leave",
    title: "nghỉ phép",
    description: "Đăng ký nghỉ phép năm, nghỉ việc riêng hoặc nghỉ không lương.",
    icon: "bi-calendar-check",
    color: "#10b981",
  },
  {
    id: "overtime",
    title: "Làm thêm giờ",
    description: "Đăng ký làm thêm ngoài giờ (OT) để ghi nhận công và tính lương.",
    icon: "bi-clock-history",
    color: "#f59e0b",
  },
  {
    id: "business-trip",
    title: "Công tác",
    description: "Yêu cầu đi công tác, đặt vé máy bay, khách sạn và tạm ứng chi phí.",
    icon: "bi-airplane-engines",
    color: "#3b82f6",
  },
  {
    id: "hr-request",
    title: "Nhân sự và Hồ sơ",
    description: "Yêu cầu cấp giấy xác nhận công tác, điều chuyển hoặc cập nhật thông tin.",
    icon: "bi-person-badge",
    color: "#8b5cf6",
  },
  {
    id: "finance",
    title: "Tài chính và Thanh toán",
    description: "Đề nghị tạm ứng, thanh toán chi phí hoặc hoàn ứng sau công tác.",
    icon: "bi-cash-stack",
    color: "#06b6d4",
  },
  {
    id: "asset",
    title: "Tài sản và Thiết bị",
    description: "Yêu cầu cấp phát văn phòng phẩm, thiết bị làm việc hoặc mượn tài sản.",
    icon: "bi-laptop",
    color: "#6366f1",
  },
];

export function LeaveRequest() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);

  const filteredTypes = REQUEST_TYPES.filter(
    (type) =>
      type.title.toLowerCase().includes(search.toLowerCase()) ||
      type.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCardClick = (typeId: string) => {
    setSelectedType(typeId);
    setIsOffcanvasOpen(true);
  };

  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Tạo yêu cầu"
        description="Đăng ký nghỉ phép, nghỉ ốm hoặc các loại đơn từ khác"
        icon="bi-file-earmark-plus"
        color="rose"
      />
      
      <div className="flex-grow-1 p-4">
        <div className="container-fluid p-0">
          {/* Header Actions */}
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
            <div style={{ maxWidth: "400px", width: "100%" }}>
              <SearchInput 
                value={search} 
                onChange={setSearch} 
                placeholder="Tìm kiếm loại yêu cầu (vd: nghỉ phép, công tác...)" 
              />
            </div>
            
            <div className="d-flex align-items-center gap-3">
              <div className="d-none d-lg-flex align-items-center gap-2 text-muted" style={{ fontSize: "0.85rem" }}>
                <i className="bi bi-info-circle"></i>
                <span>Chọn một loại yêu cầu bên dưới để bắt đầu</span>
              </div>
              <BrandButton variant="outline" icon="bi-list-ul">
                Danh sách yêu cầu của tôi
              </BrandButton>
            </div>
          </div>

          {/* Grid */}
          <div className="row">
            {filteredTypes.length > 0 ? (
              filteredTypes.map((type) => (
                <RequestCard
                  key={type.id}
                  title={type.title}
                  description={type.description}
                  icon={type.icon}
                  color={type.color}
                  onClick={() => handleCardClick(type.id)}
                />
              ))
            ) : (
              <div className="col-12 text-center py-5">
                <div className="mb-3" style={{ fontSize: "3rem", opacity: 0.2 }}>
                  <i className="bi bi-search"></i>
                </div>
                <h5 className="text-muted">Không tìm thấy loại yêu cầu nào phù hợp</h5>
                <p className="text-muted small">Vui lòng thử lại với từ khóa khác</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <PersonalRequestOffcanvas 
        isOpen={isOffcanvasOpen}
        onClose={() => setIsOffcanvasOpen(false)}
        type={selectedType}
        onSuccess={() => {
          // Re-fetch or refresh logic can go here
        }}
      />
    </div>
  );
}
