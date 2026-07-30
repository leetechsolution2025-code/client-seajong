import fs from 'fs';

let content = fs.readFileSync('src/app/(dashboard)/qa/inspections/page.tsx', 'utf8');

// I will just use string replacement on the exact chunks for IQC modal.
const iqcModalStart = `      {showIqcModal && selectedInspection && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-fullscreen">
              <div className="modal-content bg-light">
                <div className="modal-header border-bottom bg-white px-4 py-3">
                  <h5 className="modal-title fw-bold">Biên bản đánh giá chất lượng (IQC)</h5>
                  <button type="button" className="btn-close" onClick={() => setShowIqcModal(false)}></button>
                </div>
                <div className="modal-body p-0 d-flex flex-column flex-xl-row" style={{ backgroundColor: "#e9ecef" }}>
                  
                  {/* Left Panel */}
                  <div className="bg-white border-end p-4 custom-scrollbar flex-shrink-0" style={{ width: "380px", overflowY: "auto" }}>
                    <h6 className="fw-bold mb-4">THÔNG TIN BIÊN BẢN</h6>`;

const iqcModalMiddle1 = `                  </div>

                  {/* Right Panel - A4 Preview */}
                  <div className="flex-grow-1 p-4 p-md-5 custom-scrollbar" style={{ overflowY: "auto" }}>
                    <div 
                      className="bg-white shadow border mx-auto position-relative" 
                      id="iqc-print-doc"
                      style={{ 
                        width: "21cm", 
                        minHeight: "29.7cm", 
                        padding: "1.5cm 2cm",
                        color: "black",
                        fontFamily: "'Roboto Condensed', sans-serif" 
                      }}
                    >`;

const iqcModalEnd = `                  </div>
                </div>
              </div>
              <div className="modal-footer bg-white border-top p-3 d-flex justify-content-end gap-2">
                 <button className="btn btn-light border px-4" onClick={() => { setShowIqcModal(false); setSelectedInspection(null); }}>Hủy</button>
                 <button className="btn btn-primary px-4"><i className="bi bi-printer me-2"></i>In biên bản</button>
                 <button className="btn btn-success px-4" onClick={() => { setShowIqcModal(false); setSelectedInspection(null); }}><i className="bi bi-floppy me-2"></i>Lưu kết quả</button>
              </div>
            </div>
          </div>
        </>
      )}`;

// We need to be careful with the text inside. I will just use ID to print!
// Wait! If I just add id="iqc-print-doc" to the A4 page and change the print button to use printDocumentById("iqc-print-doc")?
// The user said: "Khi nhấn In biên bản, gọi PrintPreviewModal để hỗ trợ người dùng in biên và xuất PDF biên bản"
// Wait! Does PrintPreviewModal HAVE to replace the whole modal?
// Or can I just use the PrintPreviewModal when they click Print? 
// No, the PrintPreviewModal component wraps the document and adds print capabilities. 
// Other pages use PrintPreviewModal AS the main modal when previewing!

