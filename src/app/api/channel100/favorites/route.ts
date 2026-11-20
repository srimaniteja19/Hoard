import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getUserFavoritesVault,
  saveUserFavoritesVault,
} from "@/lib/dal/channel100";
import { FavoritesVault } from "@/lib/channel100/types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ authenticated: false, vault: null });
    }

    const vault = await getUserFavoritesVault(session.user.id);
    return NextResponse.json({ authenticated: true, vault });
  } catch (error) {
    console.error("[GET /api/channel100/favorites]", error);
    return NextResponse.json(
      { error: "Failed to load favorites" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const vault = body?.vault as FavoritesVault | undefined;
    if (!vault || !Array.isArray(vault.items)) {
      return NextResponse.json(
        { error: "Invalid favorites payload" },
        { status: 400 }
      );
    }

    const saved = await saveUserFavoritesVault(session.user.id, vault);
    return NextResponse.json({ success: true, vault: saved });
  } catch (error) {
    console.error("[POST /api/channel100/favorites]", error);
    return NextResponse.json(
      { error: "Failed to save favorites" },
      { status: 500 }
    );
  }
}
