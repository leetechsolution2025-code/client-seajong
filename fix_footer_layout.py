import re

with open("src/components/layout/FullWidthTableLayout.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add to interface
content = content.replace(
    '  tableWrapperClassName?: string;',
    '  tableWrapperClassName?: string;\n  footerClassName?: string;\n  footerStyle?: React.CSSProperties;'
)

# Add to props
content = content.replace(
    '  tableWrapperClassName = "mt-2 border-top",\n}: FullWidthTableLayoutProps',
    '  tableWrapperClassName = "mt-2 border-top",\n  footerClassName,\n  footerStyle,\n}: FullWidthTableLayoutProps'
)

# Update DOM for footer
old_footer = """      {footer && (
        <div className="d-flex align-items-center justify-content-end gap-2 border-top mt-auto flex-shrink-0" style={{ padding: "19px 16px", backgroundColor: "#f8f9fa" }}>
          {footer}
        </div>
      )}"""
new_footer = """      {footer && (
        <div className={cn("d-flex align-items-center border-top mt-auto flex-shrink-0", footerClassName || "justify-content-end gap-2")} style={footerStyle || { padding: "19px 16px", backgroundColor: "#f8f9fa" }}>
          {footer}
        </div>
      )}"""
content = content.replace(old_footer, new_footer)

with open("src/components/layout/FullWidthTableLayout.tsx", "w", encoding="utf-8") as f:
    f.write(content)

# Now in MyRequestsTab.tsx
with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    tab_content = f.read()

tab_content = tab_content.replace(
    '<FullWidthTableLayout\n        tableWrapperClassName=""\n        footer={',
    '<FullWidthTableLayout\n        tableWrapperClassName=""\n        footerClassName="bg-light px-3 py-2"\n        footerStyle={{ padding: "8px 16px" }}\n        footer={'
)

# In MyRequestsTab.tsx, the footer content block has `py-2 w-100`. Let's remove `py-2` from there so it doesn't double-pad.
tab_content = tab_content.replace(
    '<div className="d-flex align-items-center justify-content-between gap-3 py-2 w-100">',
    '<div className="d-flex align-items-center justify-content-between gap-3 w-100">'
)

with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
    f.write(tab_content)

print("Modification done")
