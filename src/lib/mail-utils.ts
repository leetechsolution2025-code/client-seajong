
import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import fs from "fs";
import path from "path";

export async function sendInterviewEmail({
  to,
  candidateName,
  position,
  date,
  location,
  notes,
  interviewers,
  baseUrl,
  meetingLink
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
}) {
  // 1. Fetch active SMTP config
  const config = await (prisma as any).emailConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" }
  });

  if (!config) {
    console.error("No active EmailConfig found in DB");
    return { success: false, error: new Error("Chưa cấu hình SMTP. Vui lòng nhấn vào nút bánh răng để thiết lập.") };
  }

  // 1.1 Fetch Company Info for Branding
  const company = await (prisma as any).companyInfo.findFirst();
  const companyName = company?.name || config.fromName;
  const companySlogan = company?.slogan || "";
  const companyAddress = company?.address || "";
  const companyPhone = company?.phone || "";
  const companyWebsite = company?.website || "";

  // 1.2 Handle Logo for CID Attachment
  const attachments: any[] = [];
  let logoCid = "";

  if (company?.logoUrl) {
    try {
      const filePath = path.join(process.cwd(), "public", company.logoUrl);
      if (fs.existsSync(filePath)) {
        logoCid = "company-logo-cid";
        attachments.push({
          filename: 'logo' + path.extname(filePath),
          path: filePath,
          cid: logoCid // Same as in img src
        });
      }
    } catch (err) {
      console.error("Logo Attachment Error:", err);
    }
  }

  // 2. Create transporter
  const isSecure = config.port === 465 ? true : (config.port === 587 ? false : config.secure);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: isSecure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // 3. Compose email
  const formattedDate = new Date(date).toLocaleString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const htmlContent = `
    <div style="background-color: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e6ebf1;">
        
        <!-- Header with Branding -->
        <div style="padding: 30px 20px; text-align: center; border-bottom: 1px solid #f0f4f8;">
          ${logoCid ? `
            <div style="margin-bottom: 15px;">
              <img src="cid:${logoCid}" alt="Logo" style="max-height: 60px; width: auto; display: inline-block; border: 0;">
            </div>
          ` : ""}
          <div style="font-size: 16px; font-weight: 600; color: #003087; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3;">${companyName}</div>
          ${companySlogan ? `<div style="font-size: 13px; color: #718096; font-style: italic; margin-top: 6px;">${companySlogan}</div>` : ""}
        </div>

        <!-- Banner -->
        <div style="background: #003087; color: #ffffff; padding: 18px; text-align: center;">
          <h1 style="margin: 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Thư Mời Phỏng Vấn</h1>
        </div>

        <!-- Body -->
        <div style="padding: 35px 30px; color: #4a5568;">
          <p style="font-size: 15px; margin-top: 0;">Xin chào <strong>${candidateName}</strong>,</p>
          
          <p style="font-size: 14px; line-height: 1.7;">Cảm ơn bạn đã dành thời gian ứng tuyển vào vị trí <strong>${position}</strong> tại <strong>${companyName}</strong>! Chúng tôi đã xem xét hồ sơ của bạn và rất ấn tượng với những gì bạn đã thể hiện. Vì vậy, chúng tôi trân trọng mời bạn tham gia buổi phỏng vấn trực tiếp để cùng trao đổi sâu hơn về cơ hội hợp tác.</p>
          
          <!-- Information Box -->
          <div style="background-color: #f8fafc; border-radius: 10px; padding: 22px; margin: 30px 0; border: 1px solid #edf2f7;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">🕒</span></td>
                <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Thời gian:</strong><br><span style="color: #4a5568; font-size: 14px;">${formattedDate}</span></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">📍</span></td>
                <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Địa điểm:</strong><br><span style="color: #4a5568; font-size: 14px;">${location}</span></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; width: 30px; vertical-align: top;"><span style="font-size: 16px;">👤</span></td>
                <td style="padding: 6px 0;"><strong style="color: #2d3748; font-size: 14px;">Người liên hệ:</strong><br><span style="color: #4a5568; font-size: 14px;">${config.fromName} (${config.fromEmail})</span></td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; line-height: 1.7;">Nếu thời gian trên chưa phù hợp, bạn vui lòng phản hồi lại email này để chúng tôi có thể sắp xếp lại lịch phỏng vấn. Hãy xác nhận sự tham gia của bạn trước khi buổi phỏng vấn diễn ra.</p>

          ${meetingLink ? `
          <!-- Online Meeting Button -->
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 14px; margin-bottom: 15px; color: #4a5568;">Vui lòng tham gia buổi phỏng vấn trực tuyến qua đường dẫn sau:</p>
            <a href="${meetingLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25);">
              THAM GIA PHỎNG VẤN ONLINE
            </a>
          </div>
          ` : ""}
          
          ${notes ? `
            <div style="background-color: #fffaf0; padding: 15px; border-radius: 8px; border-left: 4px solid #f6ad55; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #744210;"><strong>📝 Ghi chú từ nhà tuyển dụng:</strong><br>${notes}</p>
            </div>
          ` : ""}

          <p style="margin-top: 30px; font-size: 14px;">Chúng tôi rất mong được gặp bạn!</p>
          
          <div style="margin-top: 45px; border-top: 1px solid #edf2f7; padding-top: 20px;">
            <p style="margin: 0; font-size: 13px; color: #a0aec0;">Trân trọng,</p>
            <p style="margin: 5px 0; font-size: 15px; font-weight: bold; color: #003087;">Ban Tuyển dụng ${companyName}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f7fafc; padding: 30px 25px; text-align: center; border-top: 1px solid #edf2f7;">
          ${companyAddress ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #718096; line-height: 1.5;">📍 ${companyAddress}</p>` : ""}
          <p style="margin: 0; font-size: 12px; color: #718096;">
            ${companyPhone ? `📞 ${companyPhone}` : ""} 
            ${companyWebsite ? ` &nbsp;|&nbsp; 🌐 ${companyWebsite}` : ""}
            ${config.fromEmail ? ` &nbsp;|&nbsp; 📧 ${config.fromEmail}` : ""}
          </p>
          <p style="margin-top: 15px; color: #cbd5e0; font-size: 10px;">Đây là thông báo tự động từ hệ thống quản trị nội bộ Seajong. Vui lòng không trả lời trực tiếp hòm thư này.</p>
        </div>
      </div>
    </div>
  `;

  // 4. Send email
  try {
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject: `Mời bạn tham gia phỏng vấn – ${position} tại ${companyName}`,
      html: htmlContent,
      attachments: attachments
    });
    console.log("Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

export async function sendOfferEmail({
  to,
  candidateName,
  position,
  salary,
  startDate,
  startTime,
  location,
  benefits,
  deadline,
  phone,
  email,
  senderName,
}: {
  to: string;
  candidateName: string;
  position: string;
  salary: string;
  startDate: string;
  startTime: string;
  location: string;
  benefits: string;
  deadline: string;
  phone: string;
  email: string;
  senderName: string;
}) {
  const config = await (prisma as any).emailConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" }
  });

  if (!config) return { success: false, error: new Error("Chưa cấu hình SMTP") };

  const company = await (prisma as any).companyInfo.findFirst();
  const companyName = company?.name || config.fromName;
  const logoCid = "company-logo-cid";
  const attachments: any[] = [];

  if (company?.logoUrl) {
    try {
      const filePath = path.join(process.cwd(), "public", company.logoUrl);
      if (fs.existsSync(filePath)) {
        attachments.push({ filename: 'logo' + path.extname(filePath), path: filePath, cid: logoCid });
      }
    } catch (err) { console.error("Logo Attachment Error:", err); }
  }

  const transporter = nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    tls: { rejectUnauthorized: false }
  });

  const htmlContent = `
    <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="padding: 30px; text-align: center; border-bottom: 1px solid #f1f5f9;">
          ${company?.logoUrl ? `<img src="cid:${logoCid}" alt="Logo" style="height: 50px; margin-bottom: 15px;">` : ""}
          <h2 style="margin: 0; color: #003087; font-size: 20px; text-transform: uppercase;">Thư Mời Làm Việc</h2>
        </div>
        <div style="padding: 40px 30px;">
          <p>Bạn <strong>${candidateName}</strong> thân mến,</p>
          <p>Lời đầu tiên, chúng tôi vô cùng cảm ơn vì bạn đã quan tâm và dành thời gian ứng tuyển vị trí <strong>${position}</strong> tại công ty chúng tôi. Thông qua buổi phỏng vấn cũng như trao đổi, chúng tôi đánh giá cao kinh nghiệm và kỹ năng của bạn.</p>
          <p>Bởi vậy, chúng tôi xin trân trọng mời bạn gia nhập vào đội ngũ công ty <strong>${companyName}</strong>, với vị trí <strong>${position}</strong>. Bạn vui lòng bắt đầu đến nhận việc vào <strong>${startDate}</strong>, từ <strong>${startTime}</strong>, tại <strong>${location}</strong>.</p>
          <p>Như đã thỏa thuận, mức lương khởi điểm bạn sẽ nhận được là <strong>${salary}</strong>, kèm theo các chính sách hỗ trợ khác như <strong>${benefits}</strong>.</p>
          <p>Khi nhận được email này, bạn vui lòng xác nhận lại cho chúng tôi trước <strong>${deadline}</strong>. Nếu có bất cứ thắc mắc nào, bạn hãy liên hệ với chúng tôi qua số điện thoại <strong>${phone}</strong> hoặc email <strong>${email}</strong>.</p>
          <p>Chúng tôi rất mong đợi được đón tiếp bạn như một thành viên của đội ngũ. Xin chân thành cảm ơn bạn!</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0;">Trân trọng,</p>
            <p style="margin: 5px 0; font-weight: bold; color: #003087;">${senderName}</p>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
          <p style="margin: 0;">📍 ${company?.address || ""}</p>
          <p style="margin: 5px 0;">📞 ${company?.phone || ""}</p>
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject: `${companyName} _ Thư mời làm việc`,
      html: htmlContent,
      attachments
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error };
  }
}
