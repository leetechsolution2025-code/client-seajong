import re

file_path = "src/app/api/hr/candidates/schedule-interview/route.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add actionType to destructured body (around line 24)
content = content.replace(
    '''      customHtml,
      customSubject
    } = body;''',
    '''      customHtml,
      customSubject,
      actionType
    } = body;'''
)

# Step 2: Only create notifications if actionType !== 'send_email'
# Original: const interviewerNames = selectedInterviewers.map((i: any) => i.fullName).join(", ");
# Replace the block up to step 3.
target_step2 = '''    // 2. Tạo Notifications cho Interviewers
    const interviewerNames = selectedInterviewers.map((i: any) => i.fullName).join(", ");
    for (const inter of selectedInterviewers) {
      try {
        await (prisma as any).notification.create({
          data: {
            title: `[Nhắc việc] Phỏng vấn ứng viên ${candidateNames}`,
            content: `Bạn được lên lịch tham gia phỏng vấn ứng viên **${candidateNames}** cho vị trí **${candidates[0]?.position}**.\\n\\n`
                   + `**Thời gian:** ${formattedDate}\\n`
                   + `**Địa điểm:** ${interviewLocation}\\n\\n`
                   + (interviewNotes ? `**Ghi chú:** ${interviewNotes}\\n\\n` : "")
                   + `Vui lòng chuẩn bị và có mặt đúng giờ.`,
            type: "document",
            priority: "high",
            audienceType: "individual",
            audienceValue: inter.userId,
            createdById: session.user.id,
            recipients: { create: { userId: inter.userId } },
            attachments: JSON.stringify([{
              name: "Xác nhận lịch phỏng vấn",
              url: "#",
              type: "interview_invite",
              candidateIds: candidateIds,
              interviewDate: interviewDate
            }])
          }
        });
      } catch (notifErr) { console.error("Internal notif error:", notifErr); }
    }'''

replacement_step2 = '''    // 2. Tạo Notifications cho Interviewers
    const interviewerNames = selectedInterviewers.map((i: any) => i.fullName).join(", ");
    if (actionType !== 'send_email') {
      for (const inter of selectedInterviewers) {
        try {
          await (prisma as any).notification.create({
            data: {
              title: `[Nhắc việc] Phỏng vấn ứng viên ${candidateNames}`,
              content: `Bạn được lên lịch tham gia phỏng vấn ứng viên **${candidateNames}** cho vị trí **${candidates[0]?.position}**.\\n\\n`
                     + `**Thời gian:** ${formattedDate}\\n`
                     + `**Địa điểm:** ${interviewLocation}\\n\\n`
                     + (interviewNotes ? `**Ghi chú:** ${interviewNotes}\\n\\n` : "")
                     + `Vui lòng chuẩn bị và có mặt đúng giờ.`,
              type: "document",
              priority: "high",
              audienceType: "individual",
              audienceValue: inter.userId,
              createdById: session.user.id,
              recipients: { create: { userId: inter.userId } },
              attachments: JSON.stringify([{
                name: "Xác nhận lịch phỏng vấn",
                url: "#",
                type: "interview_invite",
                candidateIds: candidateIds,
                interviewDate: interviewDate
              }])
            }
          });
        } catch (notifErr) { console.error("Internal notif error:", notifErr); }
      }
    }'''

content = content.replace(target_step2, replacement_step2)

# Step 3: Skip email if actionType === 'schedule_internal'
target_step3 = '''    // 3. Gửi Email tự động cho từng ứng viên (Sử dụng SMTP Config)
    let emailSuccessCount = 0;
    let lastEmailError = null;

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    for (const cand of candidates) {'''

replacement_step3 = '''    // 3. Gửi Email tự động cho từng ứng viên (Sử dụng SMTP Config)
    let emailSuccessCount = 0;
    let lastEmailError = null;
    
    if (actionType === 'schedule_internal') {
       return NextResponse.json({
         message: `Đã lưu lịch phỏng vấn nội bộ thành công.`
       });
    }

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    for (const cand of candidates) {'''

content = content.replace(target_step3, replacement_step3)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated route.ts API successfully")
