import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { exportUserData } from "@/lib/dal";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
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
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Failed to generate database export." },
      { status: 500 }
    );
  }
}
