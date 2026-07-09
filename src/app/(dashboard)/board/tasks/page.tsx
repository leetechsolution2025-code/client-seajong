"use client";

import TasksPage from "@/components/my/TasksPage";

export default function BoardTasksPage() {
  return (
    <TasksPage
      departmentCode=""
      tasksApiUrl="/api/board/tasks"
      title="Quản trị công việc"
      description="Ban Giám đốc · Giám sát tiến độ và phân công công việc toàn hệ thống"
      planRedirectPathPattern="/board/plan/monthly?id={planId}&focusTask={taskId}"
      departmentNameVi="Toàn công ty"
    />
  );
}
