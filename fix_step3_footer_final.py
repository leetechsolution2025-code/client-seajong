import re

# 1. Revert hr/page.tsx
with open("src/app/(dashboard)/hr/page.tsx", "r", encoding="utf-8") as f:
    hr_content = f.read()

hr_content = hr_content.replace(
    'bottomToolbar={activeTabId === "my-requests" ? <div id="my-requests-toolbar-portal" className="w-100" /> : ApprovalsBottomToolbar}',
    'bottomToolbar={activeTabId === "my-requests" ? null : ApprovalsBottomToolbar}'
)

with open("src/app/(dashboard)/hr/page.tsx", "w", encoding="utf-8") as f:
    f.write(hr_content)


# 2. Revert MyRequestsTab.tsx and use proper footer props
with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    tab_content = f.read()

# Remove portal imports and state
tab_content = tab_content.replace(
    'import React, { useState, useEffect, useMemo } from "react";\nimport { createPortal } from "react-dom";',
    'import React, { useState, useEffect, useMemo } from "react";'
)
tab_content = re.sub(
    r'  const \[portalTarget, setPortalTarget\].*?  }, \[\]\);\n',
    '',
    tab_content,
    flags=re.DOTALL
)

# Extract the portal JSX and put it back into FullWidthTableLayout's footer
start_portal = tab_content.find('{portalTarget && createPortal(')
end_portal = tab_content.find(',\n        portalTarget\n      )}')

if start_portal != -1 and end_portal != -1:
    portal_content = tab_content[start_portal + len('{portalTarget && createPortal('):end_portal]
    # portal_content starts with `\n        <div className="d-flex ...`

    # Remove the portal block
    tab_content = tab_content[:start_portal] + tab_content[end_portal + len(',\n        portalTarget\n      )}'):]

    # Insert back into FullWidthTableLayout
    insert_pos = tab_content.find('tableWrapperClassName=""')
    if insert_pos != -1:
        # Construct the new props
        new_props = 'tableWrapperClassName=""\n        footerClassName="px-3 py-2"\n        footerStyle={{ backgroundColor: "transparent" }}\n        footer={' + portal_content + '}\n        '
        tab_content = tab_content[:insert_pos] + new_props + tab_content[insert_pos + len('tableWrapperClassName=""'):]

with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
    f.write(tab_content)

print("Modification done")
