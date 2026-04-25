import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    clientId: string | null;
    clientName: string | null;
    clientShortName: string | null;
    clientSlogan: string | null;
    clientLogoUrl: string | null;
    clientPhone: string | null;
    clientEmail: string | null;
    clientAddress: string | null;
    employeeId: string | null;
    departmentCode: string | null;
    departmentName: string | null;
    position: string | null;
    positionName: string | null;
    level: string | null;
    levelOrder: number | null;
    permissions: string;
    deptAccess: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      clientId: string | null;
      clientName: string | null;
      clientShortName: string | null;
      clientSlogan: string | null;
      clientLogoUrl: string | null;
      clientPhone: string | null;
      clientEmail: string | null;
      clientAddress: string | null;
      employeeId: string | null;
      departmentCode: string | null;
      departmentName: string | null;
      position: string | null;
      positionName: string | null;
      level: string | null;
      levelOrder: number | null;
      permissions: string;
      deptAccess: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    clientId: string | null;
    clientName: string | null;
    clientShortName: string | null;
    clientSlogan: string | null;
    clientLogoUrl: string | null;
    clientPhone: string | null;
    clientEmail: string | null;
    clientAddress: string | null;
    employeeId: string | null;
    departmentCode: string | null;
    departmentName: string | null;
    position: string | null;
    positionName: string | null;
    level: string | null;
    levelOrder: number | null;
    permissions: string;
    deptAccess: string;
  }
}
