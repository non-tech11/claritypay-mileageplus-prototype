import { NextResponse } from "next/server";
import { API_ENDPOINTS } from "@/lib/api-index";

export async function GET() {
  return NextResponse.json({
    name: "ClarityPay x MileagePlus prototype API",
    docs: "/api-docs",
    endpoints: API_ENDPOINTS.map(({ method, path, purpose }) => ({
      method,
      path,
      purpose,
    })),
  });
}
