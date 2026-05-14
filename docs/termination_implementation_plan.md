# Implementation Plan: Terminations & Resignations Module

This plan outlines the steps to build the "Sa thải và Thôi việc" (Terminations & Resignations) module, following the official Seajong flowcharts for Resignation and Dismissal.

## 1. Database Schema (Prisma)
We need a new model to track termination requests and their associated workflows.

```prisma
model TerminationRequest {
  id              String    @id @default(cuid())
  employeeId      String
  type            String    // "RESIGNATION" (Thôi việc) or "DISMISSAL" (Sa thải)
  reason          String
  requestDate     DateTime  @default(now())
  lastWorkingDay  DateTime?
  
  // Resignation Specifics (Flowchart 1)
  exitInterviewNotes String?
  isStayNegotiated   Boolean   @default(false)
  
  // Dismissal Specifics (Flowchart 2)
  violationEvidence String?   // JSON array of URLs/Descriptions
  disciplinaryMinutes String? // JSON or text
  
  // Shared Workflow
  status          String    @default("Draft") // Draft, Pending, Approved, Handover, Finalizing, Completed
  step            Int       @default(1)
  directorNote    String?
  handoverChecklist String?   // JSON: { docs: [], assets: [], finance: [] }
  isAccountLocked Boolean   @default(false)
  
  employee        Employee  @relation(fields: [employeeId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

## 2. API Endpoints (`/api/hr/terminations`)
- `GET /api/hr/terminations`: Fetch all requests with employee details.
- `POST /api/hr/terminations`: Create a new request.
- `PATCH /api/hr/terminations/[id]`: Update request status/step/checklist.
- `POST /api/hr/terminations/[id]/finalize`: Finalize the process (set Employee to Inactive, Lock Account).

## 3. Frontend Architecture (`/app/(dashboard)/hr/terminations/page.tsx`)

### Phase 1: Main Dashboard & Table
- **Layout**: Top Stats Cards + Filterable Table.
- **Table Columns**: Nhân viên, Loại (Màu xanh/đỏ), Ngày bắt đầu, Ngày cuối cùng, Tiến độ (Step), Trạng thái.
- **Components**: Reuse `High-Density Table` and `Status Badge` patterns.

### Phase 2: Creation & Detail Panels
- **TerminationFormOffcanvas**: Selection for Employee, Type selection, and Initial reason.
- **TerminationDetailOffcanvas**: 
  - **Header**: Employee profile snippet + Step tracker.
  - **Body Content**: Dynamic based on the current Step.
    - *Step 2 (Resignation)*: Exit interview form.
    - *Step 1 (Dismissal)*: Violation record & evidence upload.
    - *Step 5/3 (Handover)*: Checklist with multi-party confirmation.

### Phase 3: Workflow Logic & Integrations
- **Approval Integration**: Hook into the existing `ApprovalCenter` for Director approval steps.
- **Automation**: 
  - Send notifications to IT when "Account Locking" step is reached.
  - Trigger "Final Settlement" report for Finance.
  - Automate `Employee.status` update upon "Completed".

## 4. Design Aesthetics
- **Resignation (Blue/Gray)**: Professional, helpful, "Off-boarding" vibe.
- **Dismissal (Red/Amber)**: Strict, evidence-focused, high priority.
- **Visuals**: Progress bars and status icons to show how far through the 7/9 step process the request is.

## 5. Implementation Roadmap
1. **Day 1**: Prisma schema update & API scaffolding.
2. **Day 2**: Dashboard layout & Request creation form.
3. **Day 3**: Process-specific UI (Exit interview, Evidence collection).
4. **Day 4**: Handover checklist & Approval flow integration.
5. **Day 5**: Polish, Notifications, and Employee status automation.
