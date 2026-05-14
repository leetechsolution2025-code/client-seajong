                          <tbody>
                            {(() => {
                              let parentIdx = 0;
                              let subIdx = 0;
                              
                              return eventContents.map((row, idx) => {
                                let displaySTT = "";
                                if (row.level === 0) {
                                  parentIdx++;
                                  subIdx = 0;
                                  displaySTT = `${parentIdx}`;
                                } else {
                                  subIdx++;
                                  displaySTT = `${parentIdx}.${subIdx}`;
                                }

                                return (
                                  <tr 
                                    key={row.id} 
                                    onClick={() => handleOpenContentOffcanvas(null, idx)}
                                    style={{ borderBottom: "1px solid var(--border)", transition: "all 0.2s", verticalAlign: "top", cursor: "pointer" }}
                                    className="hover-row"
                                  >
                                    <td style={{ 
                                      padding: "12px 14px", 
                                      textAlign: "center", 
                                      color: row.level === 0 ? "var(--primary)" : "var(--muted-foreground)", 
                                      fontWeight: row.level === 0 ? "800" : "500",
                                      fontSize: "12px"
                                    }}>
                                      {displaySTT}
                                    </td>
                                    <td style={{ padding: "12px 0" }}>
                                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", paddingLeft: `${row.level * 20}px` }}>
                                       {row.level === 1 && <i className="bi bi-arrow-return-right" style={{ color: "var(--muted-foreground)", fontSize: "10px", marginLeft: "6px", marginTop: "4px" }}></i>}
                                       {row.level === 2 && <i className="bi bi-dash" style={{ color: "var(--muted-foreground)", fontSize: "14px", marginLeft: "12px", marginTop: "2px" }}></i>}
                                       <div style={{ 
                                         color: row.level === 0 ? "var(--primary)" : "var(--foreground)", 
                                         fontSize: "13px",
                                         fontWeight: row.level === 0 ? "800" : "500",
                                         textTransform: row.level === 0 ? "uppercase" : "none"
                                       }}>
                                         {row.item}
                                       </div>
                                       {row.level < 2 && (
                                         <i 
                                           className="bi bi-plus-circle-fill" 
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             handleOpenContentOffcanvas(idx);
                                           }}
                                           style={{ marginLeft: "auto", marginRight: "12px", cursor: "pointer", color: "var(--primary)", opacity: 0.8, fontSize: "14px" }}
                                           title="Thêm hạng mục con"
                                         ></i>
                                       )}
                                      </div>
                                    </td>
                                    <td style={{ padding: "12px 14px", color: "var(--foreground)", fontSize: "13px", whiteSpace: "pre-line", lineHeight: "1.5" }}>
                                      {row.description}
                                    </td>
                                    <td style={{ padding: "12px 0", textAlign: "center", color: "var(--foreground)", fontSize: "13px" }}>
                                      {row.unit}
                                    </td>
                                    <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--foreground)", fontWeight: "500", fontSize: "13px" }}>
                                      {row.price > 0 ? row.price.toLocaleString("vi-VN") : ""}
                                    </td>
                                    <td style={{ padding: "12px 0", textAlign: "center", color: "var(--foreground)", fontSize: "13px" }}>
                                      {row.quantity > 0 ? row.quantity.toLocaleString("vi-VN") : ""}
                                    </td>
                                    <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: "700", color: "var(--primary)", fontSize: "14px" }}>
                                      {calculateItemTotal(idx).toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                            <tr style={{ background: "rgba(99, 102, 241, 0.02)" }}>
                              <td colSpan={7} style={{ padding: "0" }}>
                                <button
                                  onClick={() => handleOpenContentOffcanvas(null)}
                                  style={{ width: "100%", padding: "16px", border: "none", background: "transparent", color: "var(--primary)", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
                                >
                                  <i className="bi bi-plus-lg"></i> Thêm dòng nội dung mới
                                </button>
                              </td>
                            </tr>
                          </tbody>
