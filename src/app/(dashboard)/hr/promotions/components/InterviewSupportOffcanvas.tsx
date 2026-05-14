"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type?: "PROMOTION" | "TRANSFER" | "DEMOTION";
}

export const InterviewSupportOffcanvas = ({ isOpen, onClose, type: initialType }: Props) => {
  const [activeTab, setActiveTab] = useState<string>("PROMOTION");

  useEffect(() => {
    if (initialType) {
      setActiveTab(initialType);
    }
  }, [initialType, isOpen]);

  const data = {
    PROMOTION: {
      title: "Phỏng vấn Đề bạt",
      icon: "bi-graph-up-arrow",
      color: "#8b5cf6",
      desc: "Đánh giá năng lực lãnh đạo và sự sẵn sàng cho trách nhiệm mới.",
      groups: [
        {
          name: "Thành tích & Sự sẵn sàng",
          questions: [
            { q: "Hãy chia sẻ về một thành tích nổi bật nhất mà bạn đã đạt được ở vị trí hiện tại. Điều đó đóng góp như thế nào vào mục tiêu chung?", a: "Ứng viên cần chỉ ra được kết quả định lượng, sự chủ động và hiểu biết về tầm nhìn chung." },
            { q: "Sự khác biệt lớn nhất giữa vị trí hiện tại và vị trí mới là gì? Kỹ năng nào bạn cần trau dồi thêm?", a: "Sự trung thực, khả năng tự soi xét và ý thức về trách nhiệm mới." },
            { q: "Kế hoạch hành động trong 30 - 90 ngày đầu tiên của bạn là gì?", a: "Tư duy hệ thống, ưu tiên công việc và cách tiếp cận nhân sự." }
          ]
        },
        {
          name: "Lãnh đạo & Quản trị",
          questions: [
            { q: "Hãy kể về lần bạn dẫn dắt đội ngũ vượt qua khó khăn lớn. Bạn đã làm gì để giữ vững tinh thần mọi người?", a: "Kỹ năng truyền cảm hứng, sự kiên định và thấu cảm." },
            { q: "Bạn xử lý thế nào khi có hai nhân viên xuất sắc xảy ra mâu thuẫn gay gắt?", a: "Sự công bằng, quyết đoán và giải quyết tận gốc vấn đề." }
          ]
        }
      ]
    },
    TRANSFER: {
      title: "Phỏng vấn Luân chuyển",
      icon: "bi-arrow-left-right",
      color: "#3b82f6",
      desc: "Đánh giá khả năng thích nghi và các kỹ năng chuyển đổi.",
      groups: [
        {
          name: "Động lực & Thích nghi",
          questions: [
            { q: "Động lực lớn nhất khiến bạn mong muốn luân chuyển sang bộ phận mới này là gì?", a: "Động lực nội tại, mong muốn phát triển thay vì trốn tránh vị trí cũ." },
            { q: "Bạn dự đoán mình sẽ gặp những khó khăn gì trong 1-2 tháng đầu? Bạn đã chuẩn bị gì?", a: "Sự chuẩn bị chủ động và khả năng lường trước vấn đề." }
          ]
        },
        {
          name: "Thế mạnh & Đóng góp",
          questions: [
            { q: "Những kinh nghiệm từ vị trí cũ sẽ giúp bạn tạo ra lợi thế gì ở vị trí mới?", a: "Nhận biết giá trị gia tăng mà họ mang lại cho bộ phận mới." },
            { q: "Bạn cần công ty hỗ trợ những nguồn lực gì để bắt nhịp nhanh nhất?", a: "Sự rõ ràng về nhu cầu đào tạo/công cụ." }
          ]
        }
      ]
    },
    DEMOTION: {
      title: "Trao đổi Miễn nhiệm",
      icon: "bi-shield-exclamation",
      color: "#f43f5e",
      desc: "Dựa trên hiệu suất (Performance Review), đảm bảo minh bạch và tôn trọng.",
      groups: [
        {
          name: "Nhìn nhận quá trình",
          questions: [
            { q: "Cùng nhìn lại kỳ đánh giá, bạn tự nhận xét thế nào về mức độ hoàn thành KPI so với kỳ vọng?", a: "Sự thẳng thắn đối diện với kết quả chưa đạt." },
            { q: "Đâu là những rào cản khiến kết quả công việc chưa đạt như mong đợi?", a: "Nhìn nhận cả yếu tố khách quan lẫn chủ quan." }
          ]
        },
        {
          name: "Phản hồi & Tương lai",
          questions: [
            { q: "Có điều gì về quy trình hay văn hóa mà bạn nghĩ công ty có thể làm tốt hơn không?", a: "Lắng nghe tâm tư để cải thiện hệ thống." },
            { q: "Bạn có nguyện vọng gì về lộ trình công việc sắp tới để phù hợp với năng lực hiện tại?", a: "Tìm kiếm cơ hội phù hợp hơn." }
          ]
        }
      ]
    }
  };

  const currentData = data[activeTab as keyof typeof data];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.3)", zIndex: 1060, backdropFilter: "blur(4px)" }}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{ 
              position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", 
              background: "#fff", zIndex: 1070, 
              boxShadow: "-10px 0 40px rgba(0,0,0,0.1)",
              display: "flex", flexDirection: "column",
              borderLeft: "1px solid rgba(0,0,0,0.05)", overflow: "hidden"
            }}
          >
            {/* Header */}
            <div className="p-4 relative">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="badge rounded-pill px-3 py-2 d-flex align-items-center gap-2" 
                  style={{ background: `${currentData.color}15`, color: currentData.color, fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  <i className={`bi ${currentData.icon}`}></i>
                  TRỢ LÝ PHỎNG VẤN
                </div>
                <button className="btn btn-link p-0 text-muted" onClick={onClose}><i className="bi bi-x-lg"></i></button>
              </div>
              <h4 className="fw-bold text-dark mb-1">{currentData.title}</h4>
              <p className="text-muted mb-0" style={{ fontSize: "11px", lineHeight: "1.4" }}>{currentData.desc}</p>
            </div>

            {/* Tabs if no initialType */}
            {!initialType && (
              <div className="px-4 mb-3">
                <div className="d-flex p-1 bg-light rounded-pill" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
                  {Object.entries(data).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-grow-1 border-0 rounded-pill py-2 px-2 small fw-bold transition-all ${activeTab === key ? "bg-white shadow-sm text-primary" : "text-muted bg-transparent"}`}
                      style={{ fontSize: "11px" }}
                    >
                      {key === "PROMOTION" ? "Đề bạt" : key === "TRANSFER" ? "Luân chuyển" : "Miễn nhiệm"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar" style={{ background: "linear-gradient(180deg, #fff 0%, #f8fafc 100%)" }}>
              {currentData.groups.map((group, gIdx) => (
                <div key={gIdx} className="mb-5">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div style={{ width: 4, height: 16, background: currentData.color, borderRadius: 2 }}></div>
                    <span className="fw-bold text-dark" style={{ fontSize: "13px", letterSpacing: "0.5px" }}>{group.name.toUpperCase()}</span>
                  </div>
                  
                  <div className="d-flex flex-column gap-4">
                    {group.questions.map((item, qIdx) => (
                      <div key={qIdx} className="position-relative">
                        <div className="fw-bold text-dark mb-2" style={{ fontSize: "13.5px", lineHeight: "1.5" }}>
                          <span className="text-muted me-2" style={{ fontFamily: "serif" }}>Q.</span>
                          {item.q}
                        </div>
                        <div className="p-3 rounded-4" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                          <div className="d-flex align-items-center gap-2 mb-2 text-primary fw-bold" style={{ fontSize: "11px" }}>
                            <i className="bi bi-lightbulb-fill"></i>
                            KỲ VỌNG PHẢN HỒI
                          </div>
                          <div className="text-muted small" style={{ lineHeight: "1.6" }}>{item.a}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
