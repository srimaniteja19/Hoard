"use server";

import { createTilSchema, updateTilSchema, CreateTilInput, UpdateTilInput } from "@/lib/validations/til";
import { revalidatePath } from "next/cache";

export async function createTilAction(input: CreateTilInput) {
  const parsed = createTilSchema.parse(input);

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/til`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Failed to create TIL" }));
    throw new Error(errorData.error || "Failed to create TIL entry");
  }

  revalidatePath("/til");
  return res.json();
}

export async function updateTilAction(id: string, input: UpdateTilInput) {
  const parsed = updateTilSchema.parse(input);

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/til/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Failed to update TIL" }));
    throw new Error(errorData.error || "Failed to update TIL entry");
  }

  revalidatePath("/til");
  return res.json();
}

export async function deleteTilAction(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/til/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete TIL entry");
  }

  revalidatePath("/til");
  return res.json();
}
