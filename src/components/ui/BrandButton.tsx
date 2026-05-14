"use client";

import React from "react";

interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  children: React.ReactNode;
  loading?: boolean;
  variant?: "primary" | "outline";
}

export const BrandButton = ({ 
  icon, 
  children, 
  className = "", 
  style, 
  loading, 
  variant = "primary",
  disabled,
  ...props 
}: BrandButtonProps) => {
  const isOutline = variant === "outline";
  
  return (
    <button 
      className={`btn shadow-sm rounded-pill px-3 d-flex align-items-center justify-content-center gap-2 ${isOutline ? 'btn-outline-primary border' : 'text-white'} ${className}`}
      disabled={disabled || loading}
      style={{ 
        height: 38, 
        fontSize: "13px", 
        backgroundColor: isOutline ? "transparent" : "#003087", 
        borderColor: "#003087",
        color: isOutline ? "#003087" : "white",
        borderWidth: isOutline ? "1px" : "0px",
        borderStyle: isOutline ? "solid" : "none",
        fontWeight: 500,
        ...style 
      }}
      {...props}
    >
      {loading ? (
        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      ) : (
        icon && <i className={`bi ${icon}`}></i>
      )}
      {children}
    </button>
  );
};
