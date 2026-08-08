import re

with open("src/components/hr/MyRequestsTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix header
content = content.replace(
"""      <FullWidthTableLayout
        header={
          {/* Filters & Actions */}
      <div className="d-flex flex-column gap-2">""",
"""      <FullWidthTableLayout
        header={
          <>
          {/* Filters & Actions */}
      <div className="d-flex flex-column gap-2">"""
)

# Fix between header and table
content = content.replace(
"""        </div>
      </div>
        }
        table={
          {loading ? (""",
"""        </div>
      </div>
          </>
        }
        table={
          loading ? ("""
)

# Fix end of table
content = content.replace(
"""              }
            ]}
          />
        )}
        }
      />""",
"""              }
            ]}
          />
        )
        }
      />"""
)

with open("src/components/hr/MyRequestsTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

