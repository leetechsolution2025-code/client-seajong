"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { BrandButton } from "@/components/ui/BrandButton";

interface ConfigData {
  allRequired: boolean;
  threshold: number;
  mandatoryCategories: string[];
}

export default function LaborPolicyConfig() {
  const toast = useToast();
  const [config, setConfig] = useState<ConfigData>({
    allRequired: false,
    threshold: 5000000,
    mandatoryCategories: [
      "Mua / thuê tài sản cố định",
      "Mua thiết bị, máy móc",
      "Chi phí marketing, quảng cáo",
      "Chi phí nhân sự, đào tạo",
      "Mua hàng từ nhà cung cấp",
      "Chi phí công tác, đi lại",
      "Khẩn cấp / sự cố"
    ]
  });

  const [customCategory, setCustomCategory] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>(["Mua / thuê tài sản cố định", "Chi phí marketing, quảng cáo"]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const toggleCategory = (cat: string) => {
    if (selectedCats.includes(cat)) {
      setSelectedCats(selectedCats.filter(c => c !== cat));
    } else {
      setSelectedCats([...selectedCats, cat]);
    }
  };

  const handleAddCustom = () => {
    if (!customCategory.trim()) return;
    if (!config.mandatoryCategories.includes(customCategory)) {
      setConfig({
        ...config,
        mandatoryCategories: [...config.mandatoryCategories, customCategory]
      });
      setSelectedCats([...selectedCats, customCategory]);
    }
    setCustomCategory("");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-5"
      style={{ fontSize: '13px' }}
    >
      {/* Alert Banner */}
      <div className="alert alert-info border-0 rounded-4 shadow-sm mb-3 d-flex align-items-center gap-3 p-2 bg-opacity-10" style={{ backgroundColor: '#f0f9ff', color: '#0c4a6e' }}>
        <div className="rounded-circle bg-white d-flex align-items-center justify-content-center shadow-sm" style={{ width: 28, height: 28, flexShrink: 0 }}>
          <i className="bi bi-info-circle text-info fs-6"></i>
        </div>
        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
          <strong className="d-block" style={{ fontSize: '13px' }}>Nguyên tắc kiểm soát chi tiêu</strong>
          Mọi yêu cầu chi tiền vượt ngưỡng hoặc thuộc danh mục bắt buộc sẽ phải qua luồng phê duyệt trước khi thủ quỹ lập phiếu chi. 
          Người có quyền <strong>Duyệt ngân sách</strong> hoặc <strong>Admin</strong> sẽ là người phê duyệt.
        </div>
      </div>

      {/* Section 1: Threshold */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-cash-stack text-primary fs-6"></i>
            <h6 className="mb-0 fw-bold" style={{ fontSize: '14px' }}>Ngưỡng số tiền bắt buộc trình duyệt</h6>
          </div>

          <div className="bg-light rounded-3 p-3 mb-3 border border-light-subtle">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1 fw-bold" style={{ fontSize: '13px' }}>Tất cả yêu cầu đều phải trình duyệt</h6>
                <div className="text-muted" style={{ fontSize: '11px' }}>Khi bật: bỏ qua ngưỡng bên dưới, 100% yêu cầu chi đều phải qua phê duyệt trước khi thủ quỹ nhận</div>
              </div>
              <div className="form-check form-switch fs-5">
                <input 
                  className="form-check-input shadow-none" 
                  type="checkbox" 
                  checked={config.allRequired}
                  onChange={(e) => setConfig({ ...config, allRequired: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          <div className={`transition-all ${config.allRequired ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="fw-bold text-muted text-uppercase mb-2 d-block" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>YÊU CẦU CHI TỪ SỐ TIỀN (Đ) TRỞ LÊN → BẮT BUỘC TRÌNH DUYỆT</label>
            <div className="d-flex align-items-center gap-3">
              <div className="position-relative" style={{ maxWidth: '200px' }}>
                <input 
                  type="number" 
                  className="form-control border-0 bg-light rounded-3 fw-bold py-2"
                  value={config.threshold}
                  onChange={(e) => setConfig({ ...config, threshold: Number(e.target.value) })}
                  style={{ fontSize: '15px' }}
                />
              </div>
              <div className="fw-bold text-muted" style={{ fontSize: '14px' }}>= {formatMoney(config.threshold)}</div>
            </div>
            <div className="mt-2 text-muted d-flex align-items-center gap-2" style={{ fontSize: '11px' }}>
              <i className="bi bi-lightbulb text-warning"></i>
              VD: Đặt {formatMoney(config.threshold)} → Yêu cầu &lt; {config.threshold / 1000000} triệu gửi thẳng Thủ quỹ, từ {config.threshold / 1000000} triệu trở lên phải trình duyệt
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Categories */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3">
          <div className="d-flex align-items-center gap-2 mb-1">
            <i className="bi bi-list-check text-primary fs-6"></i>
            <h6 className="mb-0 fw-bold" style={{ fontSize: '14px' }}>Loại chi phí bắt buộc trình duyệt trong mọi trường hợp</h6>
          </div>
          <p className="text-muted mb-3" style={{ fontSize: '12px' }}>Các loại chi phí trong danh sách này luôn phải trình duyệt <strong>bất kể số tiền</strong>, ngay cả khi tắt ngưỡng hoặc tắt chế độ bắt buộc tất cả.</p>

          <div className="mb-2 fw-bold text-muted text-uppercase" style={{ fontSize: '10px' }}>GỢI Ý NHANH</div>
          
          <div className="row g-2 mb-3">
            {config.mandatoryCategories.map((cat) => {
              const isSelected = selectedCats.includes(cat);
              return (
                <div className="col-md-6" key={cat}>
                  <div 
                    className={`d-flex align-items-center gap-2 p-2 px-3 rounded-3 border bg-white transition-all border-light-subtle`}
                    onClick={() => toggleCategory(cat)}
                    style={{ cursor: 'pointer', minHeight: '45px' }}
                  >
                    <div className="form-check mb-0">
                      <input 
                        className="form-check-input shadow-none cursor-pointer" 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent
                        style={{ width: '16px', height: '16px' }}
                      />
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
                      <i className={`bi ${getIconForCat(cat)} text-muted`}></i>
                      <span className={`text-truncate ${isSelected ? 'fw-bold text-dark' : 'text-muted'}`} style={{ fontSize: '12px' }}>{cat}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="d-flex gap-2">
            <input 
              type="text" 
              className="form-control bg-light border-0 py-2 rounded-3" 
              placeholder="Nhập loại chi phí tùy chỉnh..."
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              style={{ fontSize: '12px' }}
            />
            <button 
              className="btn btn-light px-3 rounded-3 d-flex align-items-center gap-2 border border-light-subtle"
              onClick={handleAddCustom}
              style={{ fontSize: '12px' }}
            >
              <i className="bi bi-plus-lg"></i> Thêm
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 d-flex justify-content-end">
        <BrandButton 
          variant="primary" 
          className="px-4 py-2 rounded-pill shadow-sm"
          onClick={() => toast.success("Thành công", "Đã lưu thiết lập thông số!")}
          style={{ fontSize: '13px' }}
        >
          Lưu cấu hình thông số
        </BrandButton>
      </div>

      <style jsx>{`
        .transition-all { transition: all 0.2s ease; }
        .cursor-pointer { cursor: pointer; }
        .form-check-input { cursor: pointer; border-color: #dee2e6; }
        .form-check-input:checked { background-color: #3b82f6; border-color: #3b82f6; }
      `}</style>
    </motion.div>
  );
}

function getIconForCat(name: string) {
  if (name.includes("tài sản")) return "bi-calculator";
  if (name.includes("thiết bị")) return "bi-tools";
  if (name.includes("marketing")) return "bi-megaphone";
  if (name.includes("nhân sự")) return "bi-person-badge";
  if (name.includes("nhà cung cấp")) return "bi-cart";
  if (name.includes("công tác")) return "bi-airplane";
  if (name.includes("khẩn cấp")) return "bi-exclamation-triangle";
  return "bi-folder";
}
