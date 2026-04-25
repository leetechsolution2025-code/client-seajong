"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/Toast";

// ── Types ──────────────────────────────────────────────────────────────────────
export type ApprovalStatus = "pending" | "approved" | "rejected" | "recalled" | "on_hold";
export type ApprovalPriority = "urgent" | "high" | "normal" | "low";

export interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  entityCode?: string;
  entityTitle: string;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  dueDate?: string;
  department?: string;
  metadata?: string;
  requestedById: string;
  requestedByName: string;
  approverId?: string;
  approvedById?: string;
  approvedAt?: string;
  note?: string;
  rejectedReason?: string;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalComment {
  id: string;
  requestId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  content: string;
  parentId?: string;
  replies?: ApprovalComment[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalCenterProps {
  mode?: "page" | "drawer";
  isOpen?: boolean;
  onClose?: () => void;
  entityFilter?: string;
  entityId?: string;
  defaultView?: "inbox" | "mine";
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const ENTITY_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  marketing_yearly_plan: { label: "KH Marketing Năm",   icon: "bi-calendar2-range",    color: "#dc2626" },
  marketing_monthly_plan:{ label: "KH Marketing Tháng", icon: "bi-calendar-check",     color: "#0891b2" },
  marketing_monthly_execution:{ label: "Bản tin/Thực thi Tháng", icon: "bi-layout-text-window", color: "#0ea5e9" },
  expense:               { label: "Chi phí",            icon: "bi-receipt",             color: "#d97706" },
  leave_request:         { label: "Nghỉ phép",          icon: "bi-calendar-x",          color: "#7c3aed" },
  purchase_order:        { label: "Đơn mua hàng",       icon: "bi-cart-check",          color: "#059669" },
  quotation:             { label: "Báo giá",            icon: "bi-file-earmark-text",   color: "#0b2447" },
};

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: "Chờ duyệt",  color: "#d97706", bg: "rgba(217,119,6,0.1)",   icon: "bi-hourglass-split" },
  approved:  { label: "Đã duyệt",   color: "#059669", bg: "rgba(5,150,105,0.1)",   icon: "bi-check-circle-fill" },
  rejected:  { label: "Từ chối",    color: "#dc2626", bg: "rgba(220,38,38,0.1)",   icon: "bi-x-circle-fill" },
  recalled:  { label: "Thu hồi",    color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: "bi-arrow-counterclockwise" },
  on_hold:   { label: "Tạm giữ",   color: "#7c3aed", bg: "rgba(124,58,237,0.1)",  icon: "bi-pause-circle-fill" },
};

const PRIORITY_CONFIG: Record<ApprovalPriority, { label: string; color: string }> = {
  urgent: { label: "Khẩn",     color: "#dc2626" },
  high:   { label: "Cao",      color: "#d97706" },
  normal: { label: "Bình thường", color: "#64748b" },
  low:    { label: "Thấp",    color: "#94a3b8" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return formatDate(iso);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ["#dc2626","#0891b2","#059669","#7c3aed","#d97706","#0b2447","#ea580c","#4f46e5"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getEntityLink(entityType: string, meta: any): string | null {
  if (entityType.startsWith("marketing_")) return "/marketing/plan/yearly";
  if (entityType === "expense") return "/plan_finance/expenses";
  // Fallbacks for generic requests
  return null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// Avatar
function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: avatarColor(name), color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800,
    }}>
      {getInitials(name)}
    </div>
  );
}

// Status Badge
function StatusBadge({ status }: { status: ApprovalStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      <i className={`bi ${cfg.icon}`} style={{ fontSize: 10 }} />
      {cfg.label}
    </span>
  );
}

// EntityType Badge
function EntityBadge({ entityType }: { entityType: string }) {
  const cfg = ENTITY_TYPE_LABELS[entityType] || { label: entityType, icon: "bi-file-earmark", color: "#64748b" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
      background: cfg.color + "18", color: cfg.color, letterSpacing: "0.02em",
    }}>
      <i className={`bi ${cfg.icon}`} style={{ fontSize: 10 }} />
      {cfg.label}
    </span>
  );
}

