import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import {
  lookupOpenLibrary,
  lookupGoogleBooks,
  lookupItunes,
  resolveBookCover,
} from "@/lib/marginalia/coverResolver";
import { seedHouseStyle } from "@/lib/marginalia/houseMotifs";

export async function POST(req: Request) {
  try {
    await requireUserId(req);
    const body = await req.json();

    const title = (body.title || "").trim();
    const author = (body.author || "").trim();
    const isbn = (body.isbn || "").trim() || null;
    const format = body.format || "AUDIO";
    const customCoverUrl = body.customCoverUrl || null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const house = seedHouseStyle(title, author);

    // Concurrently fetch candidates from each provider for rich user choice
    const [best, olRes, gbRes, itunesRes] = await Promise.all([
      resolveBookCover({ title, author, isbn, format, customCoverUrl }),
      lookupOpenLibrary(isbn, title, author).catch(() => ({ coverUrl: null })),
      lookupGoogleBooks(title, author, isbn).catch(() => ({ coverUrl: null })),
      lookupItunes(title, author).catch(() => ({ coverUrl: null })),
    ]);

    const candidates = [
      ...(customCoverUrl
        ? [{ source: "UPLOAD" as const, url: customCoverUrl, label: "YOUR UPLOAD" }]
        : []),
      ...(olRes.coverUrl
        ? [{ source: "OPEN_LIBRARY" as const, url: olRes.coverUrl, label: "OPEN LIBRARY" }]
        : []),
      ...(gbRes.coverUrl
        ? [{ source: "GOOGLE_BOOKS" as const, url: gbRes.coverUrl, label: "GOOGLE BOOKS" }]
        : []),
      ...(itunesRes.coverUrl
        ? [{ source: "ITUNES" as const, url: itunesRes.coverUrl, label: "iTUNES AUDIOBOOK" }]
        : []),
      { source: "HOUSE" as const, url: "", label: "HOUSE EDITION" },
    ];

    return NextResponse.json({
      best,
      metadata: best.metadata,
      candidates,
      house,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/books/lookup-cover]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
