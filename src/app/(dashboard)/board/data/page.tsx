"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BrandButton } from "@/components/ui/BrandButton";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog, ConfirmDialogVariant } from "@/components/ui/ConfirmDialog";

type BackupFile = {
  name: string;
  size: string;
  createdAt: string;
};

export default function DataManagementPage() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { success, error } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: React.ReactNode;
    variant: ConfirmDialogVariant;
    onConfirm: () => void;
  }>({
    title: "",
    message: "",
    variant: "info",
    onConfirm: () => {}
  });

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/board/data");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      } else {
        error("Lỗi", "Không thể lấy danh sách sao lưu");
      }
    } catch (e) {
      error("Lỗi", "Đã xảy ra lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackupClick = () => {
    setConfirmConfig({
      title: "Xác nhận sao lưu",
      message: "Bạn có chắc chắn muốn tạo một bản sao lưu mới ngay bây giờ không?",
      variant: "info",
      onConfirm: executeCreateBackup
    });
    setConfirmOpen(true);
  };

  const executeCreateBackup = async () => {
    setConfirmOpen(false);
    try {
      setCreating(true);
      const res = await fetch("/api/board/data", { method: "POST" });
      if (res.ok) {
        success("Thành công", "Đã tạo bản sao lưu dữ liệu mới");
        fetchBackups();
      } else {
        const data = await res.json();
        error("Lỗi", data.error || "Không thể tạo bản sao lưu");
      }
    } catch (e) {
      error("Lỗi", "Đã xảy ra lỗi hệ thống");
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreClick = (filename: string) => {
    setConfirmConfig({
      title: "Xác nhận phục hồi nguy hiểm",
      message: (
        <div>
          <p className="mb-2 fw-bold text-danger">CẢNH BÁO ĐỎ: Hành động này sẽ thay thế TOÀN BỘ dữ liệu hiện tại!</p>
          <p className="mb-0">Hệ thống sẽ quay về mốc thời gian của bản sao lưu <b>{filename}</b>. Mọi dữ liệu tạo ra từ thời điểm đó đến nay sẽ <b>BIẾN MẤT</b>.</p>
          <p className="mt-2 mb-0 fw-medium">Bạn có CHẮC CHẮN muốn tiếp tục không?</p>
        </div>
      ),
      variant: "danger",
      onConfirm: () => executeRestore(filename)
    });
    setConfirmOpen(true);
  };

  const executeRestore = async (filename: string) => {
    setConfirmOpen(false);
    try {
      setCreating(true); // Re-use the loading overlay/state
      const res = await fetch(`/api/board/data`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      });
      if (res.ok) {
        success("Phục hồi thành công", "Hệ thống đang khởi động lại. Vui lòng chờ vài giây...");
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        const data = await res.json();
        error("Lỗi", data.error || "Không thể phục hồi bản sao lưu");
        setCreating(false);
      }
    } catch (e) {
      error("Lỗi", "Đã xảy ra lỗi hệ thống");
      setCreating(false);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".db")) {
      error("Lỗi", "Chỉ hỗ trợ file cơ sở dữ liệu có đuôi .db");
      return;
    }

    setConfirmConfig({
      title: "Xác nhận phục hồi nguy hiểm từ File",
      message: (
        <div>
          <p className="mb-2 fw-bold text-danger">CẢNH BÁO ĐỎ: Hành động này sẽ thay thế TOÀN BỘ dữ liệu hiện tại!</p>
          <p className="mb-0">Bạn đang tải lên file <b>{file.name}</b>. Hệ thống sẽ thay thế dữ liệu bằng file này.</p>
          <p className="mt-2 mb-0 fw-medium">Bạn có CHẮC CHẮN muốn tiếp tục không?</p>
        </div>
      ),
      variant: "danger",
      onConfirm: () => executeUploadAndRestore(file)
    });
    setConfirmOpen(true);
    
    // Clear input so the same file can be selected again if needed
    e.target.value = '';
  };

  const executeUploadAndRestore = async (file: File) => {
    setConfirmOpen(false);
    try {
      setCreating(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/board/data/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        success("Tải lên & Phục hồi thành công", "Hệ thống đang khởi động lại. Vui lòng chờ vài giây...");
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        const data = await res.json();
        error("Lỗi", data.error || "Không thể tải lên bản sao lưu");
        setCreating(false);
      }
    } catch (e) {
      error("Lỗi", "Đã xảy ra lỗi hệ thống");
      setCreating(false);
    }
  };

  const handleDeleteClick = (filename: string) => {
    setConfirmConfig({
      title: "Xác nhận xóa",
      message: `Bạn có chắc chắn muốn xóa bản sao lưu ${filename}? Hành động này không thể hoàn tác.`,
      variant: "danger",
      onConfirm: () => executeDelete(filename)
    });
    setConfirmOpen(true);
  };

  const executeDelete = async (filename: string) => {
    setConfirmOpen(false);
    try {
      const res = await fetch(`/api/board/data?filename=${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (res.ok) {
        success("Thành công", `Đã xóa bản sao lưu ${filename}`);
        setBackups(prev => prev.filter(b => b.name !== filename));
      } else {
        error("Lỗi", "Không thể xóa bản sao lưu");
      }
    } catch (e) {
      error("Lỗi", "Đã xảy ra lỗi hệ thống");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      <PageHeader
        title="Quản trị dữ liệu"
        description="Quản lý và tạo các bản sao lưu an toàn cho cơ sở dữ liệu hệ thống"
        color="indigo"
        icon="bi-database-lock"
      />

      <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          
          <div className="d-flex justify-content-between align-items-center bg-white p-4 rounded-4 shadow-sm border border-light">
            <div>
              <h6 className="fw-bold mb-1">Sao lưu cơ sở dữ liệu</h6>
              <p className="text-muted small mb-0">Hệ thống sẽ sao chép toàn bộ dữ liệu hiện tại thành một file bảo mật.</p>
            </div>
            <div className="d-flex gap-2">
              <input
                type="file"
                accept=".db"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <BrandButton onClick={handleUploadClick} disabled={creating} icon="bi-cloud-upload" style={{ minWidth: 150 }} variant="outline">
                Tải lên & Phục hồi
              </BrandButton>
              <BrandButton onClick={handleCreateBackupClick} loading={creating} disabled={creating} icon="bi-cloud-arrow-up" style={{ minWidth: 180 }}>
                Tạo bản sao lưu ngay
              </BrandButton>
            </div>
          </div>

          <div className="bg-white rounded-4 shadow-sm border border-light overflow-hidden">
            <div className="px-4 py-3 border-bottom bg-light">
              <h6 className="fw-bold mb-0">Danh sách bản sao lưu ({backups.length})</h6>
            </div>
            <Table
              rows={backups}
              loading={loading}
              columns={[
                {
                  header: "Tên file backup",
                  render: (item: BackupFile) => {
                    const isAuto = item.name.startsWith("auto_");
                    const isManual = item.name.startsWith("manual_") || item.name.startsWith("prod_");
                    
                    return (
                      <div className="d-flex align-items-center gap-3">
                        <i className="bi bi-file-earmark-zip text-primary" style={{ fontSize: 24 }}></i>
                        <div>
                          <div className="fw-bold text-dark">{item.name}</div>
                          <div className="mt-1">
                            {isAuto ? (
                              <span className="badge bg-primary text-white" style={{ fontSize: 11 }}>
                                <i className="bi bi-robot me-1"></i> Sao lưu tự động
                              </span>
                            ) : (
                              <span className="badge bg-light text-secondary border" style={{ fontSize: 11 }}>
                                <i className="bi bi-person-fill me-1"></i> Sao lưu thủ công
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                },
                {
                  header: "Dung lượng",
                  render: (item: BackupFile) => <span className="badge bg-secondary">{item.size}</span>
                },
                {
                  header: "Ngày tạo",
                  render: (item: BackupFile) => new Date(item.createdAt).toLocaleString("vi-VN")
                },
                {
                  header: "",
                  render: (item: BackupFile) => (
                    <div className="d-flex justify-content-end gap-2">
                      <a
                        href={`/api/board/data?download=${encodeURIComponent(item.name)}`}
                        download={item.name}
                        className="btn btn-sm btn-outline-primary"
                        title="Tải về máy"
                      >
                        <i className="bi bi-download"></i>
                      </a>
                      <button
                        className="btn btn-sm btn-outline-warning"
                        onClick={() => handleRestoreClick(item.name)}
                        title="Phục hồi dữ liệu"
                      >
                        <i className="bi bi-clock-history"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteClick(item.name)}
                        title="Xóa bản sao lưu"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  )
                }
              ]}
              emptyText="Chưa có bản sao lưu nào được tạo."
            />
          </div>
          
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