// Comment item (recursive for replies)
function CommentItem({
  comment,
  onReply,
  replyingTo,
  currentUserId,
}: {
  comment: ApprovalComment;
  onReply: (id: string, name: string) => void;
  replyingTo: string | null;
  currentUserId: string;
}) {
  if (comment.isSystem) {
    return (
      <div style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--border)", opacity: 0.8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className="bi bi-gear-fill" style={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.content) }}
          />
          <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.7 }}>{timeAgo(comment.createdAt)}</span>
        </div>
      </div>
    );
  }

  const roleColor = comment.authorRole === "approver" ? "#d97706"
    : comment.authorRole === "requester" ? "#0891b2" : "#64748b";

  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <Avatar name={comment.authorName} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{comment.authorName}</span>
          {comment.authorRole && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
              background: roleColor + "18", color: roleColor,
            }}>
              {comment.authorRole === "approver" ? "Người duyệt" : comment.authorRole === "requester" ? "Người gửi" : "Quan sát"}
            </span>
          )}
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: "auto", flexShrink: 0 }}>
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <div style={{
          fontSize: 13, color: "var(--foreground)", lineHeight: 1.6,
          background: "var(--muted)", borderRadius: 8, padding: "8px 12px",
        }}>
          {comment.content}
        </div>
        <button
          onClick={() => onReply(comment.id, comment.authorName)}
          style={{
            marginTop: 4, background: "transparent", border: "none",
            fontSize: 11, color: "var(--muted-foreground)", cursor: "pointer", padding: "2px 0",
            display: "flex", alignItems: "center", gap: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--foreground)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--muted-foreground)"}
        >
          <i className="bi bi-reply" /> Trả lời
        </button>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid var(--border)" }}>
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} onReply={onReply} replyingTo={replyingTo} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Improved markdown → HTML converter handling Tables, Lists, Headings, and Bolds
function renderMarkdown(text: string): string {
  if (!text) return "";
  
  let totalScore = "";
  let totalMax = "";
  const totalMatch = text.match(/Tổng\s+điểm[^0-9]*?(\d+)\s*\/\s*(\d+)/i);
  if (totalMatch) {
    totalScore = totalMatch[1];
    totalMax = totalMatch[2];
    
    // Remove the Total Score line from standard processing
    const textLines = text.split("\n");
    text = textLines.filter(l => {
      const lower = l.toLowerCase();
      // Only remove if it's a list item or strict total score starting line to avoid cutting out paragraphs
      if (lower.includes("tổng điểm") && (lower.trim().startsWith("-") || lower.trim().startsWith("*") || lower.trim().startsWith("tổng"))) {
         return false;
      }
      return true;
    }).join("\n");
  }

  // Loại bỏ các tiêu đề thừa bám theo prompt
  text = text.replace(/\*\*(Kết quả )?chấm điểm:?\*\*/gi, "");
  text = text.replace(/###\s*(Kết quả )?chấm điểm:?/gi, "");

  const rawLines = text.split("\n");
  let introLines: string[] = [];
  let restLines: string[] = [];
  let hitBody = false;
  
  for (let l of rawLines) {
     const t = l.trim();
     if (t.startsWith("### ") || t.startsWith("## ") || t.startsWith("- ") || t.startsWith("* ") || t.startsWith("|")) {
        hitBody = true;
     }
     if (!hitBody) {
        if (t !== "") introLines.push(t);
     } else {
        restLines.push(l); // keep original indent
     }
  }

  let html = "";
  
  // Render Header Section (Badge + Intro)
  let badgeHtml = "";
  if (totalScore) {
     let percentage = Math.round((parseInt(totalScore) / parseInt(totalMax)) * 100);
     let colorClass = percentage >= 80 ? "#10b981" : (percentage >= 50 ? "#f59e0b" : "#ef4444");
     badgeHtml = `
       <div style="flex-shrink: 0; width: 84px; height: 84px; border-radius: 50%; background: color-mix(in srgb, ${colorClass} 10%, transparent); border: 2px solid color-mix(in srgb, ${colorClass} 30%, transparent); color: ${colorClass}; display: flex; align-items: center; justify-content: center; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
         <span style="font-size: 28px; font-weight: 800; line-height: 1;">${totalScore}</span>
         <span style="font-size: 11.5px; font-weight: 700; opacity: 0.85; margin-top: 4px; border-top: 1.5px solid color-mix(in srgb, ${colorClass} 25%, transparent); padding-top: 4px; line-height: 1; width: 44px; text-align: center;">${totalMax}</span>
       </div>
     `;
  }
  
  let introHtml = "";
  introLines.forEach(line => {
      line = line.replace(/^Kính gửi (.*?)(:|,)/ig, "Báo cáo Giám đốc$2");
      introHtml += `<p style="margin: 0 0 8px; line-height: 1.6; color: var(--foreground); font-size: 14.5px;">${line}</p>`;
  });
  
  if (badgeHtml || introHtml) {
      if (badgeHtml) {
         html += `
           <div style="display: flex; gap: 20px; align-items: center; padding-bottom: 24px; margin-bottom: 20px; border-bottom: 1px dashed var(--border);">
             ${badgeHtml}
             <div style="flex: 1; padding-top: 4px;">
               ${introHtml}
             </div>
           </div>
         `;
      } else {
         html += `<div style="margin-bottom: 20px;">${introHtml}</div>`;
      }
  }

  const lines = restLines;
  let inList = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Thay thế tự động cụm Kính gửi
    line = line.replace(/^Kính gửi (.*?)(:|,)/ig, "Báo cáo Giám đốc$2");

    if (line.startsWith("---") || line === "***") continue; // Ignore loose horizontal rules

    // Modern Table parsing
    if (line.startsWith("|")) {
      if (!inTable) {
        html += '<div style="margin: 24px 0; border-radius: 12px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent); box-shadow: 0 4px 12px rgba(0,0,0,0.03);"><table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; background: var(--card);">';
        inTable = true;
      }
      if (line.includes("---")) continue; // separator
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      const isHeader = i === 0 || !lines[i-1].trim().startsWith("|");
      
      let rowHtml = '<tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseenter="this.style.background=\'color-mix(in srgb, var(--primary) 4%, transparent)\'" onmouseleave="this.style.background=\'transparent\'">';
      cells.forEach(cell => {
         let content = cell.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
         if (isHeader) {
           rowHtml += `<th style="padding: 14px 16px; font-weight: 700; background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent), color-mix(in srgb, var(--primary) 15%, transparent)); color: var(--primary); text-transform: uppercase; font-size: 12px; letter-spacing: 0.3px;">${content}</th>`;
         } else {
           // Emphasize the score column if it looks like a number
           const isNumber = /^\d+(\/\d+)?$/.test(content);
           const cellStyle = isNumber ? 'font-weight: 700; color: var(--primary); font-size: 15px; text-align: center;' : 'color: var(--foreground); line-height: 1.5;';
           rowHtml += `<td style="padding: 14px 16px; ${cellStyle}">${content}</td>`;
         }
      });
      rowHtml += "</tr>";
      html += rowHtml;
      continue;
    } else if (inTable) {
      html += '</table></div>';
      inTable = false;
    }

    line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Catch Decision Line
    const decRegex = /\[(PHÊ DUYỆT|TỪ CHỐI|CÂN NHẮC(?: XEM XÉT)?)\](.*?)$/i;
    if (!inTable && decRegex.test(line)) {
      const exec = decRegex.exec(line);
      if (exec) {
        if (inList) { html += '</div>'; inList = false; }
        
        let decType = exec[1].toUpperCase();
        let decReason = exec[2].replace(/^[\s:\-]+/, "");
        
        let dColor = decType === "PHÊ DUYỆT" ? "#10b981" : (decType === "TỪ CHỐI" ? "#ef4444" : "#f59e0b");
        let dBg = decType === "PHÊ DUYỆT" ? "rgba(16, 185, 129, 0.1)" : (decType === "TỪ CHỐI" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)");
        let dIcon = decType === "PHÊ DUYỆT" ? "bi-check-circle-fill" : (decType === "TỪ CHỐI" ? "bi-x-octagon-fill" : "bi-exclamation-triangle-fill");
        
        html += `
          <div style="margin: 24px 0; padding: 20px; background: ${dBg}; border: 1px solid color-mix(in srgb, ${dColor} 30%, transparent); border-left: 4px solid ${dColor}; border-radius: 12px; display: flex; gap: 16px; align-items: flex-start; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <i class="bi ${dIcon}" style="color: ${dColor}; font-size: 24px; line-height: 1;"></i>
            <div style="flex: 1;">
              <div style="font-weight: 800; color: ${dColor}; font-size: 14px; margin-bottom: 6px; text-transform: uppercase;">KHUYẾN NGHỊ: ${decType}</div>
              <div style="font-size: 14.5px; line-height: 1.6; color: var(--foreground);">${decReason}</div>
            </div>
          </div>
        `;
        continue;
      }
    }

    // Catch Score Line like "- **ĐỘ THẤU HIỂU KHÁCH HÀNG**: 14/20 - Kế hoạch phân tích tốt"
    const scoreRegex = /^(?:-\s+|\*\s+)?(.*?)(?:[:\-]+)\s*<strong>?(\d+)\/(\d+)<\/strong>?\s*(?:[\-\:]\s*(.*))?$/i;
    const scoreRegexAlt = /^(?:-\s+|\*\s+)?(.*?)(?:[:\-]+)\s*(\d+)\/(\d+)\s*(?:[\-\:]\s*(.*))?$/i;
    const sMatch = line.match(scoreRegex) || line.match(scoreRegexAlt);
    if (!inTable && sMatch && parseInt(sMatch[3]) >= 5 && parseInt(sMatch[3]) <= 100) {
      if (inList) { html += '</div>'; inList = false; }
      
      let label = sMatch[1].replace(/<strong>|<\/strong>/g, "").replace(/[\*\-]/g, "").trim();
      if (!label) label = "Điểm đánh giá";
      let score = parseInt(sMatch[2]);
      let max = parseInt(sMatch[3]);
      let desc = sMatch[4] ? sMatch[4].trim() : "";
      let percentage = Math.min(100, Math.round((score / max) * 100));
      
      let isTotal = max === 100 && label.toLowerCase().includes("tổng");
      let colorClass = percentage >= 80 ? "#10b981" : (percentage >= 50 ? "#f59e0b" : "#ef4444");
      if (isTotal) {
         colorClass = "var(--primary)"; // Special highlight for Total Score
      }
      
      html += `
        <div style="padding: 6px 0; margin-bottom: 6px; ${isTotal ? 'border-top: 1px dashed var(--border); padding-top: 16px; margin-top: 8px;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; flex-direction: column; gap: 4px; padding-right: 16px;">
              <span style="font-weight: 700; font-size: 12px; text-transform: uppercase; color: var(--foreground); letter-spacing: 0.3px;">${label}</span>
              ${desc ? `<span style="font-size: 12px; color: var(--muted-foreground); line-height: 1.45;">${desc.replace(/<strong>(.*?)<\/strong>/g, "<b>$1</b>")}</span>` : ''}
            </div>
            <span style="font-weight: 800; font-size: ${isTotal ? '18px' : '15px'}; color: ${colorClass}; white-space: nowrap; height: 100%; display: flex; align-items: flex-end;">${score}/${max}</span>
          </div>
          <div style="width: 100%; background: var(--muted); height: 4px; border-radius: 2px; overflow: hidden; margin-top: 8px;">
             <div style="height: 100%; width: ${percentage}%; background: ${colorClass}; border-radius: 2px; transition: width 1s ease-out;"></div>
          </div>
        </div>
      `;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      const text = line.substring(4);
      // Giấu heading bảng chấm điểm vì bảng đã tự thân rất nổi bật
      if (text.toLowerCase().includes("bảng chấm điểm")) continue;
      
      html += `<h4 style="margin: 20px 0 8px; font-size: 15px; color: var(--foreground); font-weight: 700;">${text}</h4>`;
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      const text = line.replace(/^#+ /, "");
      html += `
        <div style="margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid color-mix(in srgb, var(--primary) 10%, transparent); display: flex; align-items: center; gap: 10px;">
          <i class="bi bi-stars" style="color: var(--primary); font-size: 18px;"></i>
          <h3 style="margin: 0; font-size: 17px; color: var(--foreground); font-weight: 800; text-transform: uppercase;">${text}</h3>
        </div>
      `;
      continue;
    }

    // Contextual Lists with Icons
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html += '<div style="display: flex; flex-direction: column; gap: 10px; margin: 0 0 16px;">';
        inList = true;
      }
      let content = line.substring(2);
      
      let icon = "bi-arrow-right-short";
      let iconColor = "var(--primary)";
      let rawText = content.replace(/<strong>(.*?)<\/strong>/g, "$1").toLowerCase();
      
      if (rawText.includes("lỗ hổng") || rawText.includes("rủi ro") || rawText.includes("chưa") || rawText.includes("thiếu")) {
        icon = "bi-exclamation-circle-fill";
        iconColor = "#ef4444"; // red
      } else if (rawText.includes("điểm sáng") || rawText.includes("hiệu quả") || rawText.includes("tốt")) {
        icon = "bi-check-circle-fill";
        iconColor = "#10b981"; // green
      } else if (rawText.includes("hành động") || rawText.includes("đề xuất")) {
        icon = "bi-lightning-charge-fill";
        iconColor = "#f59e0b"; // orange
      }

      html += `
        <div style="display: flex; gap: 8px; align-items: flex-start;">
          <i class="bi ${icon}" style="color: ${iconColor}; font-size: 15px; line-height: 1.4; margin-top: 1px;"></i>
          <span style="font-size: 14px; line-height: 1.6; color: var(--foreground); flex: 1;">${content}</span>
        </div>
      `;
      continue;
    } else if (inList) {
      html += '</div>';
      inList = false;
    }

    if (line === "") {
      html += '<div style="height: 12px;"></div>';
    } else {
      html += `<p style="margin: 0 0 10px; line-height: 1.6; color: var(--foreground); font-size: 14px;">${line}</p>`;
    }
  }

  if (inTable) html += '</table></div>';
  if (inList) html += '</div>';

  return html;
}

