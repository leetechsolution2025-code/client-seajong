const fs = require('fs');
let content = fs.readFileSync('src/components/logistics/inventory/LogisticsInventory.tsx', 'utf8');

// add webVariationId
content = content.replace(
  "  webProductId: number | null;",
  "  webProductId: number | null;\n  webVariationId?: number | null;"
);

// modify the render loop
const renderTarget = `                items.map(item => (
                  <tr 
                    key={item.id} 
                    style={{ height: 48, cursor: "pointer" }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="ps-4" onClick={(e) => e.stopPropagation()} style={{ width: 40 }}>
                      <input 
                        type="checkbox" 
                        className="form-check-input shadow-none"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, item.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.tenHang} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <i className="bi bi-box-seam text-muted" style={{ fontSize: 20 }} />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-bold text-truncate" style={{ fontSize: 13, color: "var(--foreground)", maxWidth: 280 }} title={item.tenHang}>
                            {item.tenHang}
                          </div>
                          <div className="text-truncate mt-1" style={{ fontSize: 11, color: "var(--muted-foreground)", maxWidth: 280 }} title={item.code || ""}>
                            {item.code || "No SKU"}
                            {item.category?.name && <span className="ms-2 opacity-50 px-1 bg-secondary text-white rounded-1" style={{ fontSize: 9 }}>{item.category.name}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-truncate" style={{ fontSize: 12, color: "var(--foreground)" }}>{item.model || "-"}</div>
                      <div className="text-truncate mt-1" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{item.color || "-"} {item.version ? \`(\${item.version})\` : ""}</div>
                    </td>
                    <td className="text-center" style={{ fontSize: 13 }}>{item.donVi || "-"}</td>
                    <td className="text-end fw-bold" style={{ fontSize: 13, color: item.soLuong <= (item.soLuongMin || 0) ? "var(--danger)" : "var(--foreground)" }}>
                      {item.soLuong.toLocaleString()}
                    </td>
                    <td className="text-center">
                      <span className={\`badge \${item.soLuong > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"} rounded-pill fw-normal\`} style={{ fontSize: 11 }}>
                        {item.soLuong > 0 ? "Còn hàng" : "Hết hàng"}
                      </span>
                    </td>
                    {hideActions ? null : (
                      <td className="pe-4 text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="d-flex align-items-center justify-content-end gap-2">
                          <button 
                            className="btn btn-sm btn-light p-0" 
                            style={{ width: 28, height: 28, borderRadius: 6 }}
                            onClick={() => setSelectedItem(item)}
                            title="Chi tiết"
                          >
                            <i className="bi bi-eye" style={{ fontSize: 13 }} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))`;

if (!content.includes("group items before rendering")) {
  const insertIndex = content.indexOf('return (');
  const groupLogic = `
  // group items before rendering
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    const standalone: InventoryItem[] = [];
    
    items.forEach(item => {
      if (item.webProductId && item.webVariationId) {
        if (!groups[item.webProductId]) groups[item.webProductId] = [];
        groups[item.webProductId].push(item);
      } else {
        standalone.push(item);
      }
    });
    
    const result: { type: 'parent' | 'standalone', data: any, children?: InventoryItem[] }[] = [];
    
    // Add standalone items
    standalone.forEach(item => {
      // If there's a standalone item that happens to be the parent of some variations (maybe because webVariationId is null), we should group it
      if (groups[item.webProductId || ""]) {
        result.push({ type: 'parent', data: item, children: groups[item.webProductId || ""] });
        delete groups[item.webProductId || ""];
      } else {
        result.push({ type: 'standalone', data: item });
      }
    });
    
    // Add remaining grouped items where parent might not be in the current page
    Object.keys(groups).forEach(webProductId => {
      const children = groups[webProductId];
      // Create a fake parent from the first child
      const fakeParent = { ...children[0], tenHang: children[0].tenHang.split(" - ")[0], id: "parent-" + webProductId, soLuong: children.reduce((a,b)=>a+b.soLuong, 0) };
      result.push({ type: 'parent', data: fakeParent, children });
    });
    
    return result;
  }, [items]);

  const [expandedParents, setExpandedParents] = React.useState<Record<string, boolean>>({});
  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };
`;
  content = content.slice(0, insertIndex) + groupLogic + content.slice(insertIndex);
}

