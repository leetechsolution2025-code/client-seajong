"use client";

import TasksPage from "@/components/my/TasksPage";

export default function MarketingTasksPage() {
  return (
    <TasksPage
      departmentCode="marketing"
      tasksApiUrl="/api/marketing/tasks"
      title="Quản trị công việc"
      description="Ban Giám đốc · Giám sát tiến độ và phân công công việc toàn hệ thống"
      planRedirectPathPattern="/marketing/plan/monthly?id={planId}&focusTask={taskId}"
      departmentNameVi="Marketing"
    />
  );
}
