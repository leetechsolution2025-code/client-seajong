import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LogisticsInventory } from "@/components/logistics/inventory/LogisticsInventory";

export default function InventoryCheckPage() {
  return (
    <div className="d-flex flex-column h-100" style={{ background: "var(--background)" }}>
      <PageHeader
        title="Danh mục hàng hoá"
        description="Tra cứu tồn thực tế & Kiểm tra số lượng sẵn sàng bán"
        icon="bi-boxes"
        color="emerald"
      />

      <div className="flex-grow-1 pb-4 pt-2 px-4 d-flex flex-column" style={{ background: "color-mix(in srgb, var(--muted) 40%, transparent)", minHeight: 0 }}>
        <div className="bg-card rounded-4 shadow-sm border flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          <div 
            className="flex-grow-1 custom-scrollbar d-flex flex-column overflow-hidden pt-4 px-4 pb-3"
            style={{ minHeight: 0 }}
          >
            <LogisticsInventory defaultWarehouseNameMatch="Kho hàng hoá" hideAddButton={true} hideActions={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
