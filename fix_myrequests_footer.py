import re

with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace header={ with footer={
# But wait, there might be other "header=" in the file (e.g. table columns).
# We only want to replace the one right after FullWidthTableLayout
content = content.replace(
    '<FullWidthTableLayout\n        tableWrapperClassName=""\n        header={',
    '<FullWidthTableLayout\n        tableWrapperClassName=""\n        footer={'
)

# And add w-100 to the container so it spans full width in the footer
content = content.replace(
    '{/* Filters & Actions */}\n      <div className="d-flex flex-column gap-2">',
    '{/* Filters & Actions */}\n      <div className="d-flex flex-column gap-2 w-100">'
)

with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Moved to footer")
