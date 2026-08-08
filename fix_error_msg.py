import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix schedule-interview (line ~479)
content = content.replace(
    'if (!res.ok) throw new Error(result.error || "Không thể gửi thư mời");',
    'if (!res.ok) throw new Error(result.error || result.message || "Không thể gửi thư mời");'
)

# Fix send-offer (line ~565)
content = content.replace(
    'if (!res.ok) throw new Error(data.error || "Không thể gửi thư mời");',
    'if (!res.ok) throw new Error(data.error || data.message || "Không thể gửi thư mời");'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated error handling in page.tsx")
