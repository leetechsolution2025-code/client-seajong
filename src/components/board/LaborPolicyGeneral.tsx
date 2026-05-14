"use client";

import React, { useState, useEffect } from "react";
import { BrandButton } from "@/components/ui/BrandButton";

interface Props {
  type: string;
  policy: any;
  onSave: (content: string, title?: string) => void;
}

export function LaborPolicyGeneral({ type, policy, onSave }: Props) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (policy) {
      setContent(policy.content || "");
      setTitle(policy.title || "");
    } else {
      setContent("");
      setTitle("");
    }
  }, [policy]);

  return (
    <div className="card border-0 shadow-sm rounded-4 p-4">
      <div className="mb-4">
        <label className="form-label fw-bold small text-uppercase text-muted">Tiêu đề quy định</label>
        <input
          type="text"
          className="form-control form-control-lg border-0 bg-light rounded-3"
          placeholder="Ví dụ: Quy chế làm việc 2024"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-bold small text-uppercase text-muted">Nội dung quy định</label>
        <textarea
          className="form-control border-0 bg-light rounded-3"
          rows={15}
          placeholder="Nhập nội dung quy định chi tiết tại đây..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{ resize: "none" }}
        />
      </div>

      <div className="d-flex justify-content-end">
        <BrandButton onClick={() => onSave(content, title)}>
          Lưu thay đổi
        </BrandButton>
      </div>
    </div>
  );
}
