"use client";

import React from "react";
import { StandardPage } from "@/components/layout/StandardPage";
import { LeaveRequest } from "@/components/personal/LeaveRequest";

export default function LeaveRequestPage() {
  return (
    <StandardPage
      title="Yêu cầu cá nhân"
      description="Tạo và theo dõi đơn xin nghỉ phép, nghỉ ốm, tạm ứng lương, tạm ứng và hoàn tạm ứng"
      icon="bi-patch-check"
      color="indigo"
      useCard={false}
      paddingClassName="p-2"
    >
      <LeaveRequest />
    </StandardPage>
  );
}
