import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the input-group wrapper
content = content.replace(
    'className="input-group bg-light rounded-3 px-2"',
    'className="input-group bg-light px-2" style={{ border: "1.5px solid #e2e8f0", borderRadius: "8px" }}'
)

# Fix the internal input styles to remove their own borders
content = content.replace(
    'style={{ ...inputStyle, background: "transparent", width: "auto", flex: 1 }}',
    'style={{ ...inputStyle, background: "transparent", width: "auto", flex: 1, border: "none", padding: "4px 8px" }}'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Added borders to input groups")
