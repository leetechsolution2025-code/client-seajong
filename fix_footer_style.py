import re

with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace footer styling
content = content.replace(
    'footerClassName="bg-light px-3 py-2"\n        footerStyle={{ padding: "8px 16px" }}',
    'footerClassName="bg-white"\n        footerStyle={{ padding: "16px" }}'
)

with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated footer style")
