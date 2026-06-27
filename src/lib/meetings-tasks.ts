import { prisma } from "./prisma";

/**
 * Sync action items from a meeting to the assignee's personal tasks list
 * and send appropriate notifications.
 */
export async function processActionItems(
  meetingId: string,
  meetingTitle: string,
  newActionItems: any[],
  oldActionItems: any[],
  creatorId: string
) {
  // Fetch active users to map names in-memory case-insensitively (SQLite safe)
  const users = await prisma.user.findMany({
    select: { id: true, name: true }
  });
  
  const userMap = new Map<string, string>();
  users.forEach(u => {
    if (u.name) {
      userMap.set(u.name.trim().toLowerCase(), u.id);
    }
  });

  const oldMap = new Map<string, any>();
  oldActionItems.forEach(item => {
    if (item.id) {
      oldMap.set(item.id, item);
    }
  });

  for (const newItem of newActionItems) {
    const { id: itemId, task, assignee, startDate, deadline, completed } = newItem;
    if (!task?.trim() || !assignee?.trim() || !itemId) continue;

    const assigneeId = userMap.get(assignee.trim().toLowerCase());
    if (!assigneeId) {
      console.warn(`[meetings-tasks] Could not find user with name: ${assignee}`);
      continue;
    }

    const oldItem = oldMap.get(itemId);
    const taskTitle = task.trim();
    // Unique matching pattern in description
    const taskDesc = `Công việc được phân công từ cuộc họp.\n\n---\nNguồn: Biên bản cuộc họp - ${meetingTitle}\nID: ${meetingId}_${itemId}`;

    if (!oldItem) {
      // 1. Create a NEW task
      const createdTask = await prisma.task.create({
        data: {
          title: taskTitle,
          description: taskDesc,
          assigneeId,
          creatorId,
          dueDate: deadline ? new Date(deadline) : null,
          priority: "medium",
          status: completed ? "completed" : "pending",
          completedAt: completed ? new Date() : null,
        }
      });

      // Send Notification for new task
      try {
        const dueDateStr = deadline ? new Date(deadline).toLocaleDateString("vi-VN") : "Không có deadline";
        const notification = await prisma.notification.create({
          data: {
            title: "📋 Công việc mới được giao",
            content: `Bạn được giao công việc "${taskTitle}" từ cuộc họp "${meetingTitle}". Hạn chót: ${dueDateStr}.`,
            type: "info",
            priority: "normal",
            audienceType: "group",
            audienceValue: JSON.stringify([assigneeId]),
            createdById: creatorId,
          }
        });
        await prisma.notificationRecipient.create({
          data: { notificationId: notification.id, userId: assigneeId }
        });
      } catch (err) {
        console.error("[meetings-tasks] Failed to send new task notification:", err);
      }
    } else {
      // 2. Existing task. Check if anything changed
      const hasChanged = 
        oldItem.task !== newItem.task ||
        oldItem.assignee !== newItem.assignee ||
        oldItem.startDate !== newItem.startDate ||
        oldItem.deadline !== newItem.deadline ||
        oldItem.completed !== newItem.completed;

      if (hasChanged) {
        // Find existing task by metadata ID tag in description
        const targetIdString = `ID: ${meetingId}_${itemId}`;
        const existingTask = await prisma.task.findFirst({
          where: {
            description: {
              contains: targetIdString
            }
          }
        });

        if (existingTask) {
          // Update existing task
          await prisma.task.update({
            where: { id: existingTask.id },
            data: {
              title: taskTitle,
              description: taskDesc,
              assigneeId,
              dueDate: deadline ? new Date(deadline) : null,
              status: completed ? "completed" : "pending",
              completedAt: completed ? new Date() : (existingTask.status === "completed" ? null : existingTask.completedAt),
            }
          });

          // Send update notification
          try {
            const notification = await prisma.notification.create({
              data: {
                title: "🔄 Công việc được cập nhật",
                content: `Công việc "${taskTitle}" từ cuộc họp "${meetingTitle}" đã có thay đổi mới. Vui lòng kiểm tra lại.`,
                type: "info",
                priority: "normal",
                audienceType: "group",
                audienceValue: JSON.stringify([assigneeId]),
                createdById: creatorId,
              }
            });
            await prisma.notificationRecipient.create({
              data: { notificationId: notification.id, userId: assigneeId }
            });
          } catch (err) {
            console.error("[meetings-tasks] Failed to send update notification:", err);
          }
        } else {
          // Fallback: if task was deleted in tasks app but still exists in meeting action items, recreate it!
          await prisma.task.create({
            data: {
              title: taskTitle,
              description: taskDesc,
              assigneeId,
              creatorId,
              dueDate: deadline ? new Date(deadline) : null,
              priority: "medium",
              status: completed ? "completed" : "pending",
              completedAt: completed ? new Date() : null,
            }
          });
        }
      }
    }
  }
}
