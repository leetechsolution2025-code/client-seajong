import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add saveInternalSchedule
target1 = '''  const openInterviewEmailModal = async (data: any) => {'''
replacement1 = '''  const saveInternalSchedule = async (data: any) => {
    setInterviewEmailLoading(true);
    try {
      const res = await fetch("/api/hr/candidates/schedule-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, candidateIds: selectedCandidateIds, draftOnly: false, actionType: 'schedule_internal' })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Không thể lưu lịch phỏng vấn");
      success("Thành công", result.message || "Đã lưu lịch phỏng vấn nội bộ thành công");
      setShowInterviewModal(false);
      fetchRequests();
    } catch (err: any) {
      toastError("Lỗi", err.message || "Không thể lưu lịch phỏng vấn");
    } finally {
      setInterviewEmailLoading(false);
    }
  };

  const openInterviewEmailModal = async (data: any) => {'''
if target1 in content:
    content = content.replace(target1, replacement1)

# 2. Update onConfirm in offcanvas
target2 = '''        <ScheduleInterviewOffcanvas
          onClose={() => setShowInterviewModal(false)}
          onOpenConfig={() => setShowSmtpConfig(true)}
          candidateCount={selectedCandidateIds.length}
          candidateIds={selectedCandidateIds}
          onConfirm={openInterviewEmailModal}
          loading={interviewEmailLoading}'''
replacement2 = '''        <ScheduleInterviewOffcanvas
          onClose={() => setShowInterviewModal(false)}
          onOpenConfig={() => setShowSmtpConfig(true)}
          candidateCount={selectedCandidateIds.length}
          candidateIds={selectedCandidateIds}
          onConfirm={interviewActionType === 'send_email' ? openInterviewEmailModal : saveInternalSchedule}
          loading={interviewEmailLoading}'''
if target2 in content:
    content = content.replace(target2, replacement2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated successfully")
