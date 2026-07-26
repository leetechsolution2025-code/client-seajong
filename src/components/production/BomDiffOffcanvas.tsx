import React, { useMemo } from 'react';

export default function BomDiffOffcanvas({
  show,
  onClose,
  bomData,
  standardBomData,
  productName
}: {
  show: boolean;
  onClose: () => void;
  bomData: any;
  standardBomData: any;
  productName: string;
}) {
  const diffs = useMemo(() => {
    if (!bomData || !standardBomData) return [];
    
    const results: any[] = [];
    const standardVatTu = standardBomData.vatTu || [];
    const currentVatTu = bomData.vatTu || [];

    const stdMatched = new Set();
    const curMatched = new Set();

    // 1. First pass: Exact matches or quantity changes
    currentVatTu.forEach((v: any, curIdx: number) => {
      const key = v.material?.code || v.maVatTu;
      const stdIdx = standardVatTu.findIndex((sv: any, i: number) => 
        !stdMatched.has(i) && (sv.material?.code || sv.maVatTu) === key
      );
      
      if (stdIdx !== -1) {
        stdMatched.add(stdIdx);
        curMatched.add(curIdx);
        
        const stdV = standardVatTu[stdIdx];
        if (stdV.soLuong !== v.soLuong) {
          results.push({
            type: 'modified',
            key,
            name: v.material?.tenHang || v.material?.name || v.tenVatTu,
            oldQty: stdV.soLuong,
            newQty: v.soLuong,
            unit: v.donViTinh || v.material?.donVi || v.material?.unit
          });
        }
      }
    });

    // 2. Second pass: Swaps (Thay thế)
    currentVatTu.forEach((v: any, curIdx: number) => {
      if (!curMatched.has(curIdx)) {
        if (!stdMatched.has(curIdx) && curIdx < standardVatTu.length) {
          const stdV = standardVatTu[curIdx];
          stdMatched.add(curIdx);
          curMatched.add(curIdx);
          
          results.push({
            type: 'swapped',
            oldKey: stdV.material?.code || stdV.maVatTu,
            oldName: stdV.material?.tenHang || stdV.material?.name || stdV.tenVatTu,
            oldQty: stdV.soLuong,
            oldUnit: stdV.donViTinh || stdV.material?.donVi || stdV.material?.unit,
            newKey: v.material?.code || v.maVatTu,
            newName: v.material?.tenHang || v.material?.name || v.tenVatTu,
            newQty: v.soLuong,
            newUnit: v.donViTinh || v.material?.donVi || v.material?.unit
          });
        }
      }
    });

    // 3. Third pass: Remaining are Added and Removed
    currentVatTu.forEach((v: any, curIdx: number) => {
      if (!curMatched.has(curIdx)) {
        const key = v.material?.code || v.maVatTu;
        results.push({
          type: 'added',
          key,
          name: v.material?.tenHang || v.material?.name || v.tenVatTu,
          newQty: v.soLuong,
          unit: v.donViTinh || v.material?.donVi || v.material?.unit
        });
      }
    });

    standardVatTu.forEach((stdV: any, stdIdx: number) => {
      if (!stdMatched.has(stdIdx)) {
        const key = stdV.material?.code || stdV.maVatTu;
        results.push({
          type: 'removed',
          key,
          name: stdV.material?.tenHang || stdV.material?.name || stdV.tenVatTu,
          oldQty: stdV.soLuong,
          unit: stdV.donViTinh || stdV.material?.donVi || stdV.material?.unit
        });
      }
    });

    return results;
  }, [bomData, standardBomData]);

  return (
    <>
      {show && <div className="offcanvas-backdrop fade show" onClick={onClose}></div>}
      <div className={`offcanvas offcanvas-end ${show ? 'show' : ''}`} tabIndex={-1} style={{ width: '400px' }}>
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold">Đối soát biến thể</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>
        <div className="offcanvas-body p-0">
          <div className="p-3 bg-light border-bottom">
            <div className="small text-muted mb-1">So sánh với tiêu chuẩn:</div>
            <div className="fw-semibold">{productName}</div>
          </div>
          
          <div className="p-3">
            {diffs.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="bi bi-check-circle display-4 text-success mb-3"></i>
                <h6>Biến thể giống hệt tiêu chuẩn</h6>
                <p className="small">Không có sự thay đổi vật tư nào.</p>
              </div>
            ) : (
              <ul className="list-group list-group-flush border rounded-3">
                {diffs.map((d, i) => {
                  if (d.type === 'swapped') {
                    return (
                      <li key={i} className="list-group-item d-flex flex-column p-3 bg-info bg-opacity-10 border-info border-opacity-25">
                        <div className="d-flex align-items-center mb-2">
                          <i className="bi bi-arrow-left-right text-info-emphasis me-2"></i>
                          <span className="fw-bold text-info-emphasis">Thay thế vật tư</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="text-muted text-decoration-line-through" style={{ width: '45%' }}>
                            <div className="small fw-medium">{d.oldName}</div>
                            <div className="small" style={{ fontSize: '0.7rem' }}>Mã: {d.oldKey}</div>
                            <div className="small mt-1">{d.oldQty} {d.oldUnit}</div>
                          </div>
                          <i className="bi bi-arrow-right text-info-emphasis fs-5 mx-1"></i>
                          <div className="text-dark text-end" style={{ width: '45%' }}>
                            <div className="small fw-bold">{d.newName}</div>
                            <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Mã: {d.newKey}</div>
                            <div className="small fw-bold mt-1 text-info-emphasis">{d.newQty} {d.newUnit}</div>
                          </div>
                        </div>
                      </li>
                    );
                  }
                  
                  return (
                    <li key={i} className="list-group-item d-flex align-items-center justify-content-between p-3">
                      <div>
                        <div className="fw-medium text-dark">{d.name}</div>
                        <div className="small text-muted">Mã: {d.key}</div>
                      </div>
                      
                      {d.type === 'added' && (
                        <div className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 p-2 d-flex flex-column align-items-end">
                          <span className="mb-1"><i className="bi bi-plus-circle me-1"></i>Thêm mới</span>
                          <strong className="fs-6">{d.newQty} {d.unit}</strong>
                        </div>
                      )}
                      
                      {d.type === 'removed' && (
                        <div className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 p-2 d-flex flex-column align-items-end">
                          <span className="mb-1"><i className="bi bi-dash-circle me-1"></i>Bị xoá</span>
                          <strong className="fs-6 text-decoration-line-through">{d.oldQty} {d.unit}</strong>
                        </div>
                      )}
                      
                      {d.type === 'modified' && (
                        <div className="badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-25 p-2 d-flex flex-column align-items-end">
                          <span className="mb-1 text-warning-emphasis"><i className="bi bi-arrow-left-right me-1"></i>Đổi SL</span>
                          <div className="d-flex align-items-center gap-2">
                            <span className="text-decoration-line-through text-muted">{d.oldQty}</span>
                            <i className="bi bi-arrow-right text-warning-emphasis"></i>
                            <strong className="fs-6">{d.newQty} {d.unit}</strong>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
