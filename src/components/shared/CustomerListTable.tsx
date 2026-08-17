import React, { useMemo } from "react";
import { Table, TableColumn } from "@/components/ui/Table";

export interface CustomerData {
  id: string;
  name: string;
  address?: string;
  receivedDate?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  assigneeName?: string;
  assigneePhone?: string;
  source?: string;
  reminderCount?: number;
  hasBeenCaredFor?: boolean;
}

export const getElapsedTimeInfo = (dateStr?: string) => {
  if (!dateStr) return { label: "", className: "text-muted", style: {} };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { label: "", className: "text-muted", style: {} };

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return { label: "", className: "text-muted", style: {} };

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let label = "";
    if (diffSecs < 60) {
      label = "Mới nhận";
    } else if (diffMins < 60) {
      label = `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      label = `${diffHours} giờ trước`;
    } else {
      label = `${diffDays} ngày trước`;
    }

    let className = "text-muted";
    let style: React.CSSProperties = {};

    if (diffHours > 48) {
      className = "text-danger fw-semibold";
    } else if (diffHours > 24) {
      style = { color: "#fd7e14", fontWeight: 600 };
    }

    return { label, className, style };
  } catch (e) {
    return { label: "", className: "text-muted", style: {} };
  }
};

const SOURCE_MAP: Record<string, string> = {
  "facebook": "Facebook",
  "facebook_ads": "Facebook Ads",
  "zalo": "Zalo OA",
  "website": "Website",
  "tiktok": "TikTok",
  "youtube": "YouTube",
  "CRM": "Tự khai thác",
  "Tự khai thác": "Tự khai thác",
};

interface CustomerListTableProps {
  data: CustomerData[];
  selectedIds?: Set<string>;
  onSelectRow?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  onRowClick?: (row: CustomerData) => void;
  loading?: boolean;
}

export const CustomerListTable: React.FC<CustomerListTableProps> = ({
  data,
  selectedIds = new Set(),
  onSelectRow,
  onSelectAll,
  onRowClick,
  loading = false,
}) => {
  const columns: TableColumn<CustomerData>[] = useMemo(() => {
    return [
      {
        header: (
          <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
            <input
              type="checkbox"
              className="form-check-input cursor-pointer"
              checked={data.length > 0 && data.every(p => selectedIds.has(p.id))}
              onChange={(e) => onSelectAll?.(e.target.checked)}
            />
          </div>
        ),
        render: (row) => (
          <div onClick={(e) => e.stopPropagation()} className="d-flex justify-content-center">
            <input
              type="checkbox"
              className="form-check-input cursor-pointer"
              checked={selectedIds.has(row.id)}
              onChange={(e) => onSelectRow?.(row.id, e.target.checked)}
            />
          </div>
        ),
        width: "40px",
        align: "center"
      },
      {
        header: "THÔNG TIN KHÁCH HÀNG",
        render: (row) => {
          let elapsedHoursBadge = null;
          if (row.receivedDate && !row.hasBeenCaredFor) {
            const receiveTime = new Date(row.receivedDate).getTime();
            if (!isNaN(receiveTime)) {
              const diffHours = Math.floor((new Date().getTime() - receiveTime) / (1000 * 60 * 60));
              if (diffHours >= 0) {
                let badgeClass = "bg-secondary-subtle text-secondary";
                if (diffHours > 24) badgeClass = "bg-danger-subtle text-danger border border-danger/20";
                else if (diffHours > 6) badgeClass = "bg-warning-subtle text-warning border border-warning/20";
                
                elapsedHoursBadge = (
                  <span className={`badge ${badgeClass} ms-2 fw-semibold px-1.5`} style={{ fontSize: "9.5px" }}>
                    <i className="bi bi-clock-history me-1"></i>{diffHours}h
                  </span>
                );
              }
            }
          }

          return (
            <div>
              <div className="fw-bold text-dark d-flex align-items-center">
                <span className="text-truncate" style={{ maxWidth: "160px" }} title={row.name || "Khách ẩn danh"}>{row.name || "Khách ẩn danh"}</span>
                {elapsedHoursBadge}
              </div>
              <div className="text-muted mt-0.5" style={{ fontSize: "11px" }}>{row.address || "—"}</div>
            </div>
          );
        },
        width: "25%",
      },
      {
        header: "THỜI GIAN NHẬN",
        render: (row) => {
          let formattedDate = "";
          if (row.receivedDate) {
            try {
              const d = new Date(row.receivedDate);
              const hh = String(d.getHours()).padStart(2, "0");
              const mm = String(d.getMinutes()).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              const month = String(d.getMonth() + 1).padStart(2, "0");
              const yyyy = d.getFullYear();
              formattedDate = `${hh}:${mm} ${dd}/${month}/${yyyy}`;
            } catch (e) {
              formattedDate = row.receivedDate;
            }
          }
          const timeInfo = getElapsedTimeInfo(row.receivedDate);
          return (
            <div>
              <div className="text-dark" style={{ fontSize: "12.5px" }}>{formattedDate}</div>
              {!row.hasBeenCaredFor && timeInfo.label && (
                <div className="d-flex align-items-center gap-2 mt-0.5">
                  <div
                    className={`${timeInfo.className} d-inline-flex align-items-center gap-1`}
                    style={{ fontSize: "10.5px", ...timeInfo.style }}
                  >
                    <i className="bi bi-clock" style={{ fontSize: "9px" }} />
                    {timeInfo.label}
                  </div>
                  {row.reminderCount && row.reminderCount > 0 ? (
                    <span
                      className="badge bg-danger-subtle text-danger border border-danger/20 rounded-pill px-1.5 py-0.5 d-inline-flex align-items-center justify-content-center"
                      style={{ fontSize: "9.5px", fontWeight: 600 }}
                      title={`Đã nhắc việc ${row.reminderCount} lần`}
                    >
                      {row.reminderCount}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        },
        width: "15%",
      },
      {
        header: "LIÊN HỆ",
        render: (row) => {
          return (
            <div>
              <div className="fw-semibold text-dark" style={{ fontSize: "13.5px", whiteSpace: "nowrap" }}>{row.contactName || row.name || "Khách hàng"}</div>
              <div className="text-muted d-flex align-items-center gap-2 mt-1" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                {row.contactPhone && (
                  <span className="d-inline-flex align-items-center" style={{ whiteSpace: "nowrap" }}>
                    <i className="bi bi-telephone text-muted me-1" style={{ fontSize: "11px" }} />
                    {row.contactPhone}
                  </span>
                )}
                {row.contactPhone && row.contactEmail && <span className="opacity-30">|</span>}
                {row.contactEmail && (
                  <span className="d-inline-flex align-items-center" style={{ whiteSpace: "nowrap" }}>
                    <i className="bi bi-envelope text-muted me-1" style={{ fontSize: "11px" }} />
                    {row.contactEmail}
                  </span>
                )}
              </div>
            </div>
          );
        },
        width: "20%",
      },
      {
        header: "NGƯỜI TIẾP NHẬN",
        render: (row) => {
          return (
            <div>
              <span className="fw-semibold text-secondary">
                <i className="bi bi-person-circle me-1" />
                {row.assigneeName || "Chưa phân công"}
              </span>
              {row.assigneePhone && (
                <div className="text-muted small mt-0.5" style={{ fontSize: "11px" }}>
                  <i className="bi bi-telephone me-1" style={{ fontSize: "10px" }} />
                  {row.assigneePhone}
                </div>
              )}
            </div>
          );
        },
        width: "25%",
      },
      {
        header: "NGUỒN",
        render: (row) => {
          const sourceText = row.source ? (SOURCE_MAP[row.source] || row.source) : "Khác";
          return <span className="badge bg-primary-subtle text-primary">{sourceText}</span>;
        },
        width: "10%",
      }
    ];
  }, [data, selectedIds, onSelectAll, onSelectRow]);

  return (
    <Table
      rows={data}
      columns={columns}
      compact={true}
      loading={loading}
      rowKey={(r) => r.id}
      onRowClick={onRowClick}
      emptyText="Chưa có thông tin khách hàng nào."
      wrapperStyle={{ flex: 1, overflowY: "auto", minHeight: 0 }}
    />
  );
};
