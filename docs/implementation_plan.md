# Implementation Plan - Personal Request Center

This plan outlines the steps to implement full functionality for the "Create Request" center, allowing employees to submit various personal requests (Leave, Overtime, Business Trips, etc.) and track their status.

## User Review Required

> [!IMPORTANT]
> - We are using a unified `PersonalRequest` model to handle multiple request types (Leave, OT, etc.) via a `type` field and a `details` JSON field. This ensures flexibility for future request types without frequent schema changes.
> - The approval workflow will follow a standard path: **Employee -> Dept Manager (if applicable) -> HR -> Director (if applicable)**.

## Proposed Changes

### Database Layer

#### [MODIFY] [schema.prisma](file:///Users/leanhvan/master-project/prisma/schema.prisma)
- Add `PersonalRequest` model with fields for `type`, `status`, `reason`, `startDate`, `endDate`, `totalDays`, `totalHours`, `details` (JSON), and approval flags.
- Update `Employee` model to include a relation to `PersonalRequest`.

### API Layer

#### [NEW] [api/my/requests/route.ts](file:///Users/leanhvan/master-project/src/app/api/my/requests/route.ts)
- `POST`: Create a new personal request.
- `GET`: Fetch personal requests for the current user.

### UI Layer

#### [NEW] [PersonalRequestOffcanvas.tsx](file:///Users/leanhvan/master-project/src/components/personal/PersonalRequestOffcanvas.tsx)
- A slide-out panel that contains the dynamic form based on the selected request type.

#### [NEW] [forms/LeaveForm.tsx](file:///Users/leanhvan/master-project/src/components/personal/forms/LeaveForm.tsx)
- Specific fields for Leave (Type of leave, date range, half-day options).

#### [NEW] [forms/OvertimeForm.tsx](file:///Users/leanhvan/master-project/src/components/personal/forms/OvertimeForm.tsx)
- Specific fields for Overtime (Date, hours, reason).

#### [MODIFY] [LeaveRequest.tsx](file:///Users/leanhvan/master-project/src/components/personal/LeaveRequest.tsx)
- Trigger the `PersonalRequestOffcanvas` when a card is clicked.

## Verification Plan

### Automated Tests
- Test API route for creating a request with valid and invalid data.
- Verify Prisma relation works as expected.

### Manual Verification
- Open the "Create Request" page.
- Click "Nghỉ phép" -> Fill form -> Submit -> Check if it appears in "My Requests".
- Click "Làm thêm giờ" -> Fill form -> Submit -> Check if it appears in "My Requests".
