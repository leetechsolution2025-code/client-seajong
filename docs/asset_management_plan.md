# Implementation Plan: Asset Management Module

This document outlines the plan to build the **Quản lý tài sản** (Asset Management) module within the Finance department, following the established fixed asset management process.

## 1. Design Ideas (Ý tưởng thiết kế)

The interface should be professional, data-dense, and workflow-oriented.

### Dashboard & Statistics
- **KPI Cards:** Total Asset Value, Count of Assets in Use, Assets Pending Maintenance (Due), Assets Fully Depreciated.
- **Charts:** Asset distribution by category, Monthly depreciation projection.

### Asset List View
- **Modern Table:** High-density table showing Code, Name, Original Price, Residual Value, User/Department, and Status.
- **Status Tags:** Use colors to indicate status (e.g., `Emerald` for In Use, `Amber` for Maintenance, `Rose` for Pending Liquidation).
- **Quick Filters:** Filter by category, department, or maintenance status.

### Asset Detail (Slide-out Offcanvas)
- **Tabs:**
    - **General Info:** Original price, purchase date, supplier, technical specs.
    - **Depreciation:** Calculation history, remaining months/value.
    - **Maintenance:** Log of past maintenance and upcoming schedule.
    - **Handover History:** Tracking who held the asset over time.
- **Actions:** Button to trigger Handover, Maintenance Log, or Liquidation request.

### Workflows (Modals)
- **New Asset Wizard:** Multi-step form (Info -> Financials -> Assignment).
- **Handover Form:** Select recipient, location, and generate handover document.
- **Maintenance Logger:** Log costs and activities.

---

## 2. Implementation Steps

### Phase 1: Data Model (Prisma)
- [ ] Define `Asset` model: basic info, `originalPrice`, `purchaseDate`, `usefulLife` (months).
- [ ] Define `AssetCategory` model.
- [ ] Define `AssetHistory` model: track handovers and status changes.
- [ ] Define `MaintenanceRecord` model.

### Phase 2: Backend API
- [ ] `GET /api/finance/assets`: Fetch list with filtering and pagination.
- [ ] `POST /api/finance/assets`: Create new asset records.
- [ ] `PATCH /api/finance/assets/[id]`: Update status (handover, maintenance).
- [ ] `GET /api/finance/assets/stats`: Calculate aggregate data for dashboard cards.

### Phase 3: UI Components
- [ ] Build `AssetTable` with sorting and row actions.
- [ ] Build `AssetStats` cards.
- [ ] Build `AssetForm` for creation/editing.
- [ ] Build `HandoverModal` and `MaintenanceModal`.

### Phase 4: Business Logic & Integration
- [ ] Implement Depreciation Logic (Straight-line method) to calculate `ResidualValue` dynamically.
- [ ] Integrate with the `/finance/assets` page created in the previous step.
- [ ] Add "Export to Excel" functionality for asset inventory.

---

## 3. Technical Considerations
- **Calculations:** Residual value should be calculated server-side or via a helper to ensure consistency.
- **Images:** Support uploading photos of the asset/receipts.
- **Permissions:** Only Finance/Admin can edit financial data; others can view assignment data.
