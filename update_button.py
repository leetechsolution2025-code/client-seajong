import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

button_target = '''                        <BrandButton
                          variant="outline"
                          style={{ height: 32, fontSize: "12px" }}
                          onClick={() => { setSelectedCandidateIds([row.id]); setShowInterviewModal(true); }}
                        >
                          {row.interviewDate ? "Đổi lịch" : "Đặt lịch"}
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
                            {row.interviewDate ? "Đổi lịch" : "Đặt lịch"}
                          </BrandButton>
                        </div>'''

if button_target in content:
    content = content.replace(button_target, button_replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced button successfully")
else:
    print("Target not found!")
