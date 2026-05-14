"use client";

import React, { useState, useRef } from "react";
import { BrandButton } from "@/components/ui/BrandButton";

interface ResignationEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  initialContent?: string;
  employeeName?: string;
  departmentName?: string;
  position?: string;
  expectedDate?: string;
  reason?: string;
}

export function ResignationEditor({ 
  isOpen, 
  onClose, 
  onSave, 
  initialContent = "", 
  employeeName = "................................",
  departmentName = "................................",
  position = "................................",
  expectedDate = "",
  reason = ""
}: ResignationEditorProps) {
  // Parse expectedDate
  const dateObj = expectedDate ? new Date(expectedDate) : null;
  const day = dateObj && !isNaN(dateObj.getTime()) ? dateObj.getDate().toString().padStart(2, '0') : "….";
  const month = dateObj && !isNaN(dateObj.getTime()) ? (dateObj.getMonth() + 1).toString().padStart(2, '0') : "….";
  const year = dateObj && !isNaN(dateObj.getTime()) ? dateObj.getFullYear().toString() : "20...";

  const generateTemplate = () => `
<div style="text-align: center; margin-bottom: 25px; font-family: 'Times New Roman', Times, serif; font-size: 13pt;">
  <h2 style="margin: 0; font-weight: bold; text-transform: uppercase; font-size: 13pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
  <h3 style="margin: 5px 0; font-weight: bold; font-size: 13pt;">Độc lập - Tự do - Hạnh phúc</h3>
  <div style="margin: 10px auto; width: 160px; border-bottom: 1px solid black;"></div>
</div>

<div style="text-align: center; margin-bottom: 30px; font-family: 'Times New Roman', Times, serif;">
  <h1 style="margin: 0; font-weight: bold; font-size: 16pt; text-transform: uppercase;">THÔNG BÁO NGHỈ VIỆC</h1>
</div>

<div style="font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; text-align: justify;">
  <div style="margin-bottom: 20px;">
    <p style="margin: 0;">Kính gửi:</p>
    <div style="padding-left: 60px;">
      <p style="margin: 0;">- Ban Giám đốc Công ty Cổ phần Seajong Faucet Việt Nam;</p>
      <p style="margin: 0;">- Trưởng phòng Hành chính Nhân sự;</p>
      <p style="margin: 0;">- Trưởng phòng ${departmentName};</p>
    </div>
  </div>
  
  <p style="margin-bottom: 15px;">Tôi tên là: <strong>${employeeName}</strong></p>
  
  <p style="margin-bottom: 15px;">Chức vụ: <strong>${position}</strong> &nbsp;&nbsp;&nbsp; Bộ phận: <strong>${departmentName}</strong></p>
  
  <p style="margin-bottom: 15px;">
    Tôi làm đơn này kính mong Công ty đồng ý cho tôi được thôi việc kể từ ngày <strong>${day}</strong> tháng <strong>${month}</strong> năm <strong>${year}</strong>.
  </p>
  
  <p style="margin-bottom: 15px;">
    Lý do xin thôi việc: ${reason}
  </p>
  
  <p style="margin-bottom: 15px;">
    Tôi rất hài lòng và lấy làm vinh dự lớn được làm việc tại đây trong thời gian qua. Quý Công ty đã hết sức tạo điều kiện giúp đỡ, cũng như cho tôi có được may mắn làm việc với những đồng nghiệp chân thành, dễ mến trong một môi trường làm việc năng động, thoải mái.
  </p>
  
  <p style="margin-bottom: 15px;">
    Tôi xin chân thành cảm ơn Quý Công ty đã tin tưởng tôi trong suốt thời gian qua và kính chúc cho Công ty phát triển bền vững và đạt được nhiều thành công hơn mong muốn.
  </p>
  
  <p style="margin-bottom: 15px;">
    Rất mong Ban Giám đốc công ty xem xét và chấp thuận cho tôi được phép thôi việc.
  </p>
  
  <p style="margin-bottom: 15px;">
    Trong khi chờ đợi sự chấp thuận của Ban Giám đốc, tôi sẽ tiếp tục làm việc nghiêm túc và tiến hành bàn giao công việc, các tài sản, dụng cụ cho người có liên quan trước khi nghỉ việc.
  </p>
  
  <p style="margin-bottom: 25px;">Xin trân trọng cảm ơn!</p>
  
  <p style="text-align: right; margin-bottom: 30px; font-style: italic;">
    ……, ngày <strong>${day}</strong> tháng <strong>${month}</strong> năm <strong>${year}</strong>
  </p>
  
  <div style="display: flex; justify-content: space-between; margin-top: 20px;">
    <div style="text-align: center; width: 250px;">
      <p style="margin-bottom: 80px; font-weight: bold;">Ý kiến Giám đốc</p>
    </div>
    <div style="text-align: center; width: 250px;">
      <p style="margin-bottom: 80px; font-weight: bold;">Người làm đơn</p>
      <p>(Ký và ghi rõ họ tên)</p>
    </div>
  </div>
</div>
  `;

  const [content, setContent] = useState(initialContent || generateTemplate());
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync template if initialContent is empty and editor opens
  React.useEffect(() => {
    if (isOpen && !initialContent) {
      setContent(generateTemplate());
    }
  }, [isOpen, initialContent, expectedDate, reason, employeeName, departmentName, position]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = editorRef.current?.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Thong_bao_nghi_viec_${employeeName}</title>
            <style>
              body { font-family: 'Times New Roman', Times, serif; padding: 0; margin: 0; line-height: 1.5; }
              @page { 
                size: A4 portrait; 
                margin-top: 20mm; 
                margin-right: 20mm; 
                margin-bottom: 20mm; 
                margin-left: 25mm; 
              }
              @media print {
                body { padding: 0; }
                .content { padding: 0; }
              }
              .content {
                width: 100%;
                font-size: 13pt;
                color: #000;
              }
            </style>
          </head>
          <body>
            <div class="content">${printContent}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSave = () => {
    const html = editorRef.current?.innerHTML || "";
    onSave(html);
    onClose();
  };

  return (
    <div className="fixed-top w-100 h-100 d-flex flex-column animate__animated animate__fadeIn" style={{ zIndex: 9999, background: "#f4f7fa" }}>
      {/* Topbar */}
      <div className="bg-white border-bottom px-4 py-2 d-flex align-items-center justify-content-between shadow-sm flex-shrink-0">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-light rounded-circle border" onClick={onClose} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-x-lg"></i>
          </button>
          <div>
            <h6 className="mb-0 fw-bold">Soạn thảo Thông báo nghỉ việc</h6>
            <span className="small text-muted">Tự động lưu vào hồ sơ nhân sự</span>
          </div>
        </div>

        <div className="d-flex gap-2">
          <BrandButton variant="outline" icon="bi-printer" onClick={handlePrint} style={{ borderRadius: "10px" }}>
            Xuất PDF / In
          </BrandButton>
          <BrandButton icon="bi-check2-circle" onClick={handleSave} style={{ borderRadius: "10px" }}>
            Lưu & Hoàn tất
          </BrandButton>
        </div>
      </div>

      {/* Sticky Advanced Toolbar */}
      <div className="bg-white border-bottom p-2 d-flex align-items-center justify-content-center gap-2 sticky-top shadow-sm flex-shrink-0" 
           style={{ zIndex: 10 }}>
        
        {/* Font Family */}
        <select 
          className="form-select form-select-sm border bg-light fw-semibold" 
          style={{ width: "160px", fontSize: "13px", borderRadius: "8px" }}
          onChange={(e) => document.execCommand('fontName', false, e.target.value)}
        >
          <option value="'Times New Roman', Times, serif">Times New Roman</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="'Roboto', sans-serif">Roboto</option>
          <option value="'Courier New', Courier, monospace">Courier New</option>
        </select>

        {/* Font Size */}
        <select 
          className="form-select form-select-sm border bg-light fw-semibold" 
          style={{ width: "90px", fontSize: "13px", borderRadius: "8px" }}
          onChange={(e) => document.execCommand('fontSize', false, e.target.value)}
        >
          <option value="3">12pt</option>
          <option value="4">14pt</option>
          <option value="5">18pt</option>
          <option value="6">24pt</option>
          <option value="7">36pt</option>
        </select>

        <div className="vr mx-2" style={{ height: "24px" }}></div>

        {/* Formatting */}
        <div className="d-flex gap-1">
          {[
            { cmd: 'bold', icon: 'bi-type-bold', title: 'In đậm' },
            { cmd: 'italic', icon: 'bi-type-italic', title: 'In nghiêng' },
            { cmd: 'underline', icon: 'bi-type-underline', title: 'Gạch chân' },
          ].map(item => (
            <button 
              key={item.cmd}
              title={item.title}
              className="btn btn-sm btn-light border rounded-3 p-1 px-2" 
              onClick={() => document.execCommand(item.cmd)}
            >
              <i className={`bi ${item.icon}`}></i>
            </button>
          ))}
        </div>

        <div className="vr mx-2" style={{ height: "24px" }}></div>

        {/* Lists */}
        <div className="d-flex gap-1">
          <button className="btn btn-sm btn-light border rounded-3 p-1 px-2" onClick={() => document.execCommand('insertUnorderedList')} title="Danh sách dấu chấm">
            <i className="bi bi-list-ul"></i>
          </button>
          <button className="btn btn-sm btn-light border rounded-3 p-1 px-2" onClick={() => document.execCommand('insertOrderedList')} title="Danh sách số">
            <i className="bi bi-list-ol"></i>
          </button>
        </div>

        <div className="vr mx-2" style={{ height: "24px" }}></div>

        {/* Alignment */}
        <div className="d-flex gap-1">
          {[
            { cmd: 'justifyLeft', icon: 'bi-text-left' },
            { cmd: 'justifyCenter', icon: 'bi-text-center' },
            { cmd: 'justifyRight', icon: 'bi-text-right' },
          ].map(item => (
            <button 
              key={item.cmd}
              className="btn btn-sm btn-light border rounded-3 p-1 px-2" 
              onClick={() => document.execCommand(item.cmd)}
            >
              <i className={`bi ${item.icon}`}></i>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-grow-1 overflow-auto p-5 d-flex justify-content-center bg-secondary-subtle">
        <div 
          className="bg-white shadow-lg d-flex flex-column"
          style={{
            width: "210mm",
            minHeight: "297mm",
            paddingTop: "20mm",
            paddingRight: "20mm",
            paddingBottom: "20mm",
            paddingLeft: "25mm",
            borderRadius: "4px",
            color: "#333",
            position: "relative",
            marginBottom: "50px"
          }}
        >
          <div 
            ref={editorRef}
            contentEditable 
            className="flex-grow-1"
            style={{ 
              outline: "none", 
              fontFamily: "'Times New Roman', Times, serif",
              fontSize: "13pt"
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>

      <style jsx>{`
        .fixed-top {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
      `}</style>
    </div>
  );
}
