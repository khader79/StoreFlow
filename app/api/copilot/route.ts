import { streamText, type CoreMessage } from "ai";
import { google } from "@ai-sdk/google";
import { buildStoreContext } from "@/lib/store-context";
import { STORE_ID } from "@/lib/tenant";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "API Key not configured" },
      { status: 400 }
    );
  }

  let body: { messages?: unknown; storeId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid request payload.", detail: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const messages: CoreMessage[] = (
    Array.isArray(body.messages) ? body.messages : []
  ).filter(
    (m): m is CoreMessage =>
      typeof m === "object" &&
      m !== null &&
      "role" in m &&
      "content" in m
  );
  if (messages.length === 0) {
    return Response.json(
      { error: "Invalid request payload.", detail: "messages must be a non-empty array." },
      { status: 400 }
    );
  }

  const storeId =
    (typeof body.storeId === "number" && body.storeId) ||
    (typeof body.storeId === "string" && Number(body.storeId)) ||
    STORE_ID;

  try {
    const context = await buildStoreContext(storeId);

    const system = `You are StoreFlow Copilot, a friendly inventory assistant for a
store owner. You have live access to their store's PRODUCTS and SALES data for
the last 6 months (JSON below). Answer ONLY from that data; if asked about data
you don't have, say so and suggest what you can help with. Keep replies concise
and practical. Currency is USD.

STORE DATA:
${JSON.stringify(context)}`;

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return Response.json(
      {
        error: "Copilot request failed.",
        detail: message,
        hint: /api key|invalid_api_key|permission/i.test(message)
          ? "There is a problem with the AI provider configuration. Check GEMINI_API_KEY."
          : /rate limit|quota|429|resource exhausted/i.test(message)
            ? "The AI provider is rate limited. Try again in a minute."
            : undefined,
      },
      {
        status: /rate limit|quota|429|resource exhausted/i.test(message)
          ? 429
          : /api key|invalid_api_key|permission/i.test(message)
            ? 502
            : 500,
      }
    );
  }
}