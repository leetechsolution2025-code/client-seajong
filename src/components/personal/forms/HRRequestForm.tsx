"use client";

import React, { useState } from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { BrandButton } from "@/components/ui/BrandButton";
import { ResignationEditor } from "./ResignationEditor";
import { useSession } from "next-auth/react";

interface HRRequestFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function HRRequestForm({ onSubmit, loading }: HRRequestFormProps) {
  const { data: session } = useSession();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [letterContent, setLetterContent] = useState("");
  
  const [formData, setFormData] = useState({
    requestType: "Xác nhận công tác",
    expectedDate: "",
    reason: "",
    details: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: "hr-request",
      startDate: formData.expectedDate,
      endDate: formData.expectedDate,
      reason: formData.reason,
      details: {
        requestType: formData.requestType,
        updateDetails: formData.details,
        resignationLetter: letterContent,
      }
    });
  };

  const inputStyle = {
    borderRadius: "12px", padding: "10px 15px", border: "1px solid var(--border)",
    background: "var(--background)", color: "var(--foreground)",
    fontSize: "14px", transition: "all 0.2s"
  };

  return (
    <div className="d-flex flex-column h-100 overflow-hidden">
      <form id="personal-request-form" onSubmit={handleSubmit} className="flex-grow-1 d-flex flex-column gap-3 overflow-hidden">
        <div className="row g-3 flex-shrink-0">
          <div className="col-12">
            <SectionTitle title="Loại yêu cầu nhân sự" className="mb-1" />
            <select 
              className="form-select shadow-none" 
              style={inputStyle} 
              value={formData.requestType}
              onChange={e => setFormData({...formData, requestType: e.target.value})}
            >
              <option>Xác nhận công tác</option>
              <option>Xác nhận mức lương</option>
              <option>Cập nhật thông tin cá nhân</option>
              <option>Đề nghị điều chuyển công tác</option>
              <option>Thông báo nghỉ việc</option>
              <option>Yêu cầu khác về hồ sơ</option>
            </select>
          </div>

          <div className="col-12">
            <SectionTitle title={formData.requestType.includes("nghỉ việc") ? "Ngày dự kiến nghỉ việc" : "Ngày cần nhận kết quả"} className="mb-1" />
            <div className="d-flex gap-2">
              <input 
                type="date" 
                className="form-control shadow-none" 
                style={{ ...inputStyle, flex: 1 }} 
                value={formData.expectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setFormData({...formData, expectedDate: e.target.value})}
                required 
              />
              {formData.requestType.includes("nghỉ việc") && (
                <>
                  <BrandButton 
                    type="button" 
                    variant="outline" 
                    icon="bi-pencil-square"
                    style={{ borderRadius: '12px', height: '40px' }}
                    onClick={() => setIsEditorOpen(true)}
                  >
                    {letterContent ? "Xem lại đơn" : "Viết đơn"}
                  </BrandButton>
                  <BrandButton 
                    type="button" 
                    variant="outline" 
                    icon="bi-paperclip"
                    style={{ borderRadius: '12px', width: '40px', height: '40px', minWidth: '40px' }}
                  >
                    {""}
                  </BrandButton>
                </>
              )}
            </div>
          </div>

          {formData.requestType.includes("Cập nhật thông tin") && (
            <div className="col-12">
              <SectionTitle title="Thông tin cần cập nhật" className="mb-1" />
              <textarea 
                className="form-control shadow-none" 
                style={{ ...inputStyle, height: "80px", resize: "none" }} 
                value={formData.details}
                onChange={e => setFormData({...formData, details: e.target.value})}
                placeholder="Vui lòng liệt kê các thông tin mới cần thay đổi..."
                required
              ></textarea>
            </div>
          )}
        </div>

        <div className="d-flex flex-column flex-grow-1 overflow-hidden mt-1">
          <SectionTitle title="Lý do và Ghi chú" className="mb-1" />
          <textarea 
            className="form-control shadow-none flex-grow-1" 
            style={{ ...inputStyle, resize: "none", minHeight: "100px" }} 
            value={formData.reason}
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="Mô tả chi tiết mục đích yêu cầu..."
            required
          ></textarea>
        </div>
      </form>

      <ResignationEditor 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={setLetterContent}
        initialContent={letterContent}
        employeeName={session?.user?.name || undefined}
        departmentName={(session?.user as any)?.departmentName}
        position={(session?.user as any)?.positionName || (session?.user as any)?.position}
        expectedDate={formData.expectedDate}
        reason={formData.reason}
      />
    </div>
  );
}
