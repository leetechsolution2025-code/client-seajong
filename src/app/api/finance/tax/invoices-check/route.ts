import { NextResponse } from "next/server";

export async function GET() {
  try {
    const invoices: any[] = [];

    return NextResponse.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Lỗi khi tải danh sách hóa đơn"
    }, { status: 500 });
  }
}
