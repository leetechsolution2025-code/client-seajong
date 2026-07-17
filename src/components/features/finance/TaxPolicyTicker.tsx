"use client";

import React, { useEffect, useState } from "react";
import "./TaxPolicyTicker.css";
import { TaxPolicyOffcanvas } from "./TaxPolicyOffcanvas";

interface TickerItem {
  text: string;
  link: string;
  title: string;
}

export function TaxPolicyTicker() {
  const [news, setNews] = useState<TickerItem[]>([]);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ title: string, url: string } | null>(null);

  useEffect(() => {
    fetch("/api/finance/tax/ticker")
      .then(res => res.json())
      .then(json => {
        if (json.data && json.data.length > 0) {
          setNews(json.data);
        }
      })
      .catch(err => console.error("Error fetching tax ticker:", err));
  }, []);
  return (
    <div className="tax-ticker-container bg-warning bg-opacity-10 border-bottom border-warning px-3 py-2 d-flex align-items-center">
      <div className="d-flex align-items-center me-3 text-warning fw-bold text-nowrap flex-shrink-0" style={{ fontSize: '0.875rem' }}>
        <i className="bi bi-megaphone-fill me-2"></i>
        CHÍNH SÁCH THUẾ:
      </div>
      <div className="tax-ticker-scroll-wrapper flex-grow-1 overflow-hidden" style={{ fontSize: '0.875rem' }}>
        <div className="tax-ticker-content text-dark">
          {news.length > 0 ? (
            news.map((item, idx) => (
              <span 
                key={idx} 
                className="me-5 text-dark"
                style={{ cursor: item.link ? 'pointer' : 'default' }}
                onClick={() => {
                  if (item.link) {
                    setSelectedItem({ title: item.title, url: item.link });
                    setShowOffcanvas(true);
                  }
                }}
                title={item.link ? "Nhấn để AI tóm tắt chi tiết" : ""}
              >
                {item.text}
              </span>
            ))
          ) : (
            <span className="me-5">Đang cập nhật dữ liệu...</span>
          )}
        </div>
      </div>

      <TaxPolicyOffcanvas 
        show={showOffcanvas} 
        onHide={() => setShowOffcanvas(false)} 
        title={selectedItem?.title || ""} 
        url={selectedItem?.url || ""} 
      />
    </div>
  );
}
