import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update table columns
cols_start = '                      {\n                        header: "Nguồn",'
cols_end = '                      {\n                        header: "Ngày nộp",'
new_cols = '''                      {
                        header: "Kỹ năng cơ bản",
                        width: "37%",
                        render: (row) => row.isFullWidth ? null : <div className="text-truncate" style={{ maxWidth: 250, fontSize: "12px" }}>{row.skills || "--"}</div>
                      },
                      {
                        header: "Ngày nộp",'''

content = re.sub(
    r'                      \{\s*header: "Nguồn",[\s\S]*?\{\s*header: "Ngày nộp",',
    new_cols,
    content
)

# Inject calculateMatchScore logic
injection_point = '                        if (isExpanded) {\n                          filteredCandidates.forEach(can => {\n                            flat.push({ ...can, isCandidate: true });\n                          });\n                        }'

new_injection = '''                        if (isExpanded) {
                          const extractItems = (text: string) => text.toLowerCase().split(/[\\n]/).map(s => s.trim().replace(/[*•-]/g, '')).filter(Boolean);
                          const reqText = camp.skills || (typeof camp.requirements === 'string' ? camp.requirements : '');
                          const rItems = extractItems(reqText);

                          filteredCandidates.forEach((can: any) => {
                            let matchScore = can.matchScore || 0;
                            if (can.skills && rItems.length > 0) {
                              const cItems = extractItems(can.skills);
                              let matchCount = 0;
                              for (const rs of rItems) {
                                if (cItems.some(cs => cs.includes(rs) || rs.includes(cs))) {
                                  matchCount++;
                                }
                              }
                              matchScore = Math.round((matchCount / rItems.length) * 100);
                            }
                            flat.push({ ...can, matchScore, isCandidate: true });
                          });
                        }'''

content = content.replace(injection_point, new_injection)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Table columns and match calculation updated")
