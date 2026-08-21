import { requireUserId, AuthError } from "@/lib/session";
import { streamLibraryAsk, type AskUIMessage } from "@/lib/library/askLibrary";
import { gatewayErrorMessage } from "@/lib/ai/models";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();
    const messages = (body.messages ?? []) as AskUIMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("messages required", { status: 400 });
    }

    const result = await streamLibraryAsk(userId, messages);
    return result.toUIMessageStreamResponse({
      onError: gatewayErrorMessage,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return new Response("Unauthorized", { status: 401 });
    }
    console.error("[POST /api/library/ask]", e);
    return new Response("Server error", { status: 500 });
  }
}
