# Implementation Plan - Training Module (Module Đào tạo)

This plan outlines the implementation of the Training module based on the provided organizational workflow: **Request -> Classification -> Planning (for ad-hoc) -> Approval -> Execution -> Evaluation.**

## User Review Required

> [!IMPORTANT]
> **Data Model Consolidation**: To keep the system lean, I propose combining "TrainingCourse" and "TrainingPlan" if possible, or keeping a strict parent-child relationship.
> **MCQ Engine**: For the "Quick test" requirement, I will implement a flexible JSON-based question structure.
> **Approval Workflow**: I will implement a simple one-level approval by HR Manager/Director as per the flowchart.

## Proposed Changes

### 1. Database Schema (Prisma)

#### [MODIFY] [schema.prisma](file:///Users/leanhvan/master-project/prisma/schema.prisma)

Add the following models:

*   `TrainingRequest`: Stores the initial requirement.
*   `TrainingPlan`: Stores scheduling, cost, and approval details for ad-hoc training.
*   `TrainingCourse`: Represents the actual execution instance (links to a Request/Plan).
*   `TrainingParticipant`: Links employees to courses with attendance and results.
*   `TrainingQuestion`: Stores MCQ questions for the course test.

### 2. Backend API Routes

#### [NEW] `src/app/api/hr/training/requests/route.ts` (and `[id]/route.ts`)
*   CRUD for training requests.

#### [NEW] `src/app/api/hr/training/plans/route.ts` (and `[id]/route.ts`)
*   CRUD for training plans and approval logic.

#### [NEW] `src/app/api/hr/training/courses/route.ts` (and `[id]/route.ts`)
*   Manage execution state, attendance, and test results.

### 3. Frontend UI Implementation

#### [MODIFY] [hr/training/page.tsx](file:///Users/leanhvan/master-project/src/app/(dashboard)/hr/training/page.tsx)
*   Main dashboard with tabs: **Yêu cầu**, **Kế hoạch**, **Khoá học**, **Báo cáo**.

#### [NEW] Components
*   `TrainingRequestList`: Data table for requests.
*   `TrainingRequestForm`: Modal/Form to create new requests.
*   `TrainingPlanModal`: Specialized form for ad-hoc planning (including cost).
*   `TrainingExecutionView`: Interface for tracking attendance and conducting tests.
*   `TrainingMCQTest`: Component for employees to take the quick test.
*   `TrainingEvaluationReport`: Summary view for Step 4.

## Verification Plan

### Automated Tests
*   Verify API endpoints for training request creation.
*   Verify approval state transitions (Pending -> Approved/Rejected).
*   Verify test score calculation logic.

### Manual Verification
1.  Create a "Phát sinh" (Ad-hoc) request.
2.  Create a plan and submit for approval.
3.  Approve the plan.
4.  Start the course, mark attendance.
5.  Complete a mock MCQ test.
6.  View the final evaluation report.
