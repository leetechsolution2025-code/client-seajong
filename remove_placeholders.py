import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find("function AddCandidateModal(")
end_idx = content.find("function ScheduleInterviewOffcanvas", start_idx)

modal_content = content[start_idx:end_idx]

# Replace placeholders with empty string or just remove the attribute
modal_content = modal_content.replace('placeholder="Nguyễn Mỹ Linh"', '')
modal_content = modal_content.replace('placeholder="linhmau097@gmail.com"', '')
modal_content = modal_content.replace('placeholder="0397047766"', '')
modal_content = modal_content.replace('placeholder="5 năm"', '')
modal_content = modal_content.replace('placeholder="Hà Nội"', '')
modal_content = modal_content.replace('placeholder="Ví dụ: 15.000.000"', '')
modal_content = modal_content.replace('placeholder="https://..."', '')
modal_content = modal_content.replace('placeholder={activeTab === \'exp\' ? "Mô tả chi tiết quá trình làm việc..." : "Danh sách kỹ năng..."}', '')

content = content[:start_idx] + modal_content + content[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Placeholders removed")