const replacement = `                groupedItems.map((group, idx) => {
                  const isParent = group.type === 'parent';
                  const item = group.data;
                  const children = group.children || [];
                  const isExpanded = expandedParents[item.id] || false;
                  
                  return (
                    <React.Fragment key={item.id + "-" + idx}>
                      <tr 
                        style={{ height: 48, cursor: "pointer", background: isParent ? "rgba(0,0,0,0.01)" : "transparent" }}
                        onClick={() => isParent ? null : setSelectedItem(item)}
                      >
                        <td className="ps-4" onClick={(e) => e.stopPropagation()} style={{ width: 40 }}>
                          {!isParent && (
                            <input 
                              type="checkbox" 
                              className="form-check-input shadow-none"
                              checked={selectedIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                            />
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.tenHang} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <i className="bi bi-box-seam text-muted" style={{ fontSize: 20 }} />
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="fw-bold text-truncate" style={{ fontSize: 13, color: "var(--foreground)", maxWidth: 280 }} title={item.tenHang}>
                                {isParent ? (
                                  <span className="badge bg-primary text-white me-2" style={{ fontSize: 9 }}>Có biến thể</span>
                                ) : null}
                                {item.tenHang}
                              </div>
                              <div className="text-truncate mt-1" style={{ fontSize: 11, color: "var(--muted-foreground)", maxWidth: 280 }} title={item.code || ""}>
                                {item.code || "No SKU"}
                                {item.category?.name && <span className="ms-2 opacity-50 px-1 bg-secondary text-white rounded-1" style={{ fontSize: 9 }}>{item.category.name}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {isParent ? (
                            <div className="text-muted" style={{ fontSize: 12 }}>{children.length} phân loại</div>
                          ) : (
                            <>
                              <div className="text-truncate" style={{ fontSize: 12, color: "var(--foreground)" }}>{item.model || "-"}</div>
                              <div className="text-truncate mt-1" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{item.color || "-"} {item.version ? \`(\${item.version})\` : ""}</div>
                            </>
                          )}
                        </td>
                        <td className="text-center" style={{ fontSize: 13 }}>{item.donVi || "-"}</td>
                        <td className="text-end fw-bold" style={{ fontSize: 13, color: item.soLuong <= (item.soLuongMin || 0) ? "var(--danger)" : "var(--foreground)" }}>
                          {item.soLuong.toLocaleString()}
                        </td>
                        <td className="text-center">
                          <span className={\`badge \${item.soLuong > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"} rounded-pill fw-normal\`} style={{ fontSize: 11 }}>
                            {item.soLuong > 0 ? "Còn hàng" : "Hết hàng"}
                          </span>
                        </td>
                        {hideActions ? null : (
                          <td className="pe-4 text-end" onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex align-items-center justify-content-end gap-2">
                              {isParent ? (
                                <button 
                                  className="btn btn-sm btn-light p-0" 
                                  style={{ width: 28, height: 28, borderRadius: 6 }}
                                  onClick={(e) => toggleExpand(e, item.id)}
                                >
                                  <i className={\`bi \${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}\`} style={{ fontSize: 13 }} />
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-light p-0" 
                                  style={{ width: 28, height: 28, borderRadius: 6 }}
                                  onClick={() => setSelectedItem(item)}
                                  title="Chi tiết"
                                >
                                  <i className="bi bi-eye" style={{ fontSize: 13 }} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                      
                      {/* Render Children */}
                      {isParent && isExpanded && children.map(child => (
                        <tr 
                          key={child.id} 
                          style={{ height: 44, cursor: "pointer", background: "rgba(0,0,0,0.02)" }}
                          onClick={() => setSelectedItem(child)}
                        >
                          <td className="ps-4" onClick={(e) => e.stopPropagation()} style={{ width: 40 }}>
                            <div style={{ width: 2, height: 44, background: "var(--primary)", position: "absolute", left: 0, marginTop: -6 }} />
                            <input 
                              type="checkbox" 
                              className="form-check-input shadow-none ms-3"
                              checked={selectedIds.includes(child.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, child.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== child.id));
                                }
                              }}
                            />
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-3 ms-4">
                              <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                {child.imageUrl ? (
                                  <img src={child.imageUrl} alt={child.tenHang} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <i className="bi bi-box-seam text-muted" style={{ fontSize: 16 }} />
                                )}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="text-truncate" style={{ fontSize: 12, color: "var(--foreground)", maxWidth: 280 }} title={child.tenHang}>
                                  {child.tenHang}
                                </div>
                                <div className="text-truncate mt-1" style={{ fontSize: 11, color: "var(--muted-foreground)", maxWidth: 280 }} title={child.code || ""}>
                                  {child.code || "No SKU"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="text-truncate" style={{ fontSize: 12, color: "var(--foreground)" }}>{child.model || "-"}</div>
                            <div className="text-truncate mt-1 fw-bold" style={{ fontSize: 11, color: "var(--primary)" }}>{child.color || "-"}</div>
                          </td>
                          <td className="text-center" style={{ fontSize: 13 }}>{child.donVi || "-"}</td>
                          <td className="text-end fw-bold" style={{ fontSize: 13, color: child.soLuong <= (child.soLuongMin || 0) ? "var(--danger)" : "var(--foreground)" }}>
                            {child.soLuong.toLocaleString()}
                          </td>
                          <td className="text-center">
                            <span className={\`badge \${child.soLuong > 0 ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"} rounded-pill fw-normal\`} style={{ fontSize: 11 }}>
                              {child.soLuong > 0 ? "Còn hàng" : "Hết hàng"}
                            </span>
                          </td>
                          {hideActions ? null : (
                            <td className="pe-4 text-end" onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="btn btn-sm btn-light p-0" 
                                style={{ width: 28, height: 28, borderRadius: 6 }}
                                onClick={() => setSelectedItem(child)}
                                title="Chi tiết"
                              >
                                <i className="bi bi-eye" style={{ fontSize: 13 }} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                }))`;

if (content.includes("items.map(item => (")) {
  content = content.replace(renderTarget, replacement);
  fs.writeFileSync('src/components/logistics/inventory/LogisticsInventory.tsx', content);
  console.log('Patched LogisticsInventory successfully!');
} else {
  console.log('Target content not found in LogisticsInventory!');
}
