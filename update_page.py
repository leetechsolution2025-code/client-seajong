import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add interviewActionType state
state_target = '  const [isScheduling, setIsScheduling] = useState(false);'
state_replacement = '''  const [isScheduling, setIsScheduling] = useState(false);
  const [interviewActionType, setInterviewActionType] = useState<'send_email' | 'schedule_internal' | null>(null);'''
if state_target in content and 'interviewActionType' not in content:
    content = content.replace(state_target, state_replacement)

# Change the buttons in Step 3
button_target = '''                        <BrandButton
                          variant="outline"
                          style={{ height: 32, fontSize: "12px" }}
                          onClick={() => { setSelectedCandidateIds([row.id]); setShowInterviewModal(true); }}
                        >
                          Lên lịch
                        </BrandButton>'''

button_replacement = '''                        <div className="d-flex gap-2 justify-content-end">
                          <BrandButton
                            style={{ height: 32, fontSize: "12px" }}
                            onClick={() => { setSelectedCandidateIds([row.id]); setInterviewActionType('send_email'); setShowInterviewModal(true); }}
                          >
                            Gửi thư mời
                          </BrandButton>
                          <BrandButton
                            variant="outline"
                            style={{ height: 32, fontSize: "12px" }}
                            onClick={() => { setSelectedCandidateIds([row.id]); setInterviewActionType('schedule_internal'); setShowInterviewModal(true); }}
                          >
                            Đặt lịch
                          </BrandButton>
                        </div>'''
content = content.replace(button_target, button_replacement)

# Update openInterviewEmailModal to branch based on interviewActionType
open_modal_target = '''  const openInterviewEmailModal = async (scheduleData: any) => {
    setInterviewEmailLoading(true);
    try {
      const res = await fetch("/api/hr/candidates/schedule-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scheduleData,
          candidateIds: selectedCandidateIds,
          draftOnly: true // Fetch template only
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo mẫu email");
      
      setInterviewEmailSubject(data.subject || "");
      setInterviewEmailHtml(data.html || "");
      setInterviewTemplateData(data);
      setInterviewEmailData(scheduleData);
      
      setInterviewEmailOpen(true);
      setShowInterviewModal(false); // Close schedule offcanvas
    } catch (err: any) {
      toastError("Lỗi", err.message || "Không thể tạo mẫu email");
    } finally {
      setInterviewEmailLoading(false);
    }
  };'''

open_modal_replacement = '''  const openInterviewEmailModal = async (scheduleData: any) => {
    if (interviewActionType === 'schedule_internal') {
      // Just save schedule internally
      setInterviewEmailLoading(true);
      try {
        const res = await fetch("/api/hr/candidates/schedule-interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...scheduleData,
            candidateIds: selectedCandidateIds,
            actionType: 'schedule_internal'
          })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || result.message || "Không thể lưu lịch phỏng vấn");

        // Update candidate status and request status to Interviewing
        await Promise.all(selectedCandidateIds.map(async (id) => {
          await fetch(`/api/hr/candidates/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Interviewing" })
          });
        }));
        
        const scheduledCands = requests.flatMap(r => r.candidates || []).filter(c => selectedCandidateIds.includes(c.id));
        const uniqueRequestIds = Array.from(new Set(scheduledCands.map(c => c.requestId).filter(Boolean)));
        await Promise.all(uniqueRequestIds.map(async (reqId) => {
          await fetch(`/api/hr/recruitment/${reqId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Interviewing" })
          });
        }));

        success("Thành công", "Đã ghi nhận lịch phỏng vấn trên hệ thống!");
        setShowInterviewModal(false);
        setSelectedCandidateIds([]);
        fetchRequests();
      } catch (err: any) {
        toastError("Lỗi", err.message || "Đã có lỗi xảy ra");
      } finally {
        setInterviewEmailLoading(false);
      }
      return;
    }

    // Otherwise (send_email)
    setInterviewEmailLoading(true);
    try {
      const res = await fetch("/api/hr/candidates/schedule-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scheduleData,
          candidateIds: selectedCandidateIds,
          draftOnly: true // Fetch template only
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tạo mẫu email");
      
      setInterviewEmailSubject(data.subject || "");
      setInterviewEmailHtml(data.html || "");
      setInterviewTemplateData(data);
      setInterviewEmailData(scheduleData);
      
      setInterviewEmailOpen(true);
      setShowInterviewModal(false); // Close schedule offcanvas
    } catch (err: any) {
      toastError("Lỗi", err.message || "Không thể tạo mẫu email");
    } finally {
      setInterviewEmailLoading(false);
    }
  };'''
content = content.replace(open_modal_target, open_modal_replacement)

# Update handleSendCustomInterviewEmail to pass actionType and update candidate status to "Đã gửi thư mời"
send_custom_target = '''      const res = await fetch("/api/hr/candidates/schedule-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...interviewEmailData,
          candidateIds: selectedCandidateIds,
          customHtml: sendHtml,
          customSubject: interviewEmailSubject
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.message || "Không thể gửi thư mời");

      // Update request status to Interviewing
      const scheduledCands = requests.flatMap(r => r.candidates || []).filter(c => selectedCandidateIds.includes(c.id));
      const uniqueRequestIds = Array.from(new Set(scheduledCands.map(c => c.requestId).filter(Boolean)));
      await Promise.all(uniqueRequestIds.map(async (reqId) => {
        await fetch(`/api/hr/recruitment/${reqId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Interviewing" })
        });
      }));

      success("Thành công", "Đã lên lịch phỏng vấn và gửi thư mời!");'''

send_custom_replacement = '''      const res = await fetch("/api/hr/candidates/schedule-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...interviewEmailData,
          candidateIds: selectedCandidateIds,
          customHtml: sendHtml,
          customSubject: interviewEmailSubject,
          actionType: 'send_email'
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || result.message || "Không thể gửi thư mời");

      // Update candidate status to "Đã gửi thư mời"
      await Promise.all(selectedCandidateIds.map(async (id) => {
        await fetch(`/api/hr/candidates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Đã gửi thư mời" })
        });
      }));

      success("Thành công", "Đã gửi thư mời phỏng vấn!");'''
content = content.replace(send_custom_target, send_custom_replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated page.tsx logic")
