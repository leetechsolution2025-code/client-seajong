const fs = require('fs');
const file = 'src/components/plan-finance/bao_gia/BaoGiaSanitaryModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
          <div className="sanitary-modal-table-container" style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Form nhập liệu (Chỉ dành cho Bán lẻ / Không quầy kệ) */}
            {!isCoQuayKe && (
              <div style={{ padding: 16, background: "rgba(59,130,246,0.04)", border: "1px dashed rgba(59,130,246,0.3)", borderRadius: 8, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 100%", display: "flex", gap: 12 }}>
                  <div style={{ flex: "2 1 250px", position: "relative" }}>
                    <FLabel text="Sản phẩm / Dịch vụ" required />
                    <input
                      value={formItem.ten}
                      placeholder="Nhập tên hoặc mã SKU sản phẩm..."
                      onChange={e => {
                        const v = e.target.value;
                        setFormItem(prev => ({ ...prev, ten: v }));
                        if (!v) {
                          setSuggest([]);
                        } else {
                          setActiveRowIdSync(-1);
                          fetchSuggest(v, -1);
                        }
                      }}
                      onFocus={e => { setActiveRowIdSync(-1); fetchSuggest(formItem.ten, -1); e.currentTarget.style.border = "1px solid var(--primary)"; }}
                      onBlur={e => { e.currentTarget.style.border = "1px solid var(--border)"; setTimeout(() => { if (activeRowIdRef.current === -1) { setSuggest([]); setActiveRowIdSync(null); } }, 200); }}
                      style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", background: "#fff", outline: "none", borderRadius: 6, fontFamily: "inherit", fontSize: 13, color: "var(--foreground)", transition: "border-color 0.15s" }}
                    />
                    {activeRowId === -1 && suggest.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                        {suggest.map(s => (
                          <div key={s.id} onClick={() => applySuggest(-1, s)}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--muted)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", transition: "background 0.1s" }}
                          >
                            <div style={{ fontWeight: 600 }}>{s.tenHang}</div>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", gap: 8, marginTop: 2 }}>
                              {s.code && <span style={{ fontFamily: "monospace", background: "var(--muted)", padding: "0 5px", borderRadius: 4 }}>{s.code}</span>}
                              <span>Tồn: <b>{s.soLuongThuc ?? s.soLuong}</b> {s.donVi}</span>
                              <span>Giá: <b>{s.giaBan.toLocaleString("vi-VN")} ₫</b></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: "1 1 110px", maxWidth: 180 }}>
                    <FLabel text="Mã định mức" />
                    <select
                      value={formItem.dinhMucId || ""}
                      onChange={e => {
                        const dmId = e.target.value;
                        const dm = formItem.dinhMucs?.find(x => x.id === dmId);
                        setFormItem(p => ({ 
                          ...p, 
                          dinhMucId: dmId, 
                          dinhMucTen: dm ? dm.tenDinhMuc : null,
                          donGia: dm ? (dm.giaBan ?? 0) : p.donGia
                        }));
                      }}
                      disabled={formItem.source === "inventory"}
                      style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: formItem.source === "inventory" ? "var(--muted)" : "#fff", outline: "none", fontFamily: "inherit", fontSize: 13, color: formItem.source === "inventory" ? "var(--muted-foreground)" : "var(--foreground)", cursor: formItem.source === "inventory" ? "not-allowed" : "default" }}
                    >
                      {formItem.dinhMucs?.map((dm: any) => (
                        <option key={dm.id} value={dm.id}>{dm.code}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: "2 1 240px" }}>
                    <FLabel text="Mô tả định mức" />
                    <div className="d-flex gap-2">
                      <input
                        value={formItem.dinhMucTen || ""}
                        readOnly
                        placeholder="Tự động hiển thị..."
                        style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--muted-foreground)", cursor: "not-allowed" }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-light border" 
                        onClick={() => setShowBomDetail(true)}
                        disabled={!formItem.dinhMucId}
                        style={{ padding: "7px 12px", borderRadius: 6 }}
                        title="Xem chi tiết định mức"
                      >
                        <i className="bi bi-three-dots"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <FLabel text="Tên kho" />
                  <input 
                    value={formItem.khoTen || ""} 
                    readOnly 
                    placeholder="Tự động..."
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--muted)", outline: "none", fontFamily: "inherit", fontSize: 13, color: "var(--muted-foreground)", cursor: "not-allowed" }} 
                  />
                </div>
                <div style={{ flex: "1 1 80px" }}>
                  <FLabel text="Đơn vị tính" />
                  <input value={formItem.dvt} onChange={e => setFormItem(p => ({ ...p, dvt: e.target.value }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "center", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
                </div>
                <div style={{ flex: "1 1 90px" }}>
                  <FLabel text="Số lượng" required />
                  <input type="number" min={1} value={formItem.soLuong} onChange={e => setFormItem(p => ({ ...p, soLuong: Math.max(1, Number(e.target.value)) }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
                </div>
                <div style={{ flex: "1 1 90px" }}>
                  <FLabel text="Chiết khấu (%)" />
                  <input type="number" min={0} max={100} value={formItem.ckPct} onChange={e => setFormItem(p => ({ ...p, ckPct: Math.max(0, Math.min(100, Number(e.target.value))) }))} style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: "var(--foreground)" }} />
                </div>
                <div style={{ flex: "1 1 120px" }}>
                  <FLabel text="Đơn giá (đ)" />
                  <CurrencyInput
                    value={formItem.donGia}
                    onChange={v => !(!isAdmin) && setFormItem(p => ({ ...p, donGia: v }))}
                    readOnly={!isAdmin}
                    placeholder="0"
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, background: !isAdmin ? "var(--muted)" : "#fff", outline: "none", textAlign: "right", fontFamily: "inherit", fontSize: 13, color: !isAdmin ? "var(--muted-foreground)" : "var(--foreground)", cursor: !isAdmin ? "not-allowed" : "text" }}
                  />
                </div>
                <div>
                  <button onClick={addRow} style={{ padding: "7px 14px", border: "none", background: "var(--primary)", color: "#fff", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, height: 33 }}>
                    <i className="bi bi-plus-lg" /> Thêm
                  </button>
                </div>
              </div>
            )}

            <table className="sanitary-modal-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--muted)", textAlign: "left" }}>
                  {isCoQuayKe ? (
                    <>
                      <th style={{ padding: 10, width: 40 }}>#</th>
                      <th style={{ padding: 10 }}>Tên hàng hoá</th>
                      <th style={{ padding: 10, width: 120 }}>Vị trí</th>
                      <th style={{ padding: 10, width: 100 }}>Quy cách</th>
                      <th style={{ padding: 10, width: 120, textAlign: "right" }}>Giá bán (đ)</th>
                      <th style={{ padding: 10, width: 120, textAlign: "right" }}>Giá đại lý (đ)</th>
                      <th style={{ padding: 10, width: 40 }} />
                    </>
                  ) : (
                    <>
                      <th style={{ padding: 10, width: 40 }}>#</th>
                      <th style={{ padding: 10 }}>Tên hàng hoá - Dịch vụ</th>
                      <th style={{ padding: 10, width: 70, textAlign: "center" }}>ĐVT</th>
                      <th style={{ padding: 10, width: 90, textAlign: "center" }}>Số lượng</th>
                      <th style={{ padding: 10, width: 110, textAlign: "center" }}>Chiết khấu (%)</th>
                      <th style={{ padding: 10, width: 130, textAlign: "right" }}>Đơn giá (đ)</th>
                      <th style={{ padding: 10, width: 130, textAlign: "right" }}>Thành tiền (đ)</th>
                      <th style={{ padding: 10, width: 40 }} />
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isCoQuayKe ? (
                  soKhuVuc > 1 ? (
                    Array.from({ length: soKhuVuc }).map((_, kvIdx) => {
                      const areaName = \`Khu vực \${kvIdx + 1}\`;
                      const isCollapsed = !!collapsedAreas[areaName];
                      const areaItems = items.filter(it => it.viTri === areaName);

                      return (
                        <React.Fragment key={areaName}>
                          {/* Accordion Header Row */}
                          <tr
                            onClick={() => setCollapsedAreas(prev => ({ ...prev, [areaName]: !prev[areaName] }))}
                            style={{ background: "rgba(59,130,246,0.06)", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                          >
                            <td colSpan={7} style={{ padding: "10px 12px", fontWeight: 800, color: "var(--primary)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <i className={\`bi bi-chevron-\${isCollapsed ? "right" : "down"}\`} style={{ fontSize: 13 }} />
                                  <span>{areaName}</span>
                                  <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 10 }}>
                                    {areaItems.length} mặt hàng
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Accordion Content Rows */}
                          {!isCollapsed && (
                            <>
                              {areaItems.map((it, areaItemIdx) => renderQuayKeRow(it, areaItemIdx))}

                              <tr>
                                <td colSpan={7} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                                  <button
                                    onClick={() => {
                                      setItems(r => [...r, { id: nextId.current++, ten: "", dvt: "", soLuong: 1, donGia: 0, ckPct: 0, soLuongTon: null, trangThaiKho: null, inventoryId: null, giaDaiLy: 0, viTri: areaName }]);
                                    }}
                                    style={{
                                      padding: "5px 12px",
                                      border: "1px dashed var(--primary)",
                                      background: "none",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      color: "var(--primary)",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      transition: "all 0.15s"
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.05)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                                  >
                                    <i className="bi bi-plus-lg" /> Thêm dòng vào {areaName}
                                  </button>
                                </td>
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    items.map((it, idx) => renderQuayKeRow(it, idx))
                  )
                ) : (
                  items.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)" }}>Chưa có sản phẩm nào</td></tr>
                  ) : items.map((it, idx) => (
                    <tr key={it.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: 10, color: "var(--muted-foreground)" }}>{idx + 1}</td>
                      <td style={{ padding: "6px 10px", position: "relative" }}>
                        {it.ten.trim() && it.soLuongTon !== null && it.soLuongTon !== undefined && (() => {
                          const ton = it.soLuongTon as number;
                          if (ton === 0) return (
                            <span title="Hết hàng" style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#ef4444", pointerEvents: "none", display: "flex" }}>
                              <i className="bi bi-x-circle-fill" style={{ fontSize: 13 }} />
                            </span>
                          );
                          if (it.soLuong > ton) return (
                            <span title={\`Thiếu hàng (tồn: \${ton})\`} style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#f97316", pointerEvents: "none", display: "flex" }}>
                              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 12 }} />
                            </span>
                          );
                          return null;
                        })()}
                        <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{it.ten}</span>
                      </td>
                      <td style={{ padding: 6, textAlign: "center" }}>{it.dvt}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{it.soLuong}</td>
                      <td style={{ padding: 6, textAlign: "center" }}>{it.ckPct}</td>
                      <td style={{ padding: 6, textAlign: "right" }}>{fmt(it.donGia)}</td>
                      <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{fmt(thanhTien(it))} đ</td>
                      <td style={{ padding: 6 }}>
                        <button onClick={() => removeRow(it.id)} style={{ padding: 4, background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!(isCoQuayKe) && false /* hidden as we use the form instead */}
          </div>
`;

// Extract the target section
const startIndex = code.indexOf('<div className="sanitary-modal-table-container"');
const endIndex = code.indexOf('<div style={{ padding: "12px 24px", borderTop: "1px solid var(--border)"', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement.trim() + '\n\n          ' + code.substring(endIndex);
  fs.writeFileSync(file, code);
  console.log("Success");
} else {
  console.log("Failed to find boundaries");
}
