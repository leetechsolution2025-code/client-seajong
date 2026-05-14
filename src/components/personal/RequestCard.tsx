"use client";

import React from "react";
import { SectionTitle } from "@/components/ui/SectionTitle";

interface RequestCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

export function RequestCard({ title, description, icon, color, onClick }: RequestCardProps) {
  return (
    <div className="col-12 col-md-6 col-lg-4 mb-4">
      <div 
        className="request-card p-4 h-100 d-flex flex-column gap-3 cursor-pointer"
        onClick={onClick}
        style={{
          background: "var(--card)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          transition: "all 0.3s ease",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Glow Effect on Hover */}
        <div className="card-glow" style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 100% 0%, ${color}10 0%, transparent 50%)`,
          opacity: 0,
          transition: "opacity 0.3s ease"
        }} />

        <div className="d-flex align-items-start justify-content-between">
          <div 
            className="icon-wrapper d-flex align-items-center justify-content-center"
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: `${color}15`,
              color: color,
              fontSize: "24px",
              transition: "transform 0.3s ease"
            }}
          >
            <i className={`bi ${icon}`}></i>
          </div>
          
          <div className="arrow-icon" style={{ color: "var(--muted-foreground)", opacity: 0.5 }}>
            <i className="bi bi-arrow-up-right"></i>
          </div>
        </div>

        <div className="mt-2">
          <SectionTitle 
            title={title} 
            className="mb-2" 
            style={{ fontSize: "14px", color: "var(--foreground)" }} 
          />
          <p className="mb-0" style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", lineHeight: "1.5" }}>
            {description}
          </p>
        </div>

        <style jsx>{`
          .request-card:hover {
            transform: translateY(-5px);
            border-color: ${color}40;
            box-shadow: 0 10px 30px -10px ${color}20;
          }
          .request-card:hover .card-glow {
            opacity: 1;
          }
          .request-card:hover .icon-wrapper {
            transform: scale(1.1) rotate(-5deg);
          }
          .request-card:active {
            transform: translateY(-2px);
          }
        `}</style>
      </div>
    </div>
  );
}
