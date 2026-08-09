import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { exportUserData } from "@/lib/dal";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    const dateStr = new Date().toISOString().split("T")[0];

    const exportData = await exportUserData(userId);
    const jsonString = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="hoard-export-${dateStr}.json"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate database export." },
      { status: 500 }
    );
  }
}
