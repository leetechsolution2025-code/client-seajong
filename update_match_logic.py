import re

file_path = "src/app/(dashboard)/hr/recruitment/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the match logic in tableData generation
old_match_logic = '''                        if (isExpanded) {
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

new_match_logic = '''                        if (isExpanded) {
                          filteredCandidates.forEach((can: any) => {
                            // Extract campaign skills
                            let reqSkillsText = camp.skills || "";
                            if (!reqSkillsText && typeof camp.requirements === "string") {
                                try {
                                    const parsedReq = JSON.parse(camp.requirements);
                                    reqSkillsText = parsedReq.skills || "";
                                } catch (e) {}
                            }
                            const reqSkillsList = reqSkillsText.toLowerCase().split(/[\\n,]/).map(s => s.trim().replace(/[*•-]/g, '')).filter(Boolean);
                            const canSkillsList = (can.skills || "").toLowerCase().split(/[\\n,]/).map(s => s.trim().replace(/[*•-]/g, '')).filter(Boolean);
                            
                            let skillsScore = 0;
                            if (reqSkillsList.length > 0 && canSkillsList.length > 0) {
                                let matchCount = 0;
                                for (const rs of reqSkillsList) {
                                    if (canSkillsList.some(cs => cs.includes(rs) || rs.includes(cs))) matchCount++;
                                }
                                skillsScore = Math.round((matchCount / reqSkillsList.length) * 100);
                            } else if (reqSkillsList.length === 0) {
                                skillsScore = 100; // If no skills required, it's a match
                            }
                            
                            // Check Experience
                            const reqExpStr = String(camp.experience || "0").replace(/[^0-9]/g, '');
                            const reqExp = parseInt(reqExpStr) || 0;
                            const canExp = parseInt(can.expYears) || 0;
                            
                            let expScore = 100;
                            if (reqExp > 0) {
                                if (canExp >= reqExp) expScore = 100;
                                else if (canExp > 0) expScore = Math.round((canExp / reqExp) * 100);
                                else expScore = 0;
                            }
                            
                            // Overall Match
                            const overallScore = Math.round((skillsScore * 0.7) + (expScore * 0.3));
                            
                            // Generate Summary
                            let matchSummary = `Ứng viên có ${canExp} năm kinh nghiệm`;
                            if (reqExp > 0) {
                                matchSummary += ` (Yêu cầu: ${reqExp} năm). `;
                            } else {
                                matchSummary += `. `;
                            }
                            
                            if (skillsScore >= 80) matchSummary += "Kỹ năng cơ bản đáp ứng rất tốt yêu cầu.";
                            else if (skillsScore >= 50) matchSummary += "Kỹ năng cơ bản đáp ứng ở mức trung bình so với yêu cầu.";
                            else matchSummary += "Kỹ năng cơ bản chưa thực sự sát với yêu cầu tuyển dụng, cần xem xét thêm.";
                            
                            flat.push({ ...can, matchScore: overallScore, matchSummary, isCandidate: true });
                          });
                        }'''

content = content.replace(old_match_logic, new_match_logic)

# 2. Update CandidateDetailOffcanvas to show expYears and use matchSummary
target_offcanvas = '''                <div className="d-flex flex-column gap-2 mb-3 border-bottom pb-3">
                  {[
                    { label: "Điện thoại", value: selectedCandidate.phone, icon: "bi-telephone" },
                    { label: "Email", value: selectedCandidate.email, icon: "bi-envelope" },
                    { label: "Địa chỉ", value: selectedCandidate.address, icon: "bi-geo-alt" },
                    { label: "Lương mong muốn", value: selectedCandidate.desiredSalary ? `${formatCurrency(selectedCandidate.desiredSalary)} VNĐ` : "--", icon: "bi-cash-stack" },
                    { label: "Link profile", value: selectedCandidate.profileUrl, icon: "bi-link-45deg", isLink: true },
                    ...(selectedCandidate.cvUrl && !selectedCandidate.cvUrl.includes("blank_") ? [{ label: "Link CV gốc", value: selectedCandidate.cvUrl, icon: "bi-file-pdf", isLink: true }] : []),
                  ].map((item, idx) => ('''

replacement_offcanvas = '''                <div className="d-flex flex-column gap-2 mb-3 border-bottom pb-3">
                  {[
                    { label: "Năm kinh nghiệm", value: selectedCandidate.expYears ? `${selectedCandidate.expYears} năm` : "--", icon: "bi-clock-history" },
                    { label: "Trình độ học vấn", value: selectedCandidate.education || "--", icon: "bi-mortarboard" },
                    { label: "Điện thoại", value: selectedCandidate.phone, icon: "bi-telephone" },
                    { label: "Email", value: selectedCandidate.email, icon: "bi-envelope" },
                    { label: "Địa chỉ", value: selectedCandidate.address, icon: "bi-geo-alt" },
                    { label: "Lương mong muốn", value: selectedCandidate.desiredSalary ? `${formatCurrency(selectedCandidate.desiredSalary)} VNĐ` : "--", icon: "bi-cash-stack" },
                    { label: "Link profile", value: selectedCandidate.profileUrl, icon: "bi-link-45deg", isLink: true },
                    ...(selectedCandidate.cvUrl && !selectedCandidate.cvUrl.includes("blank_") ? [{ label: "Link CV gốc", value: selectedCandidate.cvUrl, icon: "bi-file-pdf", isLink: true }] : []),
                  ].map((item, idx) => ('''

content = content.replace(target_offcanvas, replacement_offcanvas)

target_summary = '''                <div>
                  <h6 className="fw-bold mb-2" style={{ fontSize: "14px" }}>Nhận xét chung về ứng viên</h6>
                  <p className="text-dark bg-light p-3 rounded-3 border-start border-primary border-4" style={{ fontSize: "13px", lineHeight: "1.6", fontStyle: "italic" }}>{selectedCandidate.summary}</p>
                </div>'''

replacement_summary = '''                <div>
                  <h6 className="fw-bold mb-2" style={{ fontSize: "14px" }}>Nhận xét chung về ứng viên</h6>
                  <p className="text-dark bg-light p-3 rounded-3 border-start border-primary border-4" style={{ fontSize: "13px", lineHeight: "1.6", fontStyle: "italic" }}>{selectedCandidate.matchSummary || selectedCandidate.summary || "Chưa có nhận xét cho ứng viên này."}</p>
                </div>'''

content = content.replace(target_summary, replacement_summary)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Match logic and offcanvas updated")
