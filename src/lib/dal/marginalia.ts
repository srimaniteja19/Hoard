import { db } from "@/db";
import {
  books,
  marginalia,
  marginaliaPendingMarks,
  BookRow,
  NewBookRow,
  MarginaliaRow,
  NewMarginaliaRow,
  MarginaliaPendingMarkRow,
  NewMarginaliaPendingMarkRow,
} from "@/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { BookStatsSummary } from "@/lib/marginalia/types";

export async function getUserBooks(userId: string): Promise<BookRow[]> {
  return db
    .select()
    .from(books)
    .where(eq(books.userId, userId))
    .orderBy(desc(books.updatedAt));
}

export async function getBookById(userId: string, bookId: string): Promise<BookRow | null> {
  const [row] = await db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .limit(1);
  return row || null;
}

export async function createBook(data: NewBookRow): Promise<BookRow> {
  const [created] = await db.insert(books).values(data).returning();
  return created;
}

export async function updateBook(
  userId: string,
  bookId: string,
  data: Partial<NewBookRow>
): Promise<BookRow | null> {
  const [updated] = await db
    .update(books)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .returning();
  return updated || null;
}

export async function deleteBook(userId: string, bookId: string): Promise<boolean> {
  const res = await db
    .delete(books)
    .where(and(eq(books.id, bookId), eq(books.userId, userId)))
    .returning({ id: books.id });
  return res.length > 0;
}

export async function getBookMarginalia(userId: string, bookId: string): Promise<MarginaliaRow[]> {
  return db
    .select()
    .from(marginalia)
    .where(and(eq(marginalia.bookId, bookId), eq(marginalia.userId, userId)))
    .orderBy(asc(marginalia.chapter), desc(marginalia.createdAt));
}

export async function createMarginaliaNote(data: NewMarginaliaRow): Promise<MarginaliaRow> {
  const [created] = await db.insert(marginalia).values(data).returning();
  // Increment book notesCount
  await db
    .update(books)
    .set({
      notesCount: sql`${books.notesCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(books.id, data.bookId));

  return created;
}

export async function updateMarginaliaNote(
  userId: string,
  noteId: string,
  data: Partial<NewMarginaliaRow>
): Promise<MarginaliaRow | null> {
  const [updated] = await db
    .update(marginalia)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(marginalia.id, noteId), eq(marginalia.userId, userId)))
    .returning();
  return updated || null;
}

export async function deleteMarginaliaNote(userId: string, noteId: string): Promise<boolean> {
  const [deleted] = await db
    .delete(marginalia)
    .where(and(eq(marginalia.id, noteId), eq(marginalia.userId, userId)))
    .returning({ id: marginalia.id, bookId: marginalia.bookId });

  if (deleted) {
    await db
      .update(books)
      .set({
        notesCount: sql`GREATEST(0, ${books.notesCount} - 1)`,
        updatedAt: new Date(),
      })
      .where(eq(books.id, deleted.bookId));
    return true;
  }
  return false;
}

export async function getBookPendingMarks(
  userId: string,
  bookId: string
): Promise<MarginaliaPendingMarkRow[]> {
  return db
    .select()
    .from(marginaliaPendingMarks)
    .where(
      and(
        eq(marginaliaPendingMarks.bookId, bookId),
        eq(marginaliaPendingMarks.userId, userId),
        eq(marginaliaPendingMarks.status, "PENDING")
      )
    )
    .orderBy(asc(marginaliaPendingMarks.createdAt));
}

export async function createPendingMark(
  data: NewMarginaliaPendingMarkRow
): Promise<MarginaliaPendingMarkRow> {
  const [created] = await db.insert(marginaliaPendingMarks).values(data).returning();
  return created;
}

export async function updatePendingMarkStatus(
  userId: string,
  markId: string,
  status: "PENDING" | "PROCESSED" | "DISMISSED"
): Promise<boolean> {
  const res = await db
    .update(marginaliaPendingMarks)
    .set({ status })
    .where(and(eq(marginaliaPendingMarks.id, markId), eq(marginaliaPendingMarks.userId, userId)))
    .returning({ id: marginaliaPendingMarks.id });
  return res.length > 0;
}

export async function deletePendingMark(userId: string, markId: string): Promise<boolean> {
  const res = await db
    .delete(marginaliaPendingMarks)
    .where(and(eq(marginaliaPendingMarks.id, markId), eq(marginaliaPendingMarks.userId, userId)))
    .returning({ id: marginaliaPendingMarks.id });
  return res.length > 0;
}

import { generateShortHash, getLoggedForDate, getUserTimezone } from "@/lib/dal/til";
import { tilEntries, todos } from "@/db/schema";

export async function getMarginaliaStats(userId: string): Promise<BookStatsSummary> {
  const userBooks = await getUserBooks(userId);
  const totalVolumes = userBooks.length;
  const readingCount = userBooks.filter((b) => b.status === "READING").length;
  const finishedCount = userBooks.filter((b) => b.status === "FINISHED").length;

  const totalNotes = userBooks.reduce((acc, b) => acc + (b.notesCount || 0), 0);
  const totalPromoted = userBooks.reduce((acc, b) => acc + (b.promotedCount || 0), 0);

  return {
    totalVolumes,
    totalNotes,
    totalPromoted,
    readingCount,
    finishedCount,
  };
}

export async function promoteMarginaliaToTil(
  userId: string,
  noteId: string
): Promise<{ note: MarginaliaRow; tilId: string; shortHash: string }> {
  const [note] = await db
    .select()
    .from(marginalia)
    .where(and(eq(marginalia.id, noteId), eq(marginalia.userId, userId)))
    .limit(1);

  if (!note) throw new Error("Marginalia note not found");

  const book = await getBookById(userId, note.bookId);
  const timezone = await getUserTimezone(userId);
  const shortHash = await generateShortHash(userId);
  const loggedFor = getLoggedForDate(timezone);

  let body = "";
  if (note.quote) {
    body += `> "${note.quote}"\n\n`;
  }
  if (note.note) {
    body += note.note;
  }
  if (book) {
    body += `\n\n— *${book.title}* by ${book.author} (Ch ${note.chapter}${note.page ? `, p. ${note.page}` : ""})`;
  }

  const [insertedTil] = await db
    .insert(tilEntries)
    .values({
      userId,
      shortHash,
      type: "FACT",
      body: body.trim(),
      loggedFor,
    })
    .returning();

  const [updatedNote] = await db
    .update(marginalia)
    .set({
      promotedTo: "TIL",
      promotedId: insertedTil.id,
      updatedAt: new Date(),
    })
    .where(eq(marginalia.id, noteId))
    .returning();

  await db
    .update(books)
    .set({
      promotedCount: sql`${books.promotedCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(books.id, note.bookId));

  return { note: updatedNote, tilId: insertedTil.id, shortHash };
}

export async function promoteMarginaliaToTodo(
  userId: string,
  noteId: string
): Promise<{ note: MarginaliaRow; todoId: string }> {
  const [note] = await db
    .select()
    .from(marginalia)
    .where(and(eq(marginalia.id, noteId), eq(marginalia.userId, userId)))
    .limit(1);

  if (!note) throw new Error("Marginalia note not found");

  const book = await getBookById(userId, note.bookId);
  const title = note.note || note.quote || "Follow up on marginalia";
  const noteText = `From book: ${book?.title || "Unknown"} (Ch ${note.chapter})\n${note.quote ? `Quote: "${note.quote}"` : ""}`;

  const [insertedTodo] = await db
    .insert(todos)
    .values({
      userId,
      title: title.slice(0, 255),
      note: noteText,
      energy: "SHALLOW",
      estimatedMinutes: 25,
      state: "OPEN",
    })
    .returning();

  const [updatedNote] = await db
    .update(marginalia)
    .set({
      promotedTo: "TODO",
      promotedId: insertedTodo.id,
      updatedAt: new Date(),
    })
    .where(eq(marginalia.id, noteId))
    .returning();

  await db
    .update(books)
    .set({
      promotedCount: sql`${books.promotedCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(books.id, note.bookId));

  return { note: updatedNote, todoId: insertedTodo.id };
}

