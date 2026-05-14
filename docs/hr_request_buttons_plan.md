# Unified Submit Button for HR Requests

The goal is to combine the separate submit buttons inside `RecruitmentRequestForm`, `TrainingRequestForm`, and the inline `Promotion` form into a single, common submit button controlled by the parent layout `page.tsx`.

## Proposed Changes

### 1. `src/components/hr/forms/RecruitmentRequestForm.tsx`
- Refactor the component to use `forwardRef`.
- Expose an interface `RecruitmentFormRef` with `submit`, `nextStep`, and `prevStep` methods using `useImperativeHandle`.
- Add `onStepChange` and `onLoading` props to report internal state up to the parent.
- Remove the internal footer (`div` containing the Back/Next/Submit buttons).

### 2. `src/components/hr/forms/TrainingRequestForm.tsx`
- Refactor the component to use `forwardRef`.
- Expose an interface `TrainingFormRef` with a `submit` method.
- Add an `onLoading` prop to report submission state.
- Remove the internal footer (Hủy / Gửi yêu cầu đào tạo).

### 3. `src/app/(dashboard)/my/hr-requests/page.tsx`
- Create refs: `recruitmentRef`, `trainingRef`, and `promotionRef`.
- Add state variables: `recruitmentStep` (to track stepper) and `isSubmitting` (to track global loading state).
- Remove the internal footer from the inline `Promotion` form and attach `ref={promotionRef}` to it.
- Add a new footer at the bottom of the card.
  - It will conditionally display "Hủy bỏ" or "Quay lại" (if Recruitment is past step 1).
  - It will conditionally display "Tiếp theo" (if Recruitment is before step 3) or a global "Gửi yêu cầu" button.
  - The single "Gửi yêu cầu" button will call the appropriate `.submit()` or `.requestSubmit()` method depending on the `activeTab`.

## Verification Plan
- Verify that navigating tabs correctly updates the common footer.
- Verify that Recruitment "Tiếp theo" and "Quay lại" buttons function normally and advance the wizard.
- Verify that clicking "Gửi yêu cầu" successfully triggers the API call for each of the 3 form types.
- Verify that loading states ("Đang gửi...") disable the button appropriately.
