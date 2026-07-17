"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "./DynamicTicker.css";
import { TaxPolicyOffcanvas } from "@/components/features/finance/TaxPolicyOffcanvas";

interface TickerItem {
  text: string;
  link?: string;
  title?: string;
  type: string;
}

export function DynamicTicker({ pageTitle, customNews }: { pageTitle?: string, customNews?: TickerItem[] }) {
  const pathname = usePathname();
  const [news, setNews] = useState<TickerItem[]>([]);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ title: string, url: string } | null>(null);

  // Determine module based on pathname
  let module = "general";
  let colorClass = "bg-primary bg-opacity-10 border-primary text-primary";
  let iconClass = "bi-megaphone-fill";
  let title = "THÔNG BÁO:";

  if (pathname.includes("/finance/tax")) {
    module = "tax";
    colorClass = "bg-warning bg-opacity-10 border-warning text-warning";
    title = "CHÍNH SÁCH THUẾ:";
  } else if (pathname.includes("/finance/inventory")) {
    module = "finance_inventory";
    colorClass = "bg-warning bg-opacity-10 border-warning text-warning";
    title = "HÀNG HOÁ TRONG KHO:";
  } else if (pathname.includes("/finance/assets")) {
    module = "finance_assets";
    colorClass = "bg-warning bg-opacity-10 border-warning text-warning";
    title = "TÀI SẢN CỐ ĐỊNH:";
  } else if (pathname.includes("/finance")) {
    module = "finance";
    colorClass = "bg-warning bg-opacity-10 border-warning text-warning";
    title = "TIN TÀI CHÍNH:";
  } else if (pathname.includes("/hr")) {
    module = "hr";
    colorClass = "bg-info bg-opacity-10 border-info text-info";
    iconClass = "bi-person-lines-fill";
    title = "NHÂN SỰ:";
  } else if (pathname.includes("/production") || pathname.includes("/qa")) {
    module = "production";
    colorClass = "bg-danger bg-opacity-10 border-danger text-danger";
    iconClass = "bi-exclamation-triangle-fill";
    title = "SẢN XUẤT:";
  } else if (pathname.includes("/sales/inventory")) {
    module = "finance_inventory";
    colorClass = "bg-success bg-opacity-10 border-success text-success";
    iconClass = "bi-box-seam";
    title = "HÀNG HOÁ TRONG KHO:";
  } else if (pathname.includes("/sales/quotations")) {
    module = "sales_quotations";
    colorClass = "bg-success bg-opacity-10 border-success text-success";
    iconClass = "bi-graph-up-arrow";
    title = "BÁN HÀNG:";
  } else if (pathname.includes("/sales/business-results")) {
    module = "sales_business_results";
    colorClass = "bg-success bg-opacity-10 border-success text-success";
    iconClass = "bi-bar-chart-fill";
    title = "KẾT QUẢ KINH DOANH:";
  } else if (pathname.includes("/sales/omnichannel")) {
    module = "sales_omnichannel";
    colorClass = "bg-success bg-opacity-10 border-success text-success";
    iconClass = "bi-shop";
    title = "BÁN HÀNG ĐA KÊNH:";
  } else if (pathname.includes("/logistics")) {
    module = "logistics";
    colorClass = "bg-info bg-opacity-10 border-info text-info";
    iconClass = "bi-truck";
    title = "HỆ THỐNG KHO:";
  } else if (pathname.includes("/sales") || pathname.includes("/marketing")) {
    module = "sales";
    colorClass = "bg-success bg-opacity-10 border-success text-success";
    iconClass = "bi-graph-up-arrow";
    title = "KINH DOANH:";
  } else if (pathname.includes("/logistics")) {
    module = "logistics";
    colorClass = "bg-secondary bg-opacity-10 border-secondary text-secondary";
    iconClass = "bi-truck";
    title = "KHO VẬN:";
  }

  // Override title if pageTitle is provided
  if (pageTitle) {
    title = pageTitle.toUpperCase() + ":";
  }

  useEffect(() => {
    fetch(`/api/ticker?module=${module}`)
      .then(res => res.json())
      .then(json => {
        if (json.data && json.data.length > 0) {
          setNews(json.data);
        }
      })
      .catch(err => console.error("Error fetching dynamic ticker:", err));
  }, [module]);

  const displayNews = customNews || news;
  const totalChars = displayNews.reduce((acc, item) => acc + (item.text?.length || 0), 0);
  // Default 50s, but dynamic based on 0.12s per character to keep speed consistent. Minimum 15s.
  const dynamicDuration = displayNews.length > 0 ? Math.max(15, totalChars * 0.12) : 50;

  const formatTickerText = (text: string) => {
    if (!text) return "";
    // Wrap numbers (not inside HTML tags) with bold and #003087
    return text.replace(/(^|[^\w])([+-]?\d+(?:[.,]\d+)*(?:\s*[đ₫%])?)(?![^<]*>)/gi, '$1<span style="font-weight: bold; color: #003087;">$2</span>');
  };

  return (
    <div className={`dynamic-ticker-container border-bottom px-3 flex-shrink-0 d-flex align-items-center ${colorClass}`}>
      <div className={`d-flex align-items-center me-3 fw-bold text-nowrap flex-shrink-0`} style={{ fontSize: '0.875rem' }}>
        <i className={`bi ${iconClass} me-2`}></i>
        {title}
      </div>
      <div className="dynamic-ticker-scroll-wrapper flex-grow-1 overflow-hidden" style={{ fontSize: '0.875rem' }}>
        <div className="dynamic-ticker-content" style={{ animationDuration: `${dynamicDuration}s` }}>
          {displayNews.length > 0 ? (
            displayNews.map((item, idx) => (
              <span 
                key={idx} 
                className="me-5 text-dark"
                style={{ cursor: item.type === 'tax' && item.link ? 'pointer' : 'default' }}
                onClick={() => {
                  if (item.type === 'tax' && item.link) {
                    setSelectedItem({ title: item.title || "Tài liệu", url: item.link });
                    setShowOffcanvas(true);
                  }
                }}
                title={item.type === 'tax' && item.link ? "Nhấn để AI tóm tắt chi tiết" : ""}
                dangerouslySetInnerHTML={{ __html: formatTickerText(item.text) }}
              />
            ))
          ) : (
            <span className="me-5 text-dark">Đang cập nhật dữ liệu...</span>
          )}
        </div>
      </div>

      <TaxPolicyOffcanvas 
        show={showOffcanvas} 
        onHide={() => setShowOffcanvas(false)} 
        url={selectedItem?.url || ""}
        title={selectedItem?.title || ""}
      />
    </div>
  );
}
