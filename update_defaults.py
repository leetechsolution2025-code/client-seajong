import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = '''  const [formData, setFormData] = useState({
    interviewDate: "",
    interviewLocation: "Văn phòng công ty",
    contactName: "",
    contactPhone: "",
    interviewNotes: "Vui lòng sử dụng trang phục phù hợp, có mặt đúng thời gian, địa điểm đã thông báo"
  });'''
replacement = '''  const [formData, setFormData] = useState({
    interviewDate: "",
    interviewLocation: "Văn phòng công ty",
    contactName: "Cao Thị Phương",
    contactPhone: "0987654321",
    interviewNotes: "Vui lòng sử dụng trang phục phù hợp, có mặt đúng thời gian, địa điểm đã thông báo"
  });'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated defaults successfully")
else:
    print("Target not found")
