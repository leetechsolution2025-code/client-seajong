import re

file_path = "src/lib/mail-utils.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update signature
target1 = '''  interviewers,
  baseUrl,
  meetingLink,
  customSubject,
  customHtml
}: {
  to: string;
  candidateName: string;
  position: string;
  date: string;
  location: string;
  notes?: string;
  interviewers: string;
  baseUrl?: string;
  meetingLink?: string;
  customSubject?: string;
  customHtml?: string;
}) {'''
replacement1 = '''  interviewers,
  baseUrl,
  meetingLink,
  customSubject,
  customHtml,
  contactName,
  contactPhone
}: {
  to: string;
  candidateName: string;
  position: string;
  date: string;
  location: string;
  notes?: string;
  interviewers: string;
  baseUrl?: string;
  meetingLink?: string;
  customSubject?: string;
  customHtml?: string;
  contactName?: string;
  contactPhone?: string;
}) {'''
if target1 in content:
    content = content.replace(target1, replacement1)

# Update HTML rendering
target2 = '''              <tr>
                <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">👤</span></td>
                <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Người liên hệ:</strong><br><span style="color: #4a5568; font-size: 14px;">${config.fromName} (${config.fromEmail})</span></td>
              </tr>'''
replacement2 = '''              <tr>
                <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">👤</span></td>
                <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Người liên hệ:</strong><br><span style="color: #4a5568; font-size: 14px;">${contactName || config.fromName} ${contactPhone ? `(${contactPhone})` : `(${config.fromEmail})`}</span></td>
              </tr>'''
if target2 in content:
    content = content.replace(target2, replacement2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated mail-utils.ts")
