# Implementation Plan - HR Employee Profile Management

Implement a comprehensive employee profile management system with support for personal info, multiple labor contracts, and working history.

## User Review Required

> [!IMPORTANT]
> I will be adding two new models to the Prisma schema: `LaborContract` and `EmploymentHistory`. This is necessary to support the history of changes (e.g., promotion timeline) instead of just storing the current state in the `Employee` model.

## Proposed Changes

---

### Database Schema

#### [MODIFY] [schema.prisma](file:///Users/leanhvan/master-project/prisma/schema.prisma)
- Add `LaborContract` model.
- Add `EmploymentHistory` model.
- Update `Employee` model with relations to these new models.

---

### Backend API

#### [NEW] [route.ts](file:///Users/leanhvan/master-project/src/app/api/hr/employees/route.ts)
- GET: Fetch employees with filters (dept, status, search) and pagination.
- POST: Create new employee.

#### [NEW] [route.ts](file:///Users/leanhvan/master-project/src/app/api/hr/employees/[id]/route.ts)
- GET: Fetch full detail of a single employee including history and contracts.
- PUT: Update employee info.

---

### Frontend Components

#### [NEW] [EmployeeManagement.tsx](file:///Users/leanhvan/master-project/src/components/hr/EmployeeManagement.tsx)
- The main orchestrator component.
- Manages state for list, filters, and selected employee.

#### [NEW] [EmployeeTable.tsx](file:///Users/leanhvan/master-project/src/components/hr/EmployeeTable.tsx)
- Displays the list of employees.
- Uses standard project styling (hover effects, status badges).

#### [NEW] [EmployeeDetailOffcanvas.tsx](file:///Users/leanhvan/master-project/src/components/hr/EmployeeDetailOffcanvas.tsx)
- Slide-out panel for employee details.
- Tabs for: Overview, Personal Info, Contracts, Work History, Payroll & Benefits.

---

### Pages

#### [MODIFY] [page.tsx](file:///Users/leanhvan/master-project/src/app/(dashboard)/hr/employees/page.tsx)
- Replace placeholder with `<EmployeeManagement />`.

## Verification Plan

### Automated Tests
- Test API endpoints with various filter combinations.
- Verify Prisma relations work as expected.

### Manual Verification
- Check responsiveness of the table and offcanvas.
- Verify that clicking a row opens the correct employee detail.
- Ensure the "Premium" look and feel matches the user's expectations.
