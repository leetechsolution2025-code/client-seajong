"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

interface OrderCameraScannerModalProps {
  open: boolean;
  onClose: () => void;
  onOrderScanned: (orderData: {
    customer: any;
    items: any[];
    ghiChu: string;
  }) => void;
}

export function OrderCameraScannerModal({
  open,
  onClose,
  onOrderScanned,
}: OrderCameraScannerModalProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dừng stream camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Khởi động camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Trình duyệt không hỗ trợ truy cập Camera trực tiếp. Vui lòng chuyển sang tab 'Tải ảnh / Dán ảnh'!");
      setActiveTab("upload");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("[Camera Error]:", err);
      let msg = "Không thể mở camera thiết bị.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Quyền truy cập Camera bị từ chối. Vui lòng cho phép quyền Camera trên trình duyệt hoặc tải ảnh lên.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Không tìm thấy thiết bị Camera trên máy này.";
      }
      setCameraError(msg);
      setActiveTab("upload");
    }
  }, [facingMode, stopCamera]);

  // Quản lý bật/tắt camera khi mở modal
  useEffect(() => {
    if (open) {
      setCapturedImage(null);
      if (activeTab === "camera") {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, activeTab, startCamera, stopCamera]);

  // Hỗ trợ sự kiện dán ảnh từ Clipboard (Ctrl + V)
  useEffect(() => {
    if (!open) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              setCapturedImage(base64);
              setActiveTab("upload");
              stopCamera();
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open, stopCamera]);

  // Chụp ảnh từ Live Video
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Chọn ảnh từ tệp tin hoặc camera điện thoại
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCapturedImage(base64);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Đổi camera Trước / Sau
  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Gửi ảnh tới AI để phân tích và lập đơn hàng
  const handleScanAndCreateOrder = async () => {
    if (!capturedImage) return;

    setLoading(true);
    setLoadingStep("AI đang phân tích hình ảnh và trích xuất mã sản phẩm...");

    try {
      const res = await fetch("/api/sales/ai-scan-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: capturedImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể phân tích đơn hàng từ hình ảnh");
      }

      setLoadingStep("Đối soát kho hàng và tạo phom đơn hàng...");
      toastSuccess(
        "Quét đơn thành công",
        `Đã nhận diện khách hàng "${data.customer?.name}" và ${data.items?.length || 0} mặt hàng.`
      );

      // Chuyển dữ liệu sang hàm callback lập đơn hàng
      onOrderScanned({
        customer: data.customer,
        items: data.items,
        ghiChu: data.ghiChu,
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      toastError("Lỗi quét đơn", err.message || "Không thể quét thông tin đơn hàng");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1060, backdropFilter: "blur(2px)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
          {/* Header */}
          <div
            className="modal-header border-bottom py-3 px-4 text-white d-flex align-items-center justify-content-between"
            style={{
              background: "linear-gradient(135deg, #003087 0%, #0056b3 100%)",
            }}
          >
            <div className="d-flex align-items-center" style={{ gap: "12px" }}>
              <div
                className="rounded-circle bg-white d-flex align-items-center justify-content-center shadow-sm"
                style={{ width: 38, height: 38, minWidth: 38, color: "#003087" }}
              >
                <i className="bi bi-camera-fill fs-5" />
              </div>
              <div>
                <h6 className="modal-title fw-bold mb-0 fs-6 text-white">
                  Quét Đơn Hàng Bằng Camera AI
                </h6>
                <p className="mb-0 text-white-50" style={{ fontSize: "11.5px" }}>
                  Chụp tin nhắn Zalo, sổ tay hoặc hoá đơn để AI tự động lập đơn hàng
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white shadow-none"
              onClick={onClose}
              disabled={loading}
            />
          </div>

          {/* Body */}
          <div className="modal-body p-3 p-md-4 bg-light">
            {/* Nav Tabs */}
            <div className="d-flex align-items-center justify-content-between mb-3 bg-white p-1 rounded-3 border">
              <div className="nav nav-pills gap-2 flex-grow-1">
                <button
                  type="button"
                  className={`btn btn-sm ${
                    activeTab === "camera"
                      ? "btn-primary fw-bold text-white shadow-sm"
                      : "btn-light text-muted"
                  } px-3 rounded-2 flex-grow-1 d-flex align-items-center justify-content-center`}
                  style={{
                    backgroundColor: activeTab === "camera" ? "#003087" : undefined,
                    borderColor: activeTab === "camera" ? "#003087" : undefined,
                    gap: "8px",
                    height: 38,
                  }}
                  onClick={() => {
                    setActiveTab("camera");
                    setCapturedImage(null);
                  }}
                  disabled={loading}
                >
                  <i className="bi bi-camera-video-fill fs-6" />
                  <span>Camera trực tiếp</span>
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    activeTab === "upload"
                      ? "btn-primary fw-bold text-white shadow-sm"
                      : "btn-light text-muted"
                  } px-3 rounded-2 flex-grow-1 d-flex align-items-center justify-content-center`}
                  style={{
                    backgroundColor: activeTab === "upload" ? "#003087" : undefined,
                    borderColor: activeTab === "upload" ? "#003087" : undefined,
                    gap: "8px",
                    height: 38,
                  }}
                  onClick={() => {
                    setActiveTab("upload");
                    stopCamera();
                  }}
                  disabled={loading}
                >
                  <i className="bi bi-image fs-6" />
                  <span>Tải ảnh / Dán ảnh (Ctrl+V)</span>
                </button>
              </div>
            </div>

            {/* Viewport Khung chụp / Xem trước */}
            <div
              className="position-relative bg-dark rounded-4 overflow-hidden d-flex align-items-center justify-content-center shadow-inner"
              style={{
                height: 380,
                border: "2px solid #cbd5e1",
              }}
            >
              {capturedImage ? (
                /* Ảnh đã chụp hoặc tải lên */
                <div className="w-100 h-100 position-relative d-flex align-items-center justify-content-center bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedImage}
                    alt="Captured order"
                    className="img-fluid"
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                  />
                  <div
                    className="position-absolute top-0 start-0 m-3 badge bg-success bg-opacity-90 px-2.5 py-1.5 shadow"
                    style={{ fontSize: "12px" }}
                  >
                    <i className="bi bi-check-circle-fill me-1" /> Đã sẵn sàng phân tích
                  </div>
                </div>
              ) : activeTab === "camera" ? (
                /* Live Camera Video */
                <div className="w-100 h-100 position-relative d-flex align-items-center justify-content-center bg-black">
                  <video
                    ref={videoRef}
                    className="w-100 h-100"
                    style={{ objectFit: "cover" }}
                    playsInline
                    muted
                  />

                  {/* Khung ngắm Viewfinder */}
                  <div
                    className="position-absolute"
                    style={{
                      width: "84%",
                      height: "76%",
                      border: "2px dashed rgba(255,255,255,0.75)",
                      borderRadius: 16,
                      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      className="position-absolute top-0 start-50 translate-middle-x mt-2 badge bg-primary bg-opacity-75 text-white px-3 py-1"
                      style={{ fontSize: "11px" }}
                    >
                      Căn chỉnh văn bản / tin nhắn vào khung
                    </div>
                  </div>

                  {/* Nút lật camera */}
                  <button
                    type="button"
                    className="btn btn-sm btn-dark bg-opacity-75 text-white position-absolute top-0 end-0 m-3 rounded-circle shadow-sm"
                    style={{ width: 38, height: 38 }}
                    title="Đổi camera"
                    onClick={handleSwitchCamera}
                  >
                    <i className="bi bi-arrow-repeat fs-6" />
                  </button>
                </div>
              ) : (
                /* Vùng tải ảnh / Paste */
                <div
                  className="w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white p-4 text-center cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center mb-3"
                    style={{ width: 68, height: 68 }}
                  >
                    <i className="bi bi-cloud-arrow-up fs-2" />
                  </div>
                  <h6 className="fw-bold text-dark mb-1">
                    Nhấp để chọn ảnh hoặc dán ảnh (Ctrl + V)
                  </h6>
                  <p className="text-muted small mb-3" style={{ maxWidth: 360 }}>
                    Hỗ trợ ảnh chụp màn hình Zalo, ảnh chụp từ camera điện thoại, hoá đơn, đơn hàng viết tay
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary px-3 rounded-3 d-inline-flex align-items-center"
                    style={{ gap: "8px", height: 36 }}
                  >
                    <i className="bi bi-folder2-open fs-6" />
                    <span>Chọn tệp hình ảnh</span>
                  </button>
                </div>
              )}

              {/* Lớp phủ Loading khi AI đang quét */}
              {loading && (
                <div
                  className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white"
                  style={{ backgroundColor: "rgba(0, 48, 135, 0.85)", zIndex: 10 }}
                >
                  <div
                    className="spinner-border text-light mb-3"
                    style={{ width: "3rem", height: "3rem" }}
                    role="status"
                  />
                  <h6 className="fw-bold mb-1">AI Đang Xử Lý Đơn Hàng...</h6>
                  <p className="text-white-50 small mb-0 px-3 text-center">
                    {loadingStep}
                  </p>
                </div>
              )}
            </div>

            {/* Input file ẩn */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="d-none"
              onChange={handleFileChange}
            />

            {/* Hướng dẫn phím tắt */}
            <div className="d-flex align-items-center justify-content-between mt-2.5 px-1 text-muted" style={{ fontSize: "11.5px" }}>
              <span className="d-inline-flex align-items-center" style={{ gap: "6px" }}>
                <i className="bi bi-lightbulb-fill text-warning" />
                <span>
                  <strong>Mẹo:</strong> Bạn có thể chụp màn hình Zalo rồi bấm <strong>Ctrl + V</strong> trực tiếp để quét ngay!
                </span>
              </span>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="modal-footer border-top py-2.5 px-4 bg-white d-flex align-items-center justify-content-between">
            <button
              type="button"
              className="btn btn-sm btn-light border px-3"
              onClick={onClose}
              disabled={loading}
            >
              Đóng
            </button>

            <div className="d-flex align-items-center" style={{ gap: "10px" }}>
              {capturedImage ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3 d-inline-flex align-items-center"
                    style={{ gap: "6px", height: 36 }}
                    onClick={() => {
                      setCapturedImage(null);
                      if (activeTab === "camera") startCamera();
                    }}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-counterclockwise fs-6" />
                    <span>Chụp lại</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-success px-4 fw-bold shadow-sm d-inline-flex align-items-center"
                    style={{ gap: "8px", height: 36 }}
                    onClick={handleScanAndCreateOrder}
                    disabled={loading}
                  >
                    <i className="bi bi-magic fs-6" />
                    <span>Tự Động Lập Đơn Hàng</span>
                  </button>
                </>
              ) : activeTab === "camera" ? (
                <button
                  type="button"
                  className="btn btn-sm text-white px-4 fw-bold shadow-sm d-inline-flex align-items-center"
                  style={{ backgroundColor: "#003087", borderColor: "#003087", height: 36, gap: "8px" }}
                  onClick={handleCapture}
                >
                  <i className="bi bi-camera-fill fs-6" />
                  <span>Chụp Ảnh Này</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary px-3 d-inline-flex align-items-center"
                  style={{ gap: "6px", height: 36 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="bi bi-upload fs-6" />
                  <span>Chọn ảnh khác</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