// ── Detail Panel ───────────────────────────────────────────────────────────────
function ApprovalDetail({
  item,
  onAction,
  currentUserId,
  currentUserName,
}: {
  item: ApprovalRequest;
  onAction: (id: string, action: string, extra?: any) => Promise<void>;
  currentUserId: string;
  currentUserName: string;
}) {
  const [comments, setComments] = useState<ApprovalComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [showApproveNote, setShowApproveNote] = useState(false);
  const commentBoxRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"discussion" | "document">("discussion");
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [fullscreenPdfUrl, setFullscreenPdfUrl] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [showAIOffcanvas, setShowAIOffcanvas] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeech = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Thông báo", "Trình duyệt không hỗ trợ trình đọc văn bản (TTS)");
      return;
    }
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (aiReport) {
      const textToRead = aiReport.replace(/[\*#_]/g, '').replace(/-/g, ', ý: ');
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = "vi-VN";
      utterance.rate = 1.05;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  }, [aiReport, isSpeaking, toast]);

  useEffect(() => {
    if (!showAIOffcanvas && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [showAIOffcanvas]);

  const handleAIAnalyze = useCallback(async () => {
    setShowAIOffcanvas(true);
    if (aiReport) return;
    
    setAiLoading(true);
    try {
      const res = await fetch("/api/approvals/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: fullscreenPdfUrl, entityType: item.entityType })
      });
      const data = await res.json();
      if (data.success) {
        setAiReport(data.data);
      } else {
        setAiReport(`**Lỗi phân tích:** ${data.error}`);
      }
    } catch (e: any) {
      setAiReport(`**Lỗi mạng:** ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  }, [aiReport, fullscreenPdfUrl, item.entityType]);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/approvals/${item.id}/comments`);
      const data = await res.json();
      if (data.success) setComments(data.data);
    } catch { /* noop */ } finally {
      setLoadingComments(false);
    }
  }, [item.id]);

  useEffect(() => {
    setLoadingComments(true);
    setPreviewPdfUrl(null);
    setComments([]);
    setCommentText("");
    if (activeTab === "document") setActiveTab("discussion");
    setReplyingTo(null);
    loadComments();

    // Load preview data
    setActiveTab("discussion");
    setPreviewData(null);
    setLoadingPreview(true);
    fetch(`/api/approvals/${item.id}/preview`)
      .then(res => res.json())
      .then(res => { 
        if (res.success) {
          setPreviewData(res.data);
        } else {
          console.error("Preview fetch success: false", res);
          // Set a fallback data object to avoid the "Not integrated" message if there's an error msg
          setPreviewData({ type: item.entityType, details: res.error || "Không thể tải dữ liệu preview" });
        }
      })
      .catch(err => {
        console.error("Preview fetch error", err);
        setPreviewData({ type: item.entityType, details: "Lỗi kết nối khi tải preview" });
      })
      .finally(() => setLoadingPreview(false));
  }, [item.id, loadComments]);

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim(), parentId: replyingTo?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setCommentText("");
        setReplyingTo(null);
        await loadComments();
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch { /* noop */ } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action: string, extra?: any) => {
    setActionLoading(action);
    try {
      await onAction(item.id, action, extra);
      await loadComments();
    } finally {
      setActionLoading(null);
    }
  };

  const meta = item.metadata ? (() => { try { return JSON.parse(item.metadata!); } catch { return {}; } })() : {};
  const entityCfg = ENTITY_TYPE_LABELS[item.entityType] || { label: item.entityType, icon: "bi-file-earmark", color: "#64748b" };
  const isMyRequest = item.requestedById === currentUserId;
  const canApprove = !isMyRequest && (item.status === "pending" || item.status === "on_hold");
  const canRecall = isMyRequest && (item.status === "pending" || item.status === "on_hold");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 0", flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: entityCfg.color + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className={`bi ${entityCfg.icon}`} style={{ fontSize: 20, color: entityCfg.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              {item.entityCode && (
                <span style={{ fontSize: 11, fontWeight: 800, color: entityCfg.color, letterSpacing: "0.05em" }}>
                  {item.entityCode}
                </span>
              )}
              <StatusBadge status={item.status} />
              {item.priority !== "normal" && (
                <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_CONFIG[item.priority].color }}>
                  <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 3 }} />
                  {PRIORITY_CONFIG[item.priority].label}
                </span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--foreground)", lineHeight: 1.4 }}>
              {item.entityTitle}
            </h3>
          </div>

          {/* TOP RIGHT ACTION BUTTONS */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", marginTop: 4 }}>
            {(canApprove || canRecall) && (
              <>
                {canApprove && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={!!actionLoading}
                    className="btn btn-sm btn-outline-danger"
                    style={{ fontSize: 12, fontWeight: 400, padding: "4px 10px", borderRadius: 6, borderColor: "rgba(220,38,38,0.4)" }}
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => setShowApproveNote(true)}
                    disabled={!!actionLoading}
                    className="btn btn-sm btn-success"
                    style={{ fontSize: 12, fontWeight: 400, padding: "4px 12px", borderRadius: 6, background: "#059669", color: "#fff", border: "none" }}
                  >
                    {actionLoading === "approve" && <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, marginRight: 4 }} />}
                    Phê duyệt
                  </button>
                  {item.status !== "on_hold" && (
                    <button
                      onClick={() => handleAction("on_hold")}
                      disabled={!!actionLoading}
                      className="btn btn-sm"
                      style={{ fontSize: 12, fontWeight: 400, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(245, 158, 11, 0.4)", background: "rgba(245, 158, 11, 0.05)", color: "#d97706" }}
                    >
                      {actionLoading === "on_hold" && <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, marginRight: 4 }} />}
                      Tạm giữ
                    </button>
                  )}
                </>
              )}
              {canRecall && (
                <button
                  onClick={() => handleAction("recall")}
                  disabled={!!actionLoading}
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: 12, fontWeight: 400, padding: "4px 10px", borderRadius: 6 }}
                >
                  {actionLoading === "recall" && <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, marginRight: 4 }} />} Thu hồi
                </button>
              )}
              </>
            )}
          </div>
        </div>

        {/* Tabs Control */}
        <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
          <button
            onClick={() => setActiveTab("discussion")}
            style={{
              padding: "10px 4px", background: "none", border: "none", borderBottom: activeTab === "discussion" ? "3px solid var(--primary)" : "3px solid transparent",
              color: activeTab === "discussion" ? "var(--primary)" : "var(--muted-foreground)",
              fontWeight: activeTab === "discussion" ? 800 : 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            Thông tin & Thảo luận
          </button>
          <button
            onClick={() => setActiveTab("document")}
            style={{
              padding: "10px 4px", background: "none", border: "none", borderBottom: activeTab === "document" ? "3px solid var(--primary)" : "3px solid transparent",
              color: activeTab === "document" ? "var(--primary)" : "var(--muted-foreground)",
              fontWeight: activeTab === "document" ? 800 : 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            Dữ liệu/Tài liệu trình duyệt
            <span style={{ background: "var(--primary)", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 99 }}>Data</span>
          </button>
        </div>
      </div>

      {/* Sliding Tab Content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", background: "var(--background)" }}>
        <div style={{ 
          display: "flex", width: "200%", height: "100%", 
          transform: activeTab === "document" ? "translateX(-50%)" : "translateX(0)", 
          transition: "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)" 
        }}>
          
          {/* TAB 1: THÔNG TIN & THẢO LUẬN */}
          <div style={{ width: "50%", height: "100%", display: "flex", flexDirection: "column" }}>
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {/* Meta info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", background: "var(--card)", padding: 16, borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                <InfoRow icon="bi-person" label="Người gửi" value={item.requestedByName} />
                <InfoRow icon="bi-clock" label="Gửi lúc" value={formatDate(item.createdAt)} />
                {item.department && <InfoRow icon="bi-building" label="Phòng ban" value={item.department} />}
                {meta.year && <InfoRow icon="bi-calendar" label="Năm quy chiếu" value={meta.year} />}
                {meta.revisionCount > 0 && (
                  <InfoRow 
                    icon="bi-arrow-repeat" 
                    label="Loại hồ sơ" 
                    value={`Trình phê duyệt lại - Lần thứ: ${meta.revisionCount}`} 
                    emphasize
                    color="#dc2626"
                  />
                )}
                {meta.amount && <InfoRow icon="bi-cash" label="Số tiền yêu cầu" value={Number(meta.amount).toLocaleString("vi-VN") + " ₫"} />}
                {item.dueDate && <InfoRow icon="bi-alarm" label="Hạn duyệt" value={formatDate(item.dueDate)} emphasize />}
              </div>

              {/* Attachments Section */}
              {meta.attachments && meta.attachments.length > 0 && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <i className="bi bi-paperclip" style={{ fontSize: 14 }} /> Tài liệu đính kèm ({meta.attachments.length})
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {meta.attachments.map((att: any, index: number) => (
                      <div 
                        key={index} 
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--background)", borderRadius: 8, textDecoration: "none", color: "var(--foreground)", fontSize: 13, border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)", transition: "all 0.2s", cursor: "pointer" }} 
                        onClick={() => {
                          setFullscreenPdfUrl(att.url);
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"} 
                        onMouseLeave={e => e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 15%, transparent)"}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(220, 38, 38, 0.1)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="bi bi-file-earmark-pdf-fill" style={{ fontSize: 16 }} />
                        </div>
                        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>{att.name}</span>
                        <div style={{ padding: "4px 8px", background: "var(--muted)", borderRadius: 6, fontSize: 11, color: "var(--primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                          Mở tệp <i className="bi bi-box-arrow-up-right" style={{ fontSize: 10 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection / approval note */}
              {item.status === "rejected" && item.rejectedReason && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "rgba(220,38,38,0.06)", borderRadius: 12, border: "1px solid rgba(220,38,38,0.15)" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#dc2626", display: "block", marginBottom: 4 }}>📌 Lý do từ chối: </span>
                  <span style={{ fontSize: 13, color: "#dc2626" }}>{item.rejectedReason}</span>
                </div>
              )}
              {item.status === "approved" && item.note && (
                <div style={{ marginTop: 14, padding: "12px 16px", background: "rgba(5,150,105,0.06)", borderRadius: 12, border: "1px solid rgba(5,150,105,0.15)" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#059669", display: "block", marginBottom: 4 }}>📌 Ghi chú phê duyệt: </span>
                  <span style={{ fontSize: 13, color: "#059669" }}>{item.note}</span>
                </div>
              )}

              {/* Comments Section */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
                  <i className="bi bi-chat-dots" style={{ color: "var(--muted-foreground)", fontSize: 14 }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Tiến trình xử lý
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "var(--card)", padding: "2px 8px", borderRadius: 99, border: "1px solid var(--border)", marginLeft: "auto" }}>
                    {comments.filter(c => !c.isSystem).length} bình luận
                  </span>
                </div>

                {loadingComments ? (
                  <div style={{ padding: "30px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                    <span className="spinner-border spinner-border-sm" style={{ marginRight: 8 }} />Đang tải...
                  </div>
                ) : comments.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                    <i className="bi bi-chat-square" style={{ fontSize: 32, display: "block", opacity: 0.2, marginBottom: 10 }} />
                    Chưa có thảo luận nào
                  </div>
                ) : (
                  comments.map(c => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      onReply={(id, name) => { setReplyingTo({ id, name }); commentBoxRef.current?.focus(); }}
                      replyingTo={replyingTo?.id || null}
                      currentUserId={currentUserId}
                    />
                  ))
                )}
                <div ref={commentsEndRef} style={{ height: 10 }} />
              </div>
            </div>

            {/* Comment Input pinned to bottom of Tab 1 */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--card)" }}>
              {replyingTo && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 12, color: "var(--primary)" }}>
                  <i className="bi bi-reply" />
                  <span>Đang trả lời <strong>{replyingTo.name}</strong></span>
                  <button onClick={() => setReplyingTo(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                    <i className="bi bi-x" />
                  </button>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <textarea
                  ref={commentBoxRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  placeholder="Ghi chú thêm thông tin hoặc giải trình..."
                  rows={2}
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10,
                    border: "1px solid var(--border)", background: "var(--card)",
                    fontSize: 13, color: "var(--foreground)", resize: "none", outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || submitting}
                  style={{
                    width: 42, height: 42, borderRadius: 10, border: "none",
                    background: commentText.trim() ? "var(--primary)" : "var(--muted)",
                    color: commentText.trim() ? "#fff" : "var(--muted-foreground)",
                    cursor: commentText.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s", flexShrink: 0,
                  }}
                >
                  {submitting
                    ? <span className="spinner-border spinner-border-sm" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    : <i className="bi bi-send-fill" style={{ fontSize: 16 }} />
                  }
                </button>
              </div>
            </div>
          </div>

          {/* TAB 2: TÀI LIỆU TRÌNH DUYỆT (DATA PREVIEW) */}
          <div style={{ width: "50%", height: "100%", display: "flex", flexDirection: "column", background: "var(--card)" }}>
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {previewPdfUrl ? (
                <iframe src={previewPdfUrl} style={{ width: "100%", height: "100%", minHeight: "800px", border: "none", borderRadius: 8, background: "#fff" }} />
              ) : loadingPreview ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)", minHeight: 200 }}>
                  <span className="spinner-border spinner-border-sm" style={{ marginRight: 10 }} /> Đang trích xuất báo cáo dữ liệu...
                </div>
              ) : previewData ? (
                <div style={{ animation: "fadeIn 0.3s" }}>
                  
                  {/* Tóm tắt */}
                  {previewData.summary && previewData.summary.length > 0 && (
                    <div style={{ marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {previewData.summary.map((s: any, idx: number) => (
                        <div key={idx} style={{ flex: 1, minWidth: 140, background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.15)", padding: "12px 16px", borderRadius: 12 }}>
                          <div style={{ fontSize: 11, color: "val(--primary)", opacity: 0.8, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{s.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)" }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chi tiết text */}
                  {previewData.details && (
                    <div style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", padding: 16, borderRadius: 12, fontSize: 13, lineHeight: 1.6, borderLeft: "4px solid var(--primary)", marginBottom: 20 }}>
                      {previewData.details}
                    </div>
                  )}

                  {/* Dữ liệu bảng */}
                  {previewData.type === "marketing_monthly_execution" && previewData.rawTasks ? (
                    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", borderSpacing: 0, fontSize: 13 }}>
                          <colgroup>
                            <col style={{ width: 65 }} />
                            <col />
                            <col style={{ width: 75 }} />
                            <col style={{ width: 85 }} />
                            <col style={{ width: 55 }} />
                            <col style={{ width: 140 }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden" }}>STT</th>
                              <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden" }}>Nội dung công việc</th>
                              <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden" }}>Tuần thứ</th>
                              <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden" }}>Visual</th>
                              <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden" }}>Số bài</th>
                              <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 700, color: "var(--muted-foreground)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden" }}>Kênh</th>
                            </tr>
                          </thead>
                        </table>
                      </div>
                      <div style={{ background: "var(--card)" }}>
                        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
                          <colgroup>
                            <col style={{ width: 65 }} />
                            <col />
                            <col style={{ width: 75 }} />
                            <col style={{ width: 85 }} />
                            <col style={{ width: 55 }} />
                            <col style={{ width: 140 }} />
                          </colgroup>
                          <tbody>
                            {previewData.rawTasks.map((t: any, idx: number) => {
                              if (t.isHeader) {
                                return (
                                  <tr key={idx} style={{ background: t.color ? t.color + "1A" : "var(--muted)" }}>
                                    <td style={{ padding: "6px 8px 6px 12px", color: "var(--muted-foreground)", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <i className="bi bi-chevron-down" style={{ color: "var(--muted-foreground)", fontSize: 11 }} />
                                        <span style={{ fontWeight: 800, color: "#fff", background: t.color || "var(--primary)", width: 24, height: 24, minWidth: 24, minHeight: 24, flexShrink: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                                          {t.stt}
                                        </span>
                                      </div>
                                    </td>
                                    <td colSpan={5} style={{ padding: "6px 16px", borderBottom: "1px solid var(--border)" }}>
                                      <div style={{ width: "100%", fontSize: 13, color: t.color || "#1e3a8a", fontWeight: 800, textTransform: "uppercase" }}>
                                        {t.name}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }
                              if (!t.isChild) {
                                return (
                                  <tr key={idx} style={{ background: "transparent" }}>
                                    <td style={{ padding: "4px 12px 4px 16px", borderBottom: "1px solid var(--border)", textAlign: "right", verticalAlign: "top" }}>
                                      <div style={{ height: "20px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                                        <i className="bi bi-circle-fill" style={{ fontSize: 4, color: "var(--muted-foreground)", opacity: 0.5 }} />
                                      </div>
                                    </td>
                                    <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "top", color: "var(--foreground)", textTransform: "uppercase", fontSize: 12 }}>
                                      {t.name}
                                    </td>
                                    <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", fontSize: 12, color: "var(--foreground)" }}>
                                      {(() => {
                                        const timeStr = t.week || "";
                                        const parts = timeStr.trim().split("-");
                                        if (parts.length === 3 && parts[0].length === 4) {
                                          const d = parseInt(parts[2], 10);
                                          if (!isNaN(d)) return `${Math.ceil(d / 7)}`;
                                        }
                                        return timeStr || "";
                                      })()}
                                    </td>
                                    <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", fontSize: 12, color: "var(--foreground)" }}>
                                      {t.visual || ""}
                                    </td>
                                    <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", fontSize: 13, color: "var(--foreground)" }}>
                                      {t.quantity ? `${t.quantity} bài` : ""}
                                    </td>
                                    <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", fontSize: 12, color: "var(--foreground)" }}>
                                      {t.channel ? t.channel.split(",").join(", ") : ""}
                                    </td>
                                  </tr>
                                );
                              }
                              return (
                                <tr key={idx} style={{ background: "transparent" }}>
                                  <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}></td>
                                  <td style={{ padding: "4px 8px 4px 28px", borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <i className="bi bi-circle-fill" style={{ fontSize: 3, color: "var(--muted-foreground)", opacity: 0.5 }} />
                                      <span style={{ fontSize: 12, color: "var(--foreground)", lineHeight: "20px" }}>{t.name}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", fontSize: 12, color: "var(--foreground)" }}>
                                    {(() => {
                                      const timeStr = t.week || "";
                                      const parts = timeStr.trim().split("-");
                                      if (parts.length === 3 && parts[0].length === 4) {
                                        const d = parseInt(parts[2], 10);
                                        if (!isNaN(d)) return `${Math.ceil(d / 7)}`;
                                      }
                                      return timeStr || "1";
                                    })()}
                                  </td>
                                  <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", fontSize: 12, color: "var(--foreground)" }}>
                                    {t.visual || ""}
                                  </td>
                                  <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", fontSize: 12, color: "var(--foreground)" }}>
                                    {t.quantity || ""}
                                  </td>
                                  <td style={{ padding: "4px 16px", borderBottom: "1px solid var(--border)", verticalAlign: "middle", fontSize: 12, color: "var(--foreground)" }}>
                                    {t.channel ? t.channel.split(",").join(", ") : ""}
                                  </td>
                                </tr>
                              );
                            })}
                            {previewData.rawTasks.length === 0 && (
                              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Bảng dữ liệu này đang trống</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : previewData.table && (
                    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "var(--muted)" }}>
                            {previewData.table.headers.map((h: string, i: number) => (
                              <th key={i} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)", fontWeight: 700 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.table.rows.map((row: any[], i: number) => (
                            <tr key={i} style={{ borderBottom: i === previewData.table.rows.length - 1 ? "none" : "1px solid var(--border)" }}>
                              {row.map((cell: any, j: number) => {
                                const isObj = cell && typeof cell === "object" && !Array.isArray(cell);
                                const content = isObj ? cell.value : cell;
                                const span = isObj ? cell.colspan || 1 : 1;
                                const cellStyle = isObj && cell.style ? cell.style : {};
                                const combinedStyle: any = { padding: "12px 14px", ...cellStyle };
                                return <td key={j} colSpan={span} style={combinedStyle}><span style={{ whiteSpace: 'pre-wrap' }}>{content}</span></td>;
                              })}
                            </tr>
                          ))}
                          {previewData.table.rows.length === 0 && (
                            <tr><td colSpan={previewData.table.headers.length} style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Dữ liệu trình duyệt này đang trống</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}


                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted-foreground)" }}>
                  <i className="bi bi-file-earmark-x" style={{ fontSize: 40, display: "block", marginBottom: 16, opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>Không thể tích hợp hệ thống Preview tự động cho loại hồ sơ này ({item.entityType}).</p>
                  {getEntityLink(item.entityType, meta) && (
                    <a 
                      href={getEntityLink(item.entityType, meta)!} 
                      target="_blank" 
                      style={{
                        display: "inline-block", marginTop: 16, padding: "8px 16px", 
                        borderRadius: 8, background: "var(--primary)", color: "#fff", 
                        fontSize: 13, fontWeight: 600, textDecoration: "none"
                      }}
                    >
                      Mở hồ sơ gốc
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen PDF Modal Overlay */}
      {fullscreenPdfUrl && createPortal(
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
          display: "flex", flexDirection: "column", zIndex: 9999, animation: "fadeIn 0.2s"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "rgba(0,0,0,0.5)" }}>
            <h4 style={{ margin: 0, color: "#fff", fontSize: 16 }}>Tài liệu đính kèm</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={handleAIAnalyze}
                className="btn btn-sm"
                style={{ fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)", animation: "pulse 2s infinite" }}
              >
                <i className="bi bi-robot" style={{ fontSize: 16 }} /> Phân tích bởi AI
              </button>
              <button
                onClick={() => setFullscreenPdfUrl(null)}
                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              >
                <i className="bi bi-x-lg" style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, padding: 24 }}>
            <iframe src={fullscreenPdfUrl} style={{ width: "100%", height: "100%", border: "none", borderRadius: 8, background: "#fff" }} />
          </div>
        </div>,
        document.body
      )}

      {/* AI Offcanvas Overlay */}
      {showAIOffcanvas && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.5)", animation: "fadeIn 0.2s" }} onClick={() => setShowAIOffcanvas(false)}>
          <div style={{ width: 400, height: "100%", background: "var(--card)", padding: 24, boxShadow: "-4px 0 24px rgba(0,0,0,0.2)", animation: "slideLeft 0.3s", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-robot" />
                </div>
                AI Hỗ trợ duyệt
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!aiLoading && aiReport && (
                  <button 
                    onClick={toggleSpeech} 
                    style={{ border: "none", background: "rgba(99, 102, 241, 0.1)", color: "var(--primary)", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }} 
                    title={isSpeaking ? "Ngừng đọc" : "Nghe AI đọc báo cáo"}
                  >
                    <i className={`bi ${isSpeaking ? "bi-stop-fill" : "bi-volume-up-fill"}`} style={{ fontSize: 18, animation: isSpeaking ? "pulse 1.5s infinite" : "none" }} />
                  </button>
                )}
                <button onClick={() => setShowAIOffcanvas(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-x-lg" style={{ fontSize: 18 }} />
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", color: "var(--foreground)", fontSize: 14, lineHeight: 1.6 }}>
              {aiLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)" }}>
                  <span className="spinner-border text-primary" style={{ width: 32, height: 32, marginBottom: 16 }} />
                  Đang phân tích hồ sơ...
                </div>
              ) : (
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(aiReport || "").replace(/<br\/><br\/>/g, '<br/>') }} />
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Reject Modal Overlay */}
      {showRejectModal && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          animation: "fadeIn 0.2s"
        }}>
          <div style={{
            background: "var(--card)", borderRadius: 16, padding: 24, width: 360,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "slideUp 0.3s"
          }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: "rgba(220,38,38,0.1)", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-x-lg" style={{ color: "#dc2626", fontSize: 14 }} />
              </div>
              Từ chối hồ sơ
            </h4>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Yêu cầu này sẽ bị vô hiệu hoá. Vui lòng ghi lại lý do để nhân viên có thể bổ sung / sửa đổi.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Nhập lý do chi tiết..."
              rows={4}
              autoFocus
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--muted)",
                fontSize: 13, color: "var(--foreground)", resize: "none", outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Huỷ bỏ
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  handleAction("reject", { rejectedReason: rejectReason });
                }}
                disabled={!rejectReason.trim()}
                style={{
                  flex: 1, padding: "10px", borderRadius: 8, border: "none",
                  background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: rejectReason.trim() ? "pointer" : "not-allowed", opacity: rejectReason.trim() ? 1 : 0.5,
                }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal Overlay */}
      {showApproveNote && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          animation: "fadeIn 0.2s"
        }}>
          <div style={{
            background: "var(--card)", borderRadius: 16, padding: 24, width: 360,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "slideUp 0.3s"
          }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: "rgba(5,150,105,0.1)", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-check-lg" style={{ color: "#059669", fontSize: 16 }} />
              </div>
              Xác nhận Phê duyệt
            </h4>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Phê duyệt hồ sơ này. Bạn có thể để lại lời nhắn hoặc ghi chú bên dưới (không bắt buộc). 
            </p>
            <textarea
              value={approveNote}
              onChange={e => setApproveNote(e.target.value)}
              placeholder="Nhập ghi chú hoặc lời khen..."
              rows={3}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                border: "1px solid #10b981", background: "rgba(16,185,129,0.05)",
                fontSize: 13, color: "var(--foreground)", resize: "none", outline: "none",
                marginBottom: 20
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowApproveNote(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => { handleAction("approve", { note: approveNote }); setShowApproveNote(false); }}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {actionLoading === "approve" && <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />}
                Phê duyệt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function InfoRow({ icon, label, value, emphasize, color }: { icon: string; label: string; value: any; emphasize?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <i className={`bi ${icon}`} style={{ fontSize: 12, color: color || "var(--muted-foreground)", flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }}>{label}:</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: color || (emphasize ? "#dc2626" : "var(--foreground)"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );
}

// ── List Item ──────────────────────────────────────────────────────────────────
function ApprovalListItem({
  item,
  isSelected,
  onClick,
}: {
  item: ApprovalRequest;
  isSelected: boolean;
  onClick: () => void;
}) {
  const entityCfg = ENTITY_TYPE_LABELS[item.entityType] || { label: item.entityType, icon: "bi-file-earmark", color: "#64748b" };
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)",
        background: isSelected ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
        borderLeft: isSelected ? `3px solid var(--primary)` : "3px solid transparent",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--muted)"; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: entityCfg.color + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`bi ${entityCfg.icon}`} style={{ fontSize: 16, color: entityCfg.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <EntityBadge entityType={item.entityType} />
            {item.priority === "urgent" && (
              <span style={{ fontSize: 10, fontWeight: 800, color: "#dc2626" }}>🔥 KHẨN</span>
            )}
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: "var(--foreground)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4,
          }}>
            {item.entityTitle}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <StatusBadge status={item.status} />
            {item.entityCode && (
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{item.entityCode}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              <i className="bi bi-person" style={{ marginRight: 3 }} />{item.requestedByName}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {timeAgo(item.createdAt)}
            </span>
            {(item.commentCount || 0) > 0 && (
              <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: "auto" }}>
                <i className="bi bi-chat-dots" style={{ marginRight: 3 }} />{item.commentCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export function ApprovalCenter({
  mode = "drawer",
  isOpen = false,
  onClose,
  entityFilter,
  entityId: defaultEntityId,
  defaultView = "inbox",
  onApprove,
  onReject,
}: ApprovalCenterProps) {
  const { data: session } = useSession();
  const toast = useToast();
  const [isMounted, setIsMounted] = useState(false);

  const [view, setView] = useState<"inbox" | "mine">(defaultView);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [deptFilter, setDeptFilter] = useState("");
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ApprovalRequest | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view, status: statusFilter });
      if (deptFilter) params.set("dept", deptFilter);
      if (entityFilter) params.set("entityType", entityFilter);
      const res = await fetch(`/api/approvals?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setTotal(data.total);
        // Auto-select nếu có entityId filter
        if (defaultEntityId) {
          const found = data.data.find((i: ApprovalRequest) => i.entityId === defaultEntityId);
          if (found) { setSelectedId(found.id); setSelectedItem(found); }
        }
      }
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  }, [view, statusFilter, deptFilter, entityFilter, defaultEntityId]);

  useEffect(() => {
    if (isOpen || mode === "page") loadItems();
  }, [isOpen, mode, loadItems]);

  const handleItemSelect = (item: ApprovalRequest) => {
    setSelectedId(item.id);
    setSelectedItem(item);
  };

  const handleAction = async (id: string, action: string, extra?: any) => {
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Thành công", action === "approve" ? "Đã phê duyệt hồ sơ!" : action === "reject" ? "Đã từ chối hồ sơ." : "Đã cập nhật hồ sơ.");
        if (action === "approve" && onApprove) onApprove(id);
        if (action === "reject" && onReject) onReject(id);
        // Refresh list + update selected item status
        await loadItems();
        setSelectedItem(prev => prev ? { ...prev, status: data.data.status } : null);
      } else {
        toast.error("Lỗi", data.error || "Không thể thực hiện");
      }
    } catch {
      toast.error("Lỗi hệ thống", "Vui lòng thử lại");
    }
  };

  const currentUserId = (session?.user as any)?.id || "";
  const currentUserName = session?.user?.name || session?.user?.email || "Bạn";

  const pendingCount = items.filter(i => i.status === "pending").length;

  // ── Page layout
  if (mode === "page") {
    return (
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* List pane */}
        <div style={{
          width: 360, flexShrink: 0, display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--border)", height: "100%",
        }}>
          {/* Toolbar */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {(["inbox", "mine"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  flex: 1, padding: "6px 10px", borderRadius: 8, border: "none",
                  background: view === v ? "var(--primary)" : "var(--muted)",
                  color: view === v ? "#fff" : "var(--muted-foreground)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}>
                  {v === "inbox" ? `📥 Cần tôi duyệt${pendingCount > 0 && v === "inbox" && statusFilter === "pending" ? ` (${pendingCount})` : ""}` : "📤 Tôi đã gửi"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
                flex: 1, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--muted)", fontSize: 12, color: "var(--foreground)", outline: "none",
              }}>
                <option value="">Tất cả trạng thái</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Từ chối</option>
                <option value="on_hold">Tạm giữ</option>
                <option value="recalled">Thu hồi</option>
              </select>
              <button onClick={loadItems} style={{
                width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)",
                background: "transparent", cursor: "pointer", color: "var(--muted-foreground)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className={`bi bi-arrow-clockwise${loading ? " spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
            {loading && items.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)" }}>
                <span className="spinner-border spinner-border-sm" />
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)" }}>
                <i className="bi bi-inbox" style={{ fontSize: 32, display: "block", opacity: 0.3, marginBottom: 8 }} />
                <span style={{ fontSize: 13 }}>Không có hồ sơ nào</span>
              </div>
            ) : (
              items.map(item => (
                <ApprovalListItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onClick={() => handleItemSelect(item)}
                />
              ))
            )}
          </div>
          <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted-foreground)" }}>
            {total} hồ sơ
          </div>
        </div>

        {/* Detail pane */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", background: "var(--card)" }}>
          {selectedItem ? (
            <ApprovalDetail
              item={selectedItem}
              onAction={handleAction}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", gap: 12 }}>
              <i className="bi bi-file-earmark-check" style={{ fontSize: 48, opacity: 0.2 }} />
              <span style={{ fontSize: 14 }}>Chọn một hồ sơ để xem chi tiết</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Drawer layout
  if (!isMounted) return null;

  return createPortal(
    <>
      {/* Subtle backdrop — không che sidebar */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", top: 62, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.2)", zIndex: 49,
            backdropFilter: "blur(1px)",
          }}
        />
      )}

      {/* Drawer panel */}
      <div style={{
        position: "fixed", top: 62, right: 0, bottom: 0, width: 900,
        maxWidth: "calc(100vw - 200px)", // Không che sidebar (200px buffer)
        background: "var(--card)", zIndex: 50,
        boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Drawer header */}
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0,
          display: "flex", alignItems: "center", gap: 12,
          background: "linear-gradient(to right, color-mix(in srgb, var(--primary) 5%, transparent), transparent)",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <i className="bi bi-file-earmark-check" style={{ fontSize: 18, color: "var(--primary)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>
              Trung Tâm Phê Duyệt
            </h3>
            <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>
              {entityFilter ? (ENTITY_TYPE_LABELS[entityFilter]?.label || entityFilter) : "Tất cả hồ sơ"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {pendingCount > 0 && (
              <span style={{
                padding: "2px 8px", borderRadius: 99, background: "#dc2626",
                color: "#fff", fontSize: 11, fontWeight: 800,
              }}>
                {pendingCount} chờ duyệt
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--muted)", cursor: "pointer", color: "var(--muted-foreground)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <i className="bi bi-x" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* Drawer body = same master-detail layout */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* List */}
          <div style={{ width: 320, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
            {/* Tabs */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", gap: 6 }}>
              {(["inbox", "mine"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  flex: 1, padding: "5px 8px", borderRadius: 7, border: "none",
                  background: view === v ? "var(--primary)" : "var(--muted)",
                  color: view === v ? "#fff" : "var(--muted-foreground)",
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>
                  {v === "inbox" ? "📥 Cần duyệt" : "📤 Đã gửi"}
                </button>
              ))}
            </div>
            <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)", display: "flex", gap: 6 }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
                flex: 1, padding: "4px 6px", borderRadius: 7, border: "1px solid var(--border)",
                background: "var(--muted)", fontSize: 11, color: "var(--foreground)", outline: "none",
              }}>
                <option value="">Tất cả</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Từ chối</option>
                <option value="on_hold">Tạm giữ</option>
                <option value="recalled">Thu hồi</option>
              </select>
              <button onClick={loadItems} title="Làm mới" style={{
                width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)",
                background: "transparent", cursor: "pointer", color: "var(--muted-foreground)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="bi bi-arrow-clockwise" style={{ fontSize: 12 }} />
              </button>
            </div>
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 20, textAlign: "center" }}><span className="spinner-border spinner-border-sm" /></div>
              ) : items.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)", fontSize: 12 }}>
                  <i className="bi bi-inbox" style={{ fontSize: 24, display: "block", opacity: 0.3, marginBottom: 6 }} />
                  Không có hồ sơ
                </div>
              ) : (
                items.map(item => (
                  <ApprovalListItem key={item.id} item={item} isSelected={selectedId === item.id} onClick={() => handleItemSelect(item)} />
                ))
              )}
            </div>
          </div>

          {/* Detail */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            {selectedItem ? (
              <ApprovalDetail item={selectedItem} onAction={handleAction} currentUserId={currentUserId} currentUserName={currentUserName} />
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)", gap: 12 }}>
                <i className="bi bi-arrow-left-circle" style={{ fontSize: 32, opacity: 0.2 }} />
                <span style={{ fontSize: 13 }}>Chọn một hồ sơ bên trái</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Badge Component (dùng trong Topbar) ───────────────────────────────────────
export function ApprovalBadgeButton({ onClick }: { onClick: () => void }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    const fetch_ = () => {
      fetch("/api/approvals/stats")
        .then(r => r.json())
        .then(d => { setPendingCount(d.pendingCount || 0); setUrgentCount(d.urgentCount || 0); })
        .catch(() => {});
    };
    fetch_();
    const interval = setInterval(fetch_, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      id="topbar-approval-btn"
      title="Trung tâm phê duyệt"
      onClick={onClick}
      style={{
        position: "relative", width: 38, height: 38,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 10, border: "none", background: "transparent",
        color: urgentCount > 0 ? "#d97706" : "var(--muted-foreground)",
        cursor: "pointer", transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <i className="bi bi-file-earmark-check" style={{ fontSize: 18 }} />
      {pendingCount > 0 && (
        <span style={{
          position: "absolute", top: 3, right: 3,
          minWidth: 18, height: 18, borderRadius: 99,
          background: urgentCount > 0 ? "#d97706" : "#dc2626",
          border: "2px solid var(--background)",
          color: "#fff", fontSize: 10, fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 4px", lineHeight: 1,
        }}>
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      )}
    </button>
  );
}
