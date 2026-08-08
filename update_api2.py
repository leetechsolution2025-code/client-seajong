import re

file_path = "src/app/api/hr/candidates/schedule-interview/route.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update destructured body
target1 = '''      customHtml,
      customSubject,
      actionType
    } = body;'''
replacement1 = '''      customHtml,
      customSubject,
      actionType,
      contactName,
      contactPhone
    } = body;'''
if target1 in content:
    content = content.replace(target1, replacement1)

# 2. Update draft template HTML
target2 = '''              <tr>
                <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">👤</span></td>
                <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Người liên hệ:</strong><br><span style="color: #4a5568; font-size: 14px;">${config?.fromName || companyName} (${config?.fromEmail || ""})</span></td>
              </tr>'''
replacement2 = '''              <tr>
                <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">👤</span></td>
                <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Người liên hệ:</strong><br><span style="color: #4a5568; font-size: 14px;">${contactName || config?.fromName || companyName} ${contactPhone ? `(${contactPhone})` : `(${config?.fromEmail || ""})`}</span></td>
              </tr>'''
if target2 in content:
    content = content.replace(target2, replacement2)

# 3. Update sendInterviewEmail call
target3 = '''          interviewers: interviewerNames,
          baseUrl: baseUrl,
          customHtml,
          customSubject
        });'''
replacement3 = '''          interviewers: interviewerNames,
          baseUrl: baseUrl,
          customHtml,
          customSubject,
          contactName,
          contactPhone
        });'''
if target3 in content:
    content = content.replace(target3, replacement3)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated route.ts to pass contactName and contactPhone")
