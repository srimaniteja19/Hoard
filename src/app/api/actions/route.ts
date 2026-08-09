import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, bookmark } = body;

    if (action === "add_bookmark" || bookmark) {
      console.log("[API /api/actions] Received bookmark capture:", bookmark);
      
      return NextResponse.json(
        {
          success: true,
          message: "Bookmark saved to HOARD successfully.",
          bookmark,
        },
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid action payload" },
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "API Error";
    return NextResponse.json(
      { success: false, error: msg },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { status: "ok", service: "HOARD Link API v1.0.0" },
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
