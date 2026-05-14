"use client";

import React from "react";

interface EmployeeAvatarProps {
  name: string;
  url?: string | null;
  size?: number;
  borderRadius?: number;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Component hiển thị Avatar nhân viên với logic fallback:
 * 1. Ưu tiên hiển thị ảnh (url)
 * 2. Nếu không có ảnh, hiển thị 2 ký tự đầu của Họ và Tên.
 */
export function EmployeeAvatar({ 
  name, 
  url, 
  size = 40, 
  borderRadius = 12, 
  fontSize = 16,
  className = "",
  style = {}
}: EmployeeAvatarProps) {
  
  const getInitials = (fullName: string) => {
    if (!fullName) return "?";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    
    // Lấy chữ đầu của Họ và chữ đầu của Tên
    const firstChar = parts[0].charAt(0);
    const lastChar = parts[parts.length - 1].charAt(0);
    return (firstChar + lastChar).toUpperCase();
  };

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: borderRadius,
    background: "var(--primary-subtle, #e0e7ff)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: fontSize,
    fontWeight: 700,
    color: "var(--primary, #4338ca)",
    flexShrink: 0,
    border: "1px solid rgba(0,0,0,0.05)",
    overflow: "hidden",
    position: "relative",
    ...style
  };

  return (
    <div className={`employee-avatar ${className}`} style={baseStyle}>
      {url ? (
        <img
          src={url}
          alt={name}
          style={{ 
            width: "100%", 
            height: "100%", 
            objectFit: "cover", 
            objectPosition: "center top" 
          }}
          onError={(e) => {
            // Nếu ảnh lỗi, có thể fallback về text bằng cách xóa src hoặc ẩn img
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
