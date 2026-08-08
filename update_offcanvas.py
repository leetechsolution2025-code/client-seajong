import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update ScheduleInterviewOffcanvas props in render
target1 = '''      {showInterviewModal && (
        <ScheduleInterviewOffcanvas
          onClose={() => setShowInterviewModal(false)}
          onOpenConfig={() => setShowSmtpConfig(true)}
          candidateCount={selectedCandidateIds.length}
          candidateIds={selectedCandidateIds}
          onConfirm={openInterviewEmailModal}
          loading={interviewEmailLoading}
          departmentName={requests.find(r => r.candidates?.some(c => c.id === selectedCandidateIds[0]))?.department || ""}
        />
      )}'''

replacement1 = '''      {showInterviewModal && (
        <ScheduleInterviewOffcanvas
          onClose={() => setShowInterviewModal(false)}
          onOpenConfig={() => setShowSmtpConfig(true)}
          candidateCount={selectedCandidateIds.length}
          candidateIds={selectedCandidateIds}
          onConfirm={openInterviewEmailModal}
          loading={interviewEmailLoading}
          departmentName={requests.find(r => r.candidates?.some(c => c.id === selectedCandidateIds[0]))?.department || ""}
          actionType={interviewActionType}
        />
      )}'''
if target1 in content:
    content = content.replace(target1, replacement1)
else:
    print("Warning: Target 1 not found")

# 2. Update ScheduleInterviewOffcanvas signature
target2 = '''function ScheduleInterviewOffcanvas({ onClose, onConfirm, onOpenConfig, loading, candidateCount, departmentName, candidateIds }: {
  onClose: () => void,
  onConfirm: (data: any) => Promise<void>,
  onOpenConfig: () => void,
  loading: boolean,
  candidateCount: number,
  departmentName: string,
  candidateIds: string[]
}) {'''

replacement2 = '''function ScheduleInterviewOffcanvas({ onClose, onConfirm, onOpenConfig, loading, candidateCount, departmentName, candidateIds, actionType }: {
  onClose: () => void,
  onConfirm: (data: any) => Promise<void>,
  onOpenConfig: () => void,
  loading: boolean,
  candidateCount: number,
  departmentName: string,
  candidateIds: string[],
  actionType: 'send_email' | 'schedule_internal' | null
}) {'''
if target2 in content:
    content = content.replace(target2, replacement2)
else:
    print("Warning: Target 2 not found")

# 3. Update Title
target3 = '''<h5 className="offcanvas-title fw-bold m-0" style={{ fontSize: '1rem' }}>Đặt lịch phỏng vấn</h5>'''
replacement3 = '''<h5 className="offcanvas-title fw-bold m-0" style={{ fontSize: '1rem' }}>{actionType === 'send_email' ? 'Thông tin thư mời' : 'Đặt lịch phỏng vấn'}</h5>'''
if target3 in content:
    content = content.replace(target3, replacement3)
else:
    print("Warning: Target 3 not found")

# 4. Hide Interviewers section if send_email
target4 = '''<div className="mb-3">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-2">2. Hội đồng phỏng vấn</label>'''
replacement4 = '''{actionType !== 'send_email' && (
          <div className="mb-3">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-2">2. Hội đồng phỏng vấn</label>'''

target4_end = '''</div>
            )}
          </div>

          <div className="mb-0">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-3">3. Lời nhắn cho ứng viên</label>'''
replacement4_end = '''</div>
            )}
          </div>
          )}

          <div className="mb-0">
            <label className="form-label fw-bold small text-uppercase text-muted letter-spacing-1 mb-3">{actionType === 'send_email' ? '2.' : '3.'} Lời nhắn cho ứng viên</label>'''

if target4 in content and target4_end in content:
    content = content.replace(target4, replacement4)
    content = content.replace(target4_end, replacement4_end)
else:
    print("Warning: Target 4 not found")

# 5. Update Button
target5 = '''<BrandButton
              className="flex-grow-1 fw-bold"
              disabled={loading || !formData.interviewDate || selectedInterviewers.length === 0}
              onClick={() => onConfirm({ ...formData, selectedInterviewers })}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <i className="bi bi-send-check-fill"></i>
              )}
              Xác nhận & Gửi thư mời
            </BrandButton>'''
replacement5 = '''<BrandButton
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
if target5 in content:
    content = content.replace(target5, replacement5)
else:
    print("Warning: Target 5 not found")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated offcanvas successfully")
