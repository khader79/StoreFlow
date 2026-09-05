import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { buildStoreContext } from "@/lib/store-context";
import { STORE_IDS } from "@/lib/tenant";

export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

const recommendationSchema = z.object({
  recommendations: z
    .array(
      z.object({
        category: z.enum(["restock", "pricing", "insight", "operational"]),
        title: z.string().describe("Short, human-readable title"),
        message: z.string().describe("Actionable, data-grounded alert message"),
        priority: z.enum(["high", "medium", "low"]),
        data: z.record(z.string(), z.unknown()).default({}),
      })
    )
    .min(1)
    .max(8)
    .describe("Proactive alerts grounded ONLY in the provided store data"),
});

async function clearOldRecommendations(storeId: number): Promise<void> {
  try {
    await supabase
      .from("ai_recommendations")
      .delete()
      .eq("store_id", storeId)
      .lte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  } catch {
    // Best effort cleanup; never fails the cron run.
  }
}

async function insertRecommendations(
  storeId: number,
  recs: Array<unknown>
): Promise<number> {
  const rows = recs.map((r) => ({
    store_id: storeId,
    category: (r as { category: string }).category,
    title: (r as { title: string }).title,
    message: (r as { message: string }).message,
    priority: (r as { priority: string }).priority,
    data: (r as { data?: unknown }).data ?? null,
  }));
  const { error } = await supabase.from("ai_recommendations").insert(rows);
  if (error) throw error;
  return rows.length;
}

async function isAuthorized(req: Request): Promise<boolean> {
  if (!CRON_SECRET || CRON_SECRET.length === 0) {
    // No secret configured: keep the endpoint callable for local testing only
    // when the request does NOT claim a bearer token. Production should set it.
    return true;
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : auth.trim();
  return token.length > 0 && token === CRON_SECRET;
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 }
    );
  }
  if (!(await isAuthorized(req))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  return runNightlyInsights();
}

export async function GET(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 }
    );
  }
  if (!(await isAuthorized(req))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  return runNightlyInsights();
}

async function runNightlyInsights() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const googleAI = createGoogleGenerativeAI({ apiKey: apiKey || "" });
  const summary: Array<{ storeId: number; inserted: number; error?: string }> = [];
  for (const storeId of STORE_IDS) {
    try {
      const context = await buildStoreContext(storeId);
      const system = `You are StoreFlow's overnight analyst. You receive a retail
store's live products and 6-month sales data. Read the data for OVERNIGHT red flags
and opportunities such as: products at or near reorder point, fast movers about to
sell out, declining or spiking sales, margin pressure, brand-new/dormant inventory.
Return ONLY grounded, actionable alerts as a JSON array. Do not invent numbers.`;
      const { object } = await generateObject({
        model: googleAI(process.env.GEMINI_MODEL || "gemini-2.0-flash"),
        schema: recommendationSchema,
        system,
        prompt: `STORE DATA (JSON):\n${JSON.stringify(
          context
        )}\n\nGenerate proactive alerts for the store owner.`,
      });
      const inserted = await insertRecommendations(storeId, object.recommendations);
      await clearOldRecommendations(storeId);
      summary.push({ storeId, inserted });
    } catch (err) {
      summary.push({
        storeId,
        inserted: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return Response.json({ ok: true, generated: new Date().toISOString(), summary });
}