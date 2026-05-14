
import { prisma } from "./prisma";

export async function notifyHRManager(title: string, content: string, senderId: string, attachments?: string) {
  return notifyUsersByPosition(["Trưởng phòng Nhân sự", "TPNS", "vtr-20260401-1964-sbmg"], title, content, senderId, attachments);
}

export async function notifyDirector(title: string, content: string, senderId: string, attachments?: string) {
  return notifyUsersByPosition(["Giám đốc", "Tổng Giám đốc", "vtr-20260401-8730-eauc"], title, content, senderId, attachments);
}

async function notifyUsersByPosition(positions: string[], title: string, content: string, senderId: string, attachments?: string) {
  try {
    const managers = await prisma.employee.findMany({
      where: {
        status: "active",
        OR: positions.map(p => ({ position: { contains: p } }))
      },
      select: { userId: true, fullName: true }
    });

    const validUserIds = managers.map(m => m.userId).filter(Boolean) as string[];

    if (validUserIds.length === 0) {
      console.warn(`[notifyUsersByPosition] Could not find any users with positions: ${positions.join(", ")}`);
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        type: "info",
        priority: "high",
        attachments,
        audienceType: validUserIds.length > 1 ? "group" : "individual",
        audienceValue: validUserIds.length > 1 ? JSON.stringify(validUserIds) : validUserIds[0],
        createdById: senderId
      }
    });

    await Promise.all(
      validUserIds.map(userId => 
        prisma.notificationRecipient.create({
          data: {
            notificationId: notification.id,
            userId: userId,
            isRead: false
          }
        })
      )
    );

    return notification;
  } catch (error) {
    console.error("[notifyUsersByPosition] Error:", error);
    return null;
  }
}

export async function notifyUser(userId: string, title: string, content: string, senderId: string, attachments?: string) {
  try {
    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        type: "info",
        priority: "medium",
        attachments,
        audienceType: "individual",
        audienceValue: userId,
        createdById: senderId
      }
    });

    await prisma.notificationRecipient.create({
      data: {
        notificationId: notification.id,
        userId: userId,
        isRead: false
      }
    });

    return notification;
  } catch (error) {
    console.error("[notifyUser] Error:", error);
    return null;
  }
}
