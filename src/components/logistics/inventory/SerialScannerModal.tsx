"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface SerialScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function SerialScannerModal({ isOpen, onClose, onScanSuccess }: SerialScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Đợi modal render xong mới khởi tạo scanner
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            "reader",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8
              ]
            },
            /* verbose= */ false
          );

          scanner.render(
            (decodedText) => {
              // Thành công
              scanner.clear().then(() => {
                onScanSuccess(decodedText);
                onClose();
              }).catch(err => {
                console.error("Clear scanner error:", err);
                onScanSuccess(decodedText);
                onClose();
              });
            },
            (errorMessage) => {
              // Lỗi quét (thường là do không thấy mã, bỏ qua để quét tiếp)
            }
          );
          scannerRef.current = scanner;
        } catch (err: any) {
          setError("Không thể truy cập Camera. Vui lòng kiểm tra quyền trình duyệt.");
          console.error("Scanner init error:", err);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 20, overflow: "hidden" }}>
          <div className="modal-header border-0 bg-primary text-white p-4">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-camera-fill" />
              Quét mã bằng Camera
            </h5>
            <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4 text-center">
            {error ? (
              <div className="alert alert-danger border-0 rounded-4">
                <i className="bi bi-exclamation-triangle-fill me-2" />
                {error}
              </div>
            ) : (
              <div className="bg-light rounded-4 p-3 border border-dashed mb-3" style={{ minHeight: "300px" }}>
                <div id="reader" style={{ width: "100%", borderRadius: "12px", overflow: "hidden" }}></div>
                <div className="mt-3 text-muted" style={{ fontSize: 12 }}>
                  <i className="bi bi-info-circle me-1" />
                  Đưa mã QR hoặc Barcode vào khung ngắm để tự động nhận diện
                </div>
              </div>
            )}
            
            <div className="p-3 bg-primary-subtle rounded-4 text-start">
              <div className="fw-bold text-primary small mb-1">Mẹo nhỏ:</div>
              <ul className="small text-primary-emphasis mb-0 ps-3">
                <li>Giữ điện thoại/mã vạch ổn định, không bị rung.</li>
                <li>Đảm bảo đủ ánh sáng để camera lấy nét tốt nhất.</li>
                <li>Hệ thống hỗ trợ cả mã QR và mã vạch (Barcode) 1D.</li>
              </ul>
            </div>
          </div>
          <div className="modal-footer border-0 p-4 pt-0">
            <button type="button" className="btn btn-light rounded-pill px-4 fw-bold w-100" onClick={onClose}>
              Đóng lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
