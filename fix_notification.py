import re

file_path = "src/app/api/hr/candidates/status/route.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = '''        const candidateList = groupCandidates
          .map((c: any) => {
            const expText = c.expYears ? `${c.expYears} năm kinh nghiệm` : "Chưa cập nhật số năm kinh nghiệm";
            const eduText = c.education ? ` - Trình độ học vấn: ${c.education}` : "";
            const cvText = (c.cvUrl && !c.cvUrl.includes('blank_')) ? `\\n  ↳ Link CV gốc: [Xem ngay](${c.cvUrl})` : "";
            return `• **${c.name}**\\n  ↳ ${expText}${eduText}${cvText}`;
          })
          .join("\\n\\n");'''

replacement = '''        const candidateList = groupCandidates
          .map((c: any) => {
            let details = `**${c.name}**\\n`;
            details += `◦ Năm kinh nghiệm: **${c.expYears ? `${c.expYears} năm` : "--"}**\\n`;
            details += `◦ Trình độ học vấn: **${c.education || "--"}**\\n`;
            details += `◦ Điện thoại: **${c.phone || "--"}**\\n`;
            details += `◦ Email: **${c.email || "--"}**\\n`;
            details += `◦ Địa chỉ: **${c.address || "--"}**\\n`;
            
            const formatCurrency = (val: any) => val ? new Intl.NumberFormat('vi-VN').format(val) : "";
            details += `◦ Lương mong muốn: **${c.desiredSalary ? `${formatCurrency(c.desiredSalary)} VNĐ` : "--"}**\\n`;
            
            if (c.cvUrl && !c.cvUrl.includes('blank_')) {
                details += `◦ Link CV gốc: [Link](${c.cvUrl})\\n`;
            }
            if (c.skills) {
                const skillsArray = c.skills.split(/[\\n]/).map((s:string) => s.trim().replace(/[*•-]/g, '')).filter(Boolean);
                const skillsStr = skillsArray.join("; ");
                details += `◦ Kỹ năng cơ bản: ${skillsStr}\\n`;
            }
            if (c.matchSummary || c.summary) {
                details += `◦ Nhận xét: *${c.matchSummary || c.summary}*\\n`;
            }
            return details;
          })
          .join("\\n\\n");'''

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated candidate list generation successfully")
else:
    print("Target string not found")
