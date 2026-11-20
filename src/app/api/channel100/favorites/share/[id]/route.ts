import { NextResponse } from "next/server";
import { getPublicFavoritesVaultById } from "@/lib/dal/channel100";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!id || id === "local") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const vault = await getPublicFavoritesVaultById(id);
    if (!vault) {
      return NextResponse.json(
        { error: "This favorites collection is private or does not exist." },
        { status: 404 }
      );
    }

    return NextResponse.json({ vault });
  } catch (error) {
    console.error("[GET /api/channel100/favorites/share/[id]]", error);
    return NextResponse.json(
      { error: "Failed to load shared favorites" },
      { status: 500 }
    );
  }
}
