"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface TaxPolicyOffcanvasProps {
  show: boolean;
  onHide: () => void;
  title: string;
  url: string;
}

export function TaxPolicyOffcanvas({ show, onHide, title, url }: TaxPolicyOffcanvasProps) {
  const [summary, setSummary] = useState<string>("");
  const [fileLink, setFileLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (show && url) {
      setLoading(true);
      setError(null);
      setSummary("");
      setFileLink(null);
      setSaved(false);

      fetch(`/api/finance/tax/summarize?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error);
          } else {
            setSummary(data.summary);
            setFileLink(data.fileLink);
          }
        })
        .catch(err => {
          setError(String(err));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [show, url]);

  const handleSaveDocument = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/finance/tax/save-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileLink, title, summary })
      });
      if (res.ok) {
        setSaved(true);
      } else {
        const data = await res.json();
        alert("Lỗi lưu tài liệu: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Lỗi lưu tài liệu: " + String(e));
    } finally {
      setSaving(false);
    }
  };

  // Using Bootstrap Offcanvas classes structure manually
  return (
    <>
      {/* Backdrop */}
      {show && (
        <div 
          className="offcanvas-backdrop fade show" 
          onClick={onHide}
          style={{ zIndex: 1040 }}
        ></div>
      )}

      {/* Offcanvas Panel */}
      <div 
        className={`offcanvas offcanvas-end ${show ? "show" : ""}`} 
        tabIndex={-1} 
        style={{ width: '400px', visibility: show ? 'visible' : 'hidden', zIndex: 1045, display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', right: 0, top: 0, backgroundColor: '#fff', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)', transition: 'transform 0.3s ease-in-out', transform: show ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="offcanvas-header border-bottom bg-light">
          <h5 className="offcanvas-title fw-bold text-primary">Tóm tắt văn bản</h5>
          <button type="button" className="btn-close text-reset" onClick={onHide} aria-label="Close"></button>
        </div>

        <div className="offcanvas-body" style={{ overflowY: 'auto', flex: 1, padding: '1.5rem', whiteSpace: 'normal', wordWrap: 'break-word' }}>
          <div className="mb-4">
            <h6 className="fw-bold text-dark lh-base">{title}</h6>
          </div>

          {loading && (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <h6 className="fw-bold text-primary animate-pulse">🤖 Trợ lý AI đang đọc và phân tích...</h6>
              <p className="text-muted small">Quá trình này có thể mất vài giây tùy vào độ dài của văn bản.</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger rounded-3">
              <i className="bi bi-exclamation-triangle me-2"></i> Lỗi: {error}
            </div>
          )}

          {!loading && summary && (
            <div className="ai-summary-content">
              <div className="p-3 border border-secondary border-opacity-25 rounded-3 mb-4 shadow-sm" style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                <style>{`
                  .ai-summary-content p, .ai-summary-content ul, .ai-summary-content ol {
                    margin-bottom: 0.5rem;
                  }
                  .ai-summary-content h1, .ai-summary-content h2, .ai-summary-content h3, .ai-summary-content h4 {
                    font-size: 1rem;
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                    font-weight: bold;
                  }
                  .ai-summary-content li {
                    margin-bottom: 0.25rem;
                  }
                `}</style>
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {!loading && (
          <div className="offcanvas-footer border-top p-3 bg-white d-flex gap-2 shadow-sm" style={{ zIndex: 10 }}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-secondary flex-fill fw-medium">
              <i className="bi bi-box-arrow-up-right me-1"></i> Trang gốc
            </a>
            {fileLink && (
              <a href={fileLink} target="_blank" rel="noopener noreferrer" className="btn btn-success flex-fill fw-medium">
                <i className="bi bi-file-earmark-pdf me-1"></i> File gốc
              </a>
            )}
            <button 
              onClick={handleSaveDocument} 
              disabled={saving || saved || !summary}
              className={`btn flex-fill fw-medium ${saved ? 'btn-outline-primary' : 'btn-primary'}`}
            >
              {saving ? (
                <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Đang tải...</>
              ) : saved ? (
                <><i className="bi bi-check-circle-fill me-1"></i> Đã tải</>
              ) : (
                <><i className="bi bi-download me-1"></i> Tải văn bản</>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
