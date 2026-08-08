import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update initial state for interviewNotes
target1 = '''  const [formData, setFormData] = useState({
    interviewDate: "",
    interviewLocation: "Văn phòng công ty",
    interviewNotes: ""
  });'''
replacement1 = '''  const [formData, setFormData] = useState({
    interviewDate: "",
    interviewLocation: "Văn phòng công ty",
    interviewNotes: "Vui lòng sử dụng trang phục phù hợp, có mặt đúng thời gian, địa điểm đã thông báo"
  });'''
if target1 in content:
    content = content.replace(target1, replacement1)

# 2. Add onSave prop to ScheduleInterviewOffcanvas
target2 = '''  departmentName: string,
  candidateIds: string[],
  actionType: 'send_email' | 'schedule_internal' | null
}) {'''
replacement2 = '''  departmentName: string,
  candidateIds: string[],
  actionType: 'send_email' | 'schedule_internal' | null,
  onSaveTimeLocation?: (data: any) => Promise<void>
}) {'''
if target2 in content:
    content = content.replace(target2, replacement2)

# 3. Add the "Xác nhận" button next to "Tiếp tục"
target3 = '''<BrandButton
              className="flex-grow-1 fw-bold"
              disabled={loading || !formData.interviewDate || (actionType === 'schedule_internal' && selectedInterviewers.length === 0)}
              onClick={() => onConfirm({ ...formData, selectedInterviewers })}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <i className="bi bi-send-check-fill"></i>
              )}
              {actionType === 'send_email' ? 'Tiếp tục soạn Email' : 'Lưu lịch phỏng vấn'}
            </BrandButton>'''
replacement3 = '''{actionType === 'send_email' && (
              <BrandButton
                variant="outline"
                className="fw-bold"
                disabled={loading || !formData.interviewDate}
                onClick={() => onSaveTimeLocation?.(formData)}
              >
                Xác nhận
              </BrandButton>
            )}
            <BrandButton
              className="flex-grow-1 fw-bold"
              disabled={loading || !formData.interviewDate || (actionType === 'schedule_internal' && selectedInterviewers.length === 0)}
              onClick={() => onConfirm({ ...formData, selectedInterviewers })}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <i className="bi bi-send-check-fill"></i>
              )}
              {actionType === 'send_email' ? 'Tiếp tục' : 'Lưu lịch phỏng vấn'}
            </BrandButton>'''
if target3 in content:
    content = content.replace(target3, replacement3)

# 4. Implement handleSaveTimeLocation in page.tsx and pass it
target4 = '''        <ScheduleInterviewOffcanvas
          onClose={() => setShowInterviewModal(false)}
          onOpenConfig={() => setShowSmtpConfig(true)}
          candidateCount={selectedCandidateIds.length}
          candidateIds={selectedCandidateIds}
          onConfirm={openInterviewEmailModal}
          loading={interviewEmailLoading}
          departmentName={requests.find(r => r.candidates?.some(c => c.id === selectedCandidateIds[0]))?.department || ""}
          actionType={interviewActionType}
        />'''
replacement4 = '''        <ScheduleInterviewOffcanvas
          onClose={() => setShowInterviewModal(false)}
          onOpenConfig={() => setShowSmtpConfig(true)}
          candidateCount={selectedCandidateIds.length}
          candidateIds={selectedCandidateIds}
          onConfirm={openInterviewEmailModal}
          loading={interviewEmailLoading}
          departmentName={requests.find(r => r.candidates?.some(c => c.id === selectedCandidateIds[0]))?.department || ""}
          actionType={interviewActionType}
          onSaveTimeLocation={async (data) => {
            setInterviewEmailLoading(true);
            try {
              await Promise.all(selectedCandidateIds.map(async (id) => {
                await fetch(`/api/hr/candidates/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    interviewDate: new Date(data.interviewDate).toISOString(),
                    interviewLocation: data.interviewLocation,
                    interviewNotes: data.interviewNotes
                  })
                });
              }));
              success("Thành công", "Đã lưu thông tin lịch hẹn");
              setShowInterviewModal(false);
              fetchRequests();
            } catch (err: any) {
              toastError("Lỗi", "Không thể lưu lịch hẹn");
            } finally {
              setInterviewEmailLoading(false);
            }
          }}
        />'''
if target4 in content:
    content = content.replace(target4, replacement4)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated offcanvas buttons successfully")
