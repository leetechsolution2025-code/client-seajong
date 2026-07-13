import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "";
  const lowerName = name.toLowerCase();

  // Simulate an AI / internet search to determine market price
  // using realistic estimations for sanitary products in Vietnam
  let price = 0;

  if (lowerName.includes("sen tắm") || lowerName.includes("sen cây")) {
    price = 1500000 + Math.floor(Math.random() * 15) * 100000; // 1.5tr - 3tr
  } else if (lowerName.includes("vòi lavabo") || lowerName.includes("vòi chậu")) {
    price = 800000 + Math.floor(Math.random() * 10) * 100000; // 800k - 1.8tr
  } else if (lowerName.includes("vòi bếp") || lowerName.includes("vòi rửa bát")) {
    price = 900000 + Math.floor(Math.random() * 12) * 100000; // 900k - 2.1tr
  } else if (lowerName.includes("bộ xịt") || lowerName.includes("vòi xịt")) {
    price = 150000 + Math.floor(Math.random() * 10) * 10000; // 150k - 250k
  } else if (lowerName.includes("van") || lowerName.includes("tê")) {
    price = 80000 + Math.floor(Math.random() * 5) * 10000; // 80k - 130k
  } else if (lowerName.includes("gương") || lowerName.includes("kệ")) {
    price = 400000 + Math.floor(Math.random() * 6) * 100000; // 400k - 1tr
  } else {
    // Default fallback based on string length hash to keep it deterministic-ish
    price = 300000 + (name.length * 15000); 
  }
  
  // Round to nearest 10,000
  price = Math.round(price / 10000) * 10000;

  // Add a slight delay to simulate network request
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));

  return NextResponse.json({ price });
}
