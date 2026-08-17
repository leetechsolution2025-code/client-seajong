"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { InfoField } from "@/components/ui/InfoField";
import { calculateLeadStars } from "@/lib/partner-utils";
import { formatDisplayDate, formatDisplayDateTime, getSafeTimestamp } from "@/lib/date-utils";

const SOURCE_MAP: Record<string, string> = {
  "facebook": "Facebook Ads",
  "website": "Website",
  "Tự khai thác": "Tự khai thác",
  "CRM": "Tự khai thác"
};

export function MarketingLeadOffcanvas({ lead, onClose }: { lead: any, onClose: () => void }) {
  const [showGeneralInfo, setShowGeneralInfo] = useState(false);

  if (!lead) return null;

  let formValues: any = {};
  try {
    formValues = JSON.parse(lead.formValues || "{}");
  } catch (e) {}

  const source = lead.campaign?.platform || lead.source || "Khác";
  const sourceDisplay = SOURCE_MAP[source] || source;

  const contactStr = formValues.contact || "";
  const contactName = contactStr.includes(" - ") ? contactStr.split(" - ")[0] : (lead.fullName || "");
  const contactPhone = contactStr.includes(" - ") ? contactStr.split(" - ")[1] : (lead.phone || "");
  const address = formValues.detailBusinessAddress || formValues.area || lead.address || "Hà Nội";
  const email = formValues.detailEmail || lead.email || "";

  // Merge histories from DB and formValues just like in sales
  const dbHistories = lead.careHistories || [];
  let jsonHistories: any[] = [];
  if (formValues.careHistories && Array.isArray(formValues.careHistories)) {
    jsonHistories = formValues.careHistories;
  }
  
  const mergedMap = new Map<string, any>();
  dbHistories.forEach((h: any) => {
    const execDate = h.executionDate instanceof Date ? h.executionDate : new Date(h.executionDate);
    const key = `${execDate.getTime()}_${h.approachStep || ""}_${h.otherRequirements || ""}`;
    mergedMap.set(key, { ...h, executionDate: execDate.toISOString() });
  });
  jsonHistories.forEach((h: any) => {
    if (!h.executionDate) return;
    const execDate = new Date(h.executionDate);
    if (isNaN(execDate.getTime())) return;
    const key = `${execDate.getTime()}_${h.approachStep || ""}_${h.otherRequirements || ""}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...h, executionDate: execDate.toISOString(), stars: calculateLeadStars(h) });
    }
  });

  const sortedHistories = Array.from(mergedMap.values()).sort(
    (a, b) => getSafeTimestamp(b.executionDate) - getSafeTimestamp(a.executionDate)
  );

  const historiesToRender = sortedHistories.length > 0
    ? sortedHistories
    : [{
      id: "default",
      approachStep: formValues.detailApproachStep || "Chăm sóc & Phân loại",
      executionDate: formValues.detailExecutionDate || formValues.lastCareDate || lead.createdAt || "",
      executor: formValues.careStaff || "Vũ Hoàng Long",
      otherRequirements: formValues.detailOtherRequirements || "",
      cabinetNotes: formValues.detailCabinetNotes || ""
    }];

  const renderStars = (count: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`bi bi-star-fill ${i <= count ? "text-warning" : "text-light"}`}
          style={{ fontSize: "14px", textShadow: i <= count ? "0 0 2px rgba(255,193,7,0.3)" : "none" }}
        />
      );
    }
    return <div className="d-flex gap-1">{stars}</div>;
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
          zIndex: 1050, backdropFilter: "blur(2px)"
        }}
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 400, background: "var(--background)",
          zIndex: 1051, boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column",
          borderLeft: "1px solid var(--border)"
        }}
      >
        {/* Header */}
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white shadow-sm">
          <div>
            <div className="text-muted small text-uppercase fw-bold mb-1" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
              Hồ sơ phát triển đại lý
            </div>
            <h6 className="mb-0 fw-bold text-primary" style={{ fontSize: 16 }}>{lead.fullName || "Đại lý"}</h6>
          </div>
          <button
            className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 32, height: 32 }}
            onClick={onClose}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow-1 overflow-y-auto p-4 bg-white custom-scrollbar">
          
          {/* General Info */}
          <div className="mb-4">
            <div
              className="cursor-pointer select-none border-bottom pb-2 mb-3"
              onClick={() => setShowGeneralInfo(!showGeneralInfo)}
            >
              <SectionTitle
                title="Thông tin tiếp nhận"
                className="mb-0"
                action={<i className={`bi bi-chevron-${showGeneralInfo ? 'up' : 'down'} text-muted`} />}
              />
            </div>

            {showGeneralInfo ? (
              <div className="row g-2">
                <InfoField label="Nguồn khách hàng" value={sourceDisplay} icon="funnel" />
                <InfoField label="Ngày tiếp nhận" value={formatDisplayDateTime(lead.createdAt)} icon="calendar-event" />
                <InfoField label="Khu vực địa lý" value={address} icon="geo-alt" className="col-12" />
                <InfoField label="Người liên hệ" value={contactName} icon="person" />
                <InfoField label="Số điện thoại" value={contactPhone || "-"} icon="telephone" />
                <InfoField label="Email liên hệ" value={email || "-"} icon="envelope" className="col-12" />
              </div>
            ) : null}
          </div>

          {/* Lịch sử chăm sóc */}
          <div className="mb-4">
            <SectionTitle title="Chăm sóc và Tư vấn" className="border-bottom pb-2 mb-3" />
            
            <div className="position-relative ps-3 ms-2 py-1">
              {historiesToRender.map((history, idx) => {
                const isLastHistory = idx === historiesToRender.length - 1;
                const careTime = history.executionDate ? formatDisplayDateTime(history.executionDate) : "Đang thực hiện";
                const approachStep = history.approachStep || "Chăm sóc & Phân loại";

                return (
                  <div key={idx} className="position-relative mb-4">
                    <div
                      className="position-absolute"
                      style={{
                        width: "2px", top: "9px", bottom: isLastHistory ? "-33px" : "-25px",
                        left: "-17px", backgroundColor: "rgba(0,123,255,0.2)", zIndex: 0
                      }}
                    />
                    <div
                      className="position-absolute rounded-circle bg-primary p-0 border-0"
                      style={{
                        width: 10, height: 10, left: -21, top: 4,
                        border: "2px solid #fff", boxShadow: "0 0 0 2px var(--primary)", zIndex: 1
                      }}
                    />
                    <div className="small text-muted fw-semibold mb-1" style={{ fontSize: '11px' }}>
                      <i className="bi bi-clock me-1" />{careTime}
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>{approachStep}</div>
                      <div className="pe-1">{renderStars(history.stars || calculateLeadStars(history))}</div>
                    </div>
                    {(history.otherRequirements || history.executor || history.cabinetNotes) && (
                      <div className="text-muted small mt-1" style={{ fontSize: '11.5px', lineHeight: '1.4' }}>
                        {history.otherRequirements && (
                          <div><strong>Kết quả tóm tắt:</strong> {history.otherRequirements}</div>
                        )}
                        {history.executor && (
                          <div><strong>Người thực hiện:</strong> {history.executor}</div>
                        )}
                        {history.cabinetNotes && history.cabinetNotes.startsWith("[") && (
                          <div className="mt-2 bg-light p-2.5 rounded-2 border border-light-subtle text-dark">
                            <div className="fw-semibold text-secondary mb-1" style={{ fontSize: '11px' }}>
                              Khái toán quầy kệ:
                            </div>
                            {(() => {
                              try {
                                const items = JSON.parse(history.cabinetNotes);
                                if (Array.isArray(items) && items.length > 0) {
                                  const totalValue = items.reduce((acc: number, item: any) => {
                                    const sizeNum = parseFloat(String(item.size || "").replace(/[^\d.]/g, "")) || 1;
                                    return acc + ((item.unitPrice || 0) * (item.quantity || 0) * sizeNum);
                                  }, 0);
                                  return (
                                    <div className="d-flex flex-column gap-1 mt-1">
                                      {items.map((item: any, itemIdx: number) => {
                                        const sizeNum = parseFloat(String(item.size || "").replace(/[^\d.]/g, "")) || 1;
                                        const itemValue = (item.unitPrice || 0) * (item.quantity || 0) * sizeNum;
                                        return (
                                          <div key={itemIdx} className="d-flex justify-content-between text-dark" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                            <span style={{ flex: 1, paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              • {item.name} {item.size ? `(${item.size} ${item.unit || "md"})` : `(${item.unit || "md"})`}
                                            </span>
                                            <div className="d-flex gap-3 text-end" style={{ minWidth: '90px', justifyContent: 'flex-end' }}>
                                              <span className="text-secondary">SL: {item.quantity}</span>
                                              <span className="fw-bold">{itemValue > 0 ? `${Math.round(itemValue).toLocaleString("vi-VN")} đ` : "—"}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      <div className="mt-1 pt-1.5 border-top border-secondary-subtle d-flex justify-content-between align-items-center">
                                        <span className="text-secondary fw-semibold" style={{ fontSize: '11px' }}>Tổng: <span className="fw-bold text-dark">{items.length}</span> hạng mục</span>
                                        {totalValue > 0 && <span className="fw-bold text-primary" style={{ fontSize: '11.5px' }}>{Math.round(totalValue).toLocaleString("vi-VN")} đ</span>}
                                      </div>
                                    </div>
                                  );
                                }
                              } catch (e) { }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div key="node-1-recv" className="position-relative mb-1 mt-4">
                <div
                  className="position-absolute rounded-circle bg-primary"
                  style={{ width: 10, height: 10, left: -21, top: 4, border: "2px solid #fff", boxShadow: "0 0 0 2px var(--primary)", zIndex: 1 }}
                />
                <div className="small text-muted fw-semibold mb-1" style={{ fontSize: '11px' }}>
                  <i className="bi bi-calendar-event me-1" />
                  {formatDisplayDateTime(lead.createdAt)}
                </div>
                <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>Tiếp nhận thông tin</div>
                <div className="text-muted small mt-0.5" style={{ fontSize: '11.5px' }}>
                  Lead được phân bổ tự động qua kênh <strong>{sourceDisplay}</strong>.
                </div>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
