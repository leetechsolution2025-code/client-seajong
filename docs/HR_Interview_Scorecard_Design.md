# Kiến trúc Hệ thống Đánh giá & Báo cáo Phỏng vấn (HR Interview Scorecard)

Tài liệu này mô tả chi tiết thiết kế cơ sở dữ liệu (Database Schema) và luồng nghiệp vụ (Workflow) phục vụ cho việc chấm điểm ứng viên trực tiếp trên hệ thống và lập báo cáo quản trị tuyển dụng.

## 1. Thiết kế Cơ sở dữ liệu (Prisma Schema)

Thay vì lưu kết quả phỏng vấn đính kèm thẳng vào bảng `Candidate`, hệ thống sẽ tách ra một bảng riêng là `InterviewScorecard` (Phiếu đánh giá cá nhân) theo mô hình quan hệ **1-N** (1 Ứng viên - Nhiều Phiếu đánh giá). Thiết kế này phục vụ bài toán phỏng vấn hội đồng nhiều thành viên.

```prisma
model InterviewScorecard {
  id              String   @id @default(cuid())
  candidateId     String   // Liên kết với ứng viên
  interviewerId   String   // Liên kết với tài khoản Giám khảo
  
  // ---- Bối cảnh buổi phỏng vấn (Lưu vết tại thời điểm đánh giá) ----
  interviewTime   DateTime // Thời gian diễn ra phỏng vấn
  interviewMode   String   // Hình thức: "Online" | "Offline"
  interviewLoc    String?  // Địa điểm (Tên phòng họp hoặc Link Jitsi)
  
  // ---- Thông tin Giám khảo (Snapshot để tránh sai lệch nếu sau này User đổi chức vụ) ----
  interviewerRole String   // Chức vụ của người đánh giá (Ví dụ: Tech Lead)
  interviewerDept String   // Đơn vị làm việc (Ví dụ: Khối Công nghệ)

  // ---- Chi tiết điểm số (Thang 1-5) ----
  scoreKnowledge  Int      // 1. Kiến thức chuyên môn
  scoreExperience Int      // 2. Kinh nghiệm làm việc
  scoreComm       Int      // 3. Kỹ năng giao tiếp
  scoreRespons    Int      // 4. Tính trách nhiệm
  scoreTeamwork   Int      // 5. Làm việc nhóm
  totalScore      Int      // Tổng điểm tự động tính (thang 100)

  // ---- Kết luận cá nhân ----
  decision        String   // "HIRE", "REJECT", "CONSIDER" (Tuyển / Cân nhắc / Loại)
  salarySuggest   Int?     // Đề xuất mức lương (nếu HIRE)
  probationSuggest String? // Đề xuất thời gian thử việc
  interviewerNote String?  @db.Text // Nhận xét thêm

  createdAt       DateTime @default(now())

  // Quan hệ (Relations)
  candidate       Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  interviewer     User      @relation(fields: [interviewerId], references: [id])
}
```

*Lưu ý: Bảng `Candidate` sẽ cần bổ sung thêm field `scorecards InterviewScorecard[]` để hoàn thiện Relationship.*

## 2. Luồng thu thập dữ liệu (Data Collection Flow)

1. **Đánh giá hội đồng (Panel Evaluation):** Trong buổi họp Jitsi Meet (hoặc Offline), 3 giám khảo cùng mở màn hình "Trung tâm điều hành phỏng vấn" của ứng viên đó trên thiết bị cá nhân.
2. **Chấm điểm độc lập:** Mỗi người tự chấm điểm các tiêu chí (1-5), điền mức lương đề xuất và ghi chú dựa theo AI Copilot.
3. **Hoàn tất (Submission):** Khi bấm **"Hoàn tất đánh giá"**, hệ thống gọi API `POST /api/hr/interviews/scorecards`. API này lưu trữ và tạo ra 3 bản ghi độc lập trong bảng `InterviewScorecard` trỏ cùng về 1 `candidateId` nhưng khác `interviewerId`.

## 3. Giải pháp Tổng hợp & Báo cáo cho HR Head

Dữ liệu thô sau khi được thu thập sẽ làm nền tảng cho hệ thống báo cáo BI (Business Intelligence) của phòng Nhân sự.

### A. Báo cáo Chi tiết Ứng viên (Hỗ trợ Quyết định Offer)
*   **Average Pooling (Tính trung bình):** Query lấy điểm trung bình của cả hội đồng đối với từng tiêu chí. Tính ra điểm năng lực tổng hợp để đưa vào thẻ Ứng viên.
*   **Radar Chart (So sánh giám khảo):** Sử dụng Recharts để vẽ biểu đồ mạng nhện. Điều này giúp HR Head phát hiện độ "lệch pha" giữa các giám khảo. *(Ví dụ: Tech Lead chấm chuyên môn 5/5, nhưng HR chấm Giao tiếp 2/5 -> Cần họp chốt).*
*   **Khoá trạng thái:** Tự động chuyển trạng thái của `Candidate` sang `OFFERED` hoặc `REJECTED` khi 100% giám khảo đồng thuận.

### B. Báo cáo Hiệu suất Tuyển dụng (Recruitment Analytics Dashboard)
*   **Chất lượng nguồn CV (Source Quality):** Query `totalScore` trung bình nhóm theo nguồn ứng viên (Source: TopCV vs VietnamWorks). Từ đó, đánh giá ROI (Tỷ suất hoàn vốn) của chi phí đăng tin tuyển dụng. Nguồn mang về ứng viên điểm cao sẽ được dồn ngân sách.
*   **Phân tích Phễu lương (Salary Funnel):** Thống kê sự chênh lệch giữa mức lương "Ứng viên kỳ vọng" (CV) so với mức "Lương đề xuất" từ hội đồng phỏng vấn để tinh chỉnh lại khung ngân sách (Budget Plan) của công ty.

## 4. Các bước Kỹ thuật triển khai

1. **Database:** Cập nhật `schema.prisma` và migrate `npx prisma db push`.
2. **Backend:** Xây dựng API Route Handler tại `/api/hr/interviews/scorecards`. Validate payload với Zod.
3. **Frontend:** Cập nhật file `page.tsx` của module Interview, gắn State quản lý mức lương/thử việc và Fetch POST API vào hàm `calculateAndSubmitScore()`.
4. **Dashboard:** Xây dựng UI tổng hợp tại module "Tuyển dụng & Thử việc".
