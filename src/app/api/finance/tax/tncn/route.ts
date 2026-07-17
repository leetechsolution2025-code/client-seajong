import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Lấy dữ liệu lương quý 2/2026
    const payrolls = await prisma.payroll.findMany({
      where: {
        nam: 2026,
        thang: { in: [4, 5, 6] }
      },
      select: {
        employeeId: true,
        luongCoBan: true,
        phuCap: true,
        thuong: true,
        luongLamThem: true,
        thueTNCN: true,
      }
    });

    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        contractType: true,
        taxCode: true,
      }
    });

    const isLongTerm = (type: string) => type !== "unsigned" && type !== "probation" && type !== "part-time";
    
    const empIdsWithPayroll = new Set(payrolls.map(p => p.employeeId));
    
    // Tờ khai indicators
    let tongSoNguoiLaoDong = employees.length;
    let caNhanCuTru = 0;
    
    let tongThuNhapChiuThue = 0;
    let thuNhapCaNhanCuTru = 0;
    
    let tongThueKhauTru = 0;
    let thueCaNhanCuTru = 0;

    const empPayrollMap = new Map();
    payrolls.forEach(p => {
      if (!empPayrollMap.has(p.employeeId)) {
        empPayrollMap.set(p.employeeId, { income: 0, tax: 0 });
      }
      const data = empPayrollMap.get(p.employeeId);
      data.income += (p.luongCoBan + p.phuCap + p.thuong + p.luongLamThem);
      data.tax += p.thueTNCN;
    });

    employees.forEach(emp => {
      const isCuTru = isLongTerm(emp.contractType);
      if (isCuTru) caNhanCuTru++;
      
      const pr = empPayrollMap.get(emp.id);
      if (pr) {
        tongThuNhapChiuThue += pr.income;
        tongThueKhauTru += pr.tax;
        
        if (isCuTru) {
          thuNhapCaNhanCuTru += pr.income;
          thueCaNhanCuTru += pr.tax;
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        chiTieu16: tongSoNguoiLaoDong,
        chiTieu17: caNhanCuTru,
        chiTieu21: tongThuNhapChiuThue,
        chiTieu22: thuNhapCaNhanCuTru,
        chiTieu24: tongThuNhapChiuThue, // Giả sử toàn bộ TNCT đều thuộc diện phải khấu trừ
        chiTieu28: tongThueKhauTru,
        chiTieu31: thueCaNhanCuTru
      }
    });
  } catch (error) {
    console.error("[TNCN_SYNC_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Lỗi đồng bộ dữ liệu nhân sự" },
      { status: 500 }
    );
  }
}
