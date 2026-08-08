import re

# 1. Fix Toast location
with open("src/components/ui/Toast.tsx", "r", encoding="utf-8") as f:
    toast_content = f.read()

toast_content = toast_content.replace(
    'position: "fixed", bottom: 24, right: 24, zIndex: 99999,',
    'position: "fixed", top: 76, right: 24, zIndex: 99999,'
)
toast_content = toast_content.replace(
    'display: "flex", flexDirection: "column-reverse",',
    'display: "flex", flexDirection: "column",'
)
toast_content = toast_content.replace(
    '{/* Render in column-reverse so newest is on bottom */}',
    '{/* Render in column so newest is on top */}'
)

with open("src/components/ui/Toast.tsx", "w", encoding="utf-8") as f:
    f.write(toast_content)

# 2. Fix Avatar font size
with open("src/components/hr/EmployeeAvatar.tsx", "r", encoding="utf-8") as f:
    avatar_content = f.read()

avatar_content = avatar_content.replace(
    'fontSize = 16,',
    'fontSize,'
)
avatar_content = avatar_content.replace(
    'fontSize: fontSize,',
    'fontSize: fontSize || Math.max(10, Math.floor((typeof size === "number" ? size : 40) * 0.35)),'
)

with open("src/components/hr/EmployeeAvatar.tsx", "w", encoding="utf-8") as f:
    f.write(avatar_content)

print("Done")
