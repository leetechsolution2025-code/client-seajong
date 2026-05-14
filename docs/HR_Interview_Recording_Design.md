# Kiến trúc Hệ thống Ghi âm Phỏng vấn Thông minh (Interview Audio Recording)

Tài liệu này mô tả chi tiết thiết kế cho tính năng thu âm, xử lý và lưu trữ file ghi âm cục bộ phục vụ cho AI bóc tách ở giai đoạn sau.

## 1. Thiết kế Cơ sở dữ liệu (Prisma Schema)

Bảng `InterviewScorecard` sẽ được cập nhật thêm một field để trỏ tới file ghi âm của phần đánh giá đó.

```prisma
model InterviewScorecard {
  ...
  audioRecordUrl  String?  // Trỏ tới file .webm trên server hoặc S3
  ...
}
```

## 2. Thiết kế Giao diện Thu âm (Audio Recorder UI)

Thay thế khối **"Hội đồng phỏng vấn"** bên trái tab **"Nội dung phỏng vấn"** bằng một bảng điều khiển Media Recorder chuyên dụng với các trạng thái (States):
- **Trạng thái `idle`**: Nút "Bắt đầu ghi âm" màu đỏ nổi bật.
- **Trạng thái `recording`**: 
  - Vòng tròn sóng âm nhấp nháy liên tục (CSS pulse animation).
  - Nút "Tạm dừng" và nút "Kết thúc".
  - Hiển thị thời gian thực (00:00).
- **Trạng thái `paused`**:
  - Giao diện chuyển mờ, ngừng nhấp nháy sóng âm.
  - Nút "Tiếp tục" và nút "Kết thúc".

## 3. Luồng Thu thập (Web Audio API Workflow)

1. Trình duyệt yêu cầu quyền Microphone (`navigator.mediaDevices.getUserMedia`).
2. Khởi tạo đối tượng `new MediaRecorder(stream, { mimeType: 'audio/webm' })`.
3. Chạy `recorder.start(1000)` để thu thập dữ liệu (Blob) theo từng giây.
4. Khi bấm "Tạm dừng" -> gọi `recorder.pause()`. Khi "Tiếp tục" -> gọi `recorder.resume()`. (Lúc này file vẫn chung một luồng, không bị tách rời).
5. Khi bấm "Kết thúc" -> gọi `recorder.stop()`.
6. Sự kiện `onstop` sẽ gộp mảng `Blob[]` lại thành một file `.webm` duy nhất.

## 4. Xử lý API Upload (Upload Handler)

Hệ thống cung cấp Endpoint chuyên dụng: `POST /api/hr/interviews/upload-audio`.

**Logic xử lý Backend:**
- Đọc nội dung file từ `FormData`.
- Khởi tạo thư mục `/public/uploads/interviews` nếu chưa tồn tại.
- Tạo một ID duy nhất `candidateId_timestamp.webm`.
- Ghi dữ liệu file dạng Buffer xuống thư mục lưu trữ cục bộ.
- API trả về Public URL: `/uploads/interviews/candidateId_timestamp.webm`.

## 5. Đồng bộ hóa với Hồ sơ (Data Sync)

Sau khi upload thành công, Frontend lưu trữ URL vào một State ẩn `audioRecordUrl`.
Khi người dùng bấm **"Hoàn tất & Kết luận"**, URL này sẽ được đính kèm vào payload gửi lên API `scorecards` để lưu vĩnh viễn vào Database.
