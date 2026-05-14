const fs = require('fs');
const filepath = 'src/components/approvals/ApprovalCenter.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// The component starts at `function ApprovalDetail({` and ends before `function InfoRow`
const startIdx = content.indexOf('function ApprovalDetail({');
const endIdx = content.indexOf('function InfoRow({');

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find boundaries");
  process.exit(1);
}

const replacement = `function ApprovalDetail({
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
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(\`/api/approvals/\${item.id}/comments\`);
      const data = await res.json();
      if (data.success) setComments(data.data);
    } catch { /* noop */ } finally {
      setLoadingComments(false);
    }
  }, [item.id]);

  useEffect(() => {
    setLoadingComments(true);
    setComments([]);
    setCommentText("");
    setReplyingTo(null);
    loadComments();

    // Load preview data
    setActiveTab("discussion");
    setPreviewData(null);
    setLoadingPreview(true);
    fetch(\`/api/approvals/\${item.id}/preview\`)
      .then(res => res.json())
      .then(res => { if (res.success) setPreviewData(res.data); })
      .finally(() => setLoadingPreview(false));
  }, [item.id, loadComments]);

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(\`/api/approvals/\${item.id}/comments\`, {
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
  const canApprove = !isMyRequest && item.status === "pending";
  const canRecall = isMyRequest && item.status === "pending";

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
            <i className={\`bi \${entityCfg.icon}\`} style={{ fontSize: 20, color: entityCfg.color }} />
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
            Tài liệu trình duyệt
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", background: "var(--card)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
                <InfoRow icon="bi-person" label="Người gửi" value={item.requestedByName} />
                <InfoRow icon="bi-clock" label="Gửi lúc" value={formatDate(item.createdAt)} />
                {item.department && <InfoRow icon="bi-building" label="Phòng ban" value={item.department} />}
                {meta.year && <InfoRow icon="bi-calendar" label="Năm quy chiếu" value={meta.year} />}
                {meta.amount && <InfoRow icon="bi-cash" label="Số tiền yêu cầu" value={Number(meta.amount).toLocaleString("vi-VN") + " ₫"} />}
                {item.dueDate && <InfoRow icon="bi-alarm" label="Hạn duyệt" value={formatDate(item.dueDate)} emphasize />}
              </div>

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
              {loadingPreview ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)" }}>
                  <span className="spinner-border spinner-border-sm" style={{ marginRight: 10 }} /> Đang trích xuất dữ liệu gốc...
                </div>
              ) : previewData ? (
                <div style={{ animation: "fadeIn 0.3s" }}>
                  
                  {/* Tóm tắt */}
                  {previewData.summary && previewData.summary.length > 0 && (
                    <div style={{ marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {previewData.summary.map((s: any, idx: number) => (
                        <div key={idx} style={{ flex: 1, minWidth: 140, background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.1)", padding: "12px 16px", borderRadius: 12 }}>
                          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{s.label}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chi tiết text */}
                  {previewData.details && (
                    <div style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", padding: 16, borderRadius: 12, fontSize: 13, lineHeight: 1.6, borderLeft: "4px solid var(--primary)", marginBottom: 24 }}>
                      {previewData.details}
                    </div>
                  )}

                  {/* Dữ liệu bảng */}
                  {previewData.table && (
                    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "var(--muted)" }}>
                            {previewData.table.headers.map((h: string, i: number) => (
                              <th key={i} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)", fontWeight: 700 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.table.rows.map((row: any[], i: number) => (
                            <tr key={i} style={{ borderBottom: i === previewData.table.rows.length - 1 ? "none" : "1px solid var(--border)" }}>
                              {row.map((cell: any, j: number) => (
                                <td key={j} style={{ padding: "12px 16px", color: "var(--foreground)" }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                          {previewData.table.rows.length === 0 && (
                            <tr><td colSpan={previewData.table.headers.length} style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Mảng dữ liệu trình duyệt này đang trống</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ marginTop: 30, textAlign: "center", paddingTop: 20, borderTop: "1px dashed var(--border)" }}>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", display: "block", marginBottom: 12 }}>
                      (Bảng xem trước chỉ hiển thị các trường dữ liệu quan trọng)
                    </span>
                    <a 
                      href={getEntityLink(item.entityType, meta)!} 
                      target="_blank" 
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", 
                        borderRadius: 10, background: "var(--muted)", border: "1px solid var(--border)", 
                        color: "var(--foreground)", fontSize: 13, fontWeight: 700, textDecoration: "none",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--foreground)"; }}
                    >
                      <i className="bi bi-box-arrow-up-right" /> Mở công cụ Edit trên File gốc
                    </a>
                  </div>

                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted-foreground)" }}>
                  <i className="bi bi-file-earmark-x" style={{ fontSize: 40, display: "block", marginBottom: 16, opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>Không thể trích xuất dữ liệu tự động cho loại hồ sơ này.</p>
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

      {/* Global Bottom Fixed Action Form */}
      {(canApprove || canRecall) && (
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", background: "var(--card)", zIndex: 10, flexShrink: 0 }}>
          
          {/* Reject/Approve extra input contexts (conditionally rendered) */}
          {showApproveNote && canApprove && (
            <div style={{ marginBottom: 14, animation: "fadeInUp 0.2s" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#059669", paddingBottom: 6 }}>Ghi chú thêm:</div>
              <textarea
                value={approveNote}
                onChange={e => setApproveNote(e.target.value)}
                placeholder="Nhập ghi chú hoặc lời khen..."
                rows={2}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: "1px solid #10b981", background: "rgba(16,185,129,0.05)",
                  fontSize: 13, color: "var(--foreground)", resize: "none", outline: "none",
                }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            {canApprove && (
              <>
                <button
                  onClick={() => {
                    if (showApproveNote) handleAction("approve", { note: approveNote });
                    else setShowApproveNote(true);
                  }}
                  disabled={!!actionLoading}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #059669, #047857)",
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 12px rgba(5,150,105,0.3)", transition: "all 0.2s",
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading === "approve" ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-circle-fill" />}
                  {showApproveNote ? "Xác nhận duyệt" : "Phê duyệt"}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={!!actionLoading}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(220,38,38,0.3)",
                    background: "rgba(220,38,38,0.05)", color: "#dc2626",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s", opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  <i className="bi bi-x-circle-fill" /> Từ chối
                </button>
              </>
            )}
            
            {canRecall && (
              <button
                onClick={() => handleAction("recall")}
                disabled={!!actionLoading}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)",
                  background: "var(--muted)", color: "var(--foreground)",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s", opacity: actionLoading ? 0.7 : 1
                }}
              >
                {actionLoading === "recall" ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-arrow-counterclockwise" />}
                Thu hồi hồ sơ
              </button>
            )}
          </div>
        </div>
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
    </div>
  );
}
`;

const newContent = content.substring(0, startIdx) + replacement + "\n" + content.substring(endIdx);
fs.writeFileSync(filepath, newContent, 'utf8');
console.log("Successfully replaced ApprovalDetail");
