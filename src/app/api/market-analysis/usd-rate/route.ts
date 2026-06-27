import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    const data = await res.json();
    if (data && data.rates && data.rates.VND) {
      return NextResponse.json({ success: true, rate: data.rates.VND });
    }
    throw new Error("Không lấy được tỷ giá từ API");
  } catch (err: any) {
    console.error("Error fetching USD rate:", err);
    // Fallback rate if API is down
    return NextResponse.json({ success: true, rate: 25460, isFallback: true });
  }
}
