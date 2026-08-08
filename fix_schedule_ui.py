import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update ScheduleInterviewOffcanvas props definition
target1 = '''function ScheduleInterviewOffcanvas({ onClose, onConfirm, onOpenConfig, loading, candidateCount, departmentName, candidateIds, actionType, onSaveTimeLocation }: {'''
replacement1 = '''function ScheduleInterviewOffcanvas({ onClose, onConfirm, onOpenConfig, loading, candidateCount, departmentName, candidateIds, actionType, onSaveTimeLocation, initialData }: {'''
if target1 in content:
    content = content.replace(target1, replacement1)

# 2. Update type definition
target2 = '''  onSaveTimeLocation?: (data: any) => Promise<void>
}) {'''
replacement2 = '''  onSaveTimeLocation?: (data: any) => Promise<void>,
  initialData?: any
}) {'''
if target2 in content:
    content = content.replace(target2, replacement2)

# 3. Update useState
target3 = '''  const [formData, setFormData] = useState({
    interviewDate: "",
    interviewLocation: "Văn phòng công ty",
    contactName: "Cao Thị Phương",
    contactPhone: "0987654321",
    interviewNotes: "Vui lòng sử dụng trang phục phù hợp, có mặt đúng thời gian, địa điểm đã thông báo"
  });'''
replacement3 = '''  const [formData, setFormData] = useState(() => {
    let formattedDate = "";
    if (initialData?.interviewDate) {
      const d = new Date(initialData.interviewDate);
      formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    return {
      interviewDate: formattedDate,
      interviewLocation: initialData?.interviewLocation || "Văn phòng công ty",
      contactName: "Cao Thị Phương",
      contactPhone: "0987654321",
      interviewNotes: initialData?.interviewNotes || "Vui lòng sử dụng trang phục phù hợp, có mặt đúng thời gian, địa điểm đã thông báo"
    };
  });'''
if target3 in content:
    content = content.replace(target3, replacement3)

# 4. Pass initialData to component
target4 = '''          actionType={interviewActionType}
          onSaveTimeLocation={async (data) => {'''
replacement4 = '''          actionType={interviewActionType}
          initialData={requests.flatMap(r => r.candidates || []).find(c => c.id === selectedCandidateIds[0])}
          onSaveTimeLocation={async (data) => {'''
if target4 in content:
    content = content.replace(target4, replacement4)

# 5. Add Location in Table
target5 = '''                          {row.interviewDate ? (
                            <div className="d-flex align-items-center gap-1 text-primary fw-bold">
                              <i className="bi bi-clock" />
                              {new Date(row.interviewDate).toLocaleString('vi-VN')}
                            </div>
                          ) : <span className="text-muted italic">Chưa có lịch</span>}'''
replacement5 = '''                          {row.interviewDate ? (
                            <>
                              <div className="d-flex align-items-center gap-1 text-primary fw-bold">
                                <i className="bi bi-clock" />
                                {new Date(row.interviewDate).toLocaleString('vi-VN')}
                              </div>
                              {row.interviewLocation && (
                                <div className="d-flex align-items-center gap-1 text-muted mt-1" style={{ fontSize: "11px" }}>
                                  <i className="bi bi-geo-alt" />
                                  {row.interviewLocation}
                                </div>
                              )}
                            </>
                          ) : <span className="text-muted italic">Chưa có lịch</span>}'''
if target5 in content:
    content = content.replace(target5, replacement5)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated UI successfully")
