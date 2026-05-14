import { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            client: {
              select: {
                id: true, name: true, shortName: true,
                slogan: true, logoUrl: true, phone: true, email: true, address: true,
              },
            },
            employee: {
              select: {
                id: true,
                departmentCode: true,
                departmentName: true,
                position: true,
                level: true,
                status: true,   // dùng để block đăng nhập khi đã nghỉ việc
              },
            },
          },
        });

        if (!user) return null;

        // Block nhân viên đã nghỉ việc khỏi đăng nhập
        if (user.employee?.status === "resigned") return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        // SUPERADMIN không có clientId → tìm master client (CompanyInfo) để lấy thông tin hiển thị
        let clientInfo = user.client;
        if (!user.clientId && user.role === "SUPERADMIN") {
          // Lấy từ CompanyInfo (luôn có 1 dòng, không phụ thuộc vào shortName cứng)
          const companyInfo = await prisma.companyInfo.findFirst({
            select: { name: true, shortName: true, slogan: true, logoUrl: true, phone: true, email: true, address: true },
          });
          if (companyInfo) {
            clientInfo = {
              ...companyInfo,
              id: "master",
            } as typeof clientInfo;
          }
        }

        // Lấy tên phòng ban chính thức từ DepartmentCategory
        let departmentName: string | null = user.employee?.departmentName ?? null;
        if (user.employee?.departmentCode) {
          const deptCat = await prisma.departmentCategory.findUnique({
            where: { code: user.employee.departmentCode },
            select: { nameVi: true },
          });
          if (deptCat) departmentName = deptCat.nameVi;
        }

        // Trầng cấp bậc: Lấy sortOrder của level code từ Category (cap_bac)
        // sortOrder nhỏ hơn = cấp cao hơn (1 = cáo nhất)
        let levelOrder: number | null = null;
        if (user.employee?.level) {
          const levelCat = await prisma.category.findFirst({
            where: { type: "cap_bac", code: user.employee.level },
            select: { sortOrder: true },
          });
          if (levelCat) levelOrder = levelCat.sortOrder;
        }

        // Tra cứu tên chức vụ từ Category (position) theo mã
        let positionName: string | null = null;
        if (user.employee?.position) {
          const posCat = await prisma.category.findFirst({
            where: { type: "position", code: user.employee.position },
            select: { name: true },
          });
          positionName = posCat?.name ?? user.employee.position;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
          clientId: user.clientId ?? null,
          clientName: clientInfo?.name ?? null,
          clientShortName: clientInfo?.shortName ?? null,
          clientSlogan: clientInfo?.slogan ?? null,
          clientLogoUrl: clientInfo?.logoUrl ?? null,
          clientPhone: clientInfo?.phone ?? null,
          clientEmail: clientInfo?.email ?? null,
          clientAddress: clientInfo?.address ?? null,
          employeeId: user.employee?.id ?? null,
          departmentCode: user.employee?.departmentCode ?? null,
          departmentName,
          position: user.employee?.position ?? null,
          positionName,
          level: user.employee?.level ?? null,
          levelOrder,
          permissions: user.permissions ?? "[]",
          deptAccess: user.deptAccess ?? "[]",
        } as User;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.clientId = (user as any).clientId;
        token.clientName = (user as any).clientName;
        token.clientShortName = (user as any).clientShortName;
        token.clientSlogan = (user as any).clientSlogan;
        token.clientLogoUrl = (user as any).clientLogoUrl;
        token.clientPhone = (user as any).clientPhone;
        token.clientEmail = (user as any).clientEmail;
        token.clientAddress = (user as any).clientAddress;
        token.employeeId = (user as any).employeeId;
        token.departmentCode = (user as any).departmentCode;
        token.departmentName = (user as any).departmentName;
        token.position = (user as any).position;
        token.positionName = (user as any).positionName;
        token.level = (user as any).level;
        token.levelOrder = (user as any).levelOrder;
        token.permissions = (user as any).permissions;
        token.deptAccess = (user as any).deptAccess;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.clientId = token.clientId as string | null;
        session.user.clientName = token.clientName as string | null;
        session.user.clientShortName = token.clientShortName as string | null;
        session.user.clientSlogan = token.clientSlogan as string | null;
        session.user.clientLogoUrl = token.clientLogoUrl as string | null;
        session.user.clientPhone = token.clientPhone as string | null;
        session.user.clientEmail = token.clientEmail as string | null;
        session.user.clientAddress = token.clientAddress as string | null;
        session.user.employeeId = token.employeeId as string | null;
        session.user.departmentCode = token.departmentCode as string | null;
        session.user.departmentName = token.departmentName as string | null;
        session.user.position = token.position as string | null;
        session.user.positionName = token.positionName as string | null;
        session.user.level = token.level as string | null;
        session.user.levelOrder = (token.levelOrder as number | null) ?? null;
        session.user.permissions = (token.permissions as string) ?? "[]";
        session.user.deptAccess = (token.deptAccess as string) ?? "[]";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
};
