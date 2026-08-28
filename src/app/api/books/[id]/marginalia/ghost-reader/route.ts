import { streamText, smoothStream } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getBookById } from "@/lib/dal/marginalia";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

const GHOST_MODEL = "google/gemini-3.5-flash";

export type GhostPersona = "SOCRATES" | "NIETZSCHE" | "FEYNMAN" | "MARCUS_AURELIUS" | "AUTHOR";

const PERSONA_PROMPTS: Record<GhostPersona, (bookTitle: string, bookAuthor: string) => string> = {
  SOCRATES: (title, author) => `You are Socrates, reading "${title}" by ${author} alongside the user.
Your role: Poke the user's note with relentless, sharp, ironic Socratic questioning.
Challenge their unstated assumptions and definitions. Ask what happens in the edge cases.
Keep your response short (2-4 sentences max), punchy, and conversational, like a handwritten margin note.`,

  NIETZSCHE: (title, author) => `You are Friedrich Nietzsche, reading "${title}" by ${author} alongside the user.
Your role: Offer a fierce, incisive counter-critique. Question whether the idea stems from comfort, herd mentality, or true will-to-power.
Use aphoristic, vivid, electrifying language. Keep your response short (2-4 sentences max), like an urgent scrawl in the book's margin.`,

  FEYNMAN: (title, author) => `You are Richard Feynman, reading "${title}" by ${author} alongside the user.
Your role: The ultimate plain-English reality check. Strip all jargon and buzzwords.
Ask: "How would you explain this with a real mechanical or everyday example to a child?"
Keep your response warm, witty, direct, and short (2-4 sentences max).`,

  MARCUS_AURELIUS: (title, author) => `You are Marcus Aurelius, reading "${title}" by ${author} alongside the user.
Your role: Turn this note into immediate Stoic practical action.
Ask: "What does this mean for how you treat people and conduct your duty before sundown today? Don't debate what a good person should be—be one."
Keep your response solemn, grounded, and concise (2-4 sentences max).`,

  AUTHOR: (title, author) => `You are ${author}, the author of "${title}", in an intimate book-club discussion with this reader.
Your role: Respond directly to the reader's note or question with deep nuance from your research and personal philosophy.
Acknowledge their perspective and offer one deeper layer they might have missed.
Keep your response thoughtful, respectful, and concise (2-4 sentences max).`,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const book = await getBookById(userId, id);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      noteContent,
      quote,
      chapter,
      persona = "SOCRATES",
    } = body as {
      noteContent?: string;
      quote?: string;
      chapter?: number;
      persona?: GhostPersona;
    };

    if (!noteContent && !quote) {
      return NextResponse.json({ error: "Note content or quote is required" }, { status: 400 });
    }

    const personaPrompt = PERSONA_PROMPTS[persona as GhostPersona] || PERSONA_PROMPTS.SOCRATES;
    const system = personaPrompt(book.title, book.author);

    const userPrompt = [
      `Volume: "${book.title}" by ${book.author}`,
      chapter ? `Chapter: ${chapter}` : null,
      quote ? `Passage / Quote from Book:\n"${quote}"` : null,
      noteContent ? `Reader's Note / Reflection:\n"${noteContent}"` : null,
      "\nProvide your margin note sparring commentary now:",
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = streamText({
      model: languageModel(GHOST_MODEL),
      system,
      prompt: userPrompt,
      experimental_transform: smoothStream({ chunking: "word", delayInMs: 12 }),
      maxRetries: 1,
      providerOptions: {
        ...gatewayProviderOptions(GHOST_MODEL, ["feature:marginalia-ghost-reader"]),
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
