import re

files_to_modify = [
    "src/app/(dashboard)/hr/page.tsx",
    "src/app/(dashboard)/hr/approvals/page.tsx"
]

for file_path in files_to_modify:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove border-top from the container
    content = content.replace(
        '<div className="h-100 bg-white border-top overflow-auto">',
        '<div className="h-100 bg-white overflow-auto">'
    )
    
    # Pass tableWrapperClassName to FullWidthTableLayout
    content = content.replace(
        '<FullWidthTableLayout\n                table={',
        '<FullWidthTableLayout\n                tableWrapperClassName=""\n                table={'
    )
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

# Now modify MyRequestsTab.tsx
with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '<FullWidthTableLayout\n        header={',
    '<FullWidthTableLayout\n        tableWrapperClassName=""\n        header={'
)

with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Modification done")
