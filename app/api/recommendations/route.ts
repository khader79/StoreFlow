import { getAiRecommendations } from "@/lib/ai-recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recommendations = await getAiRecommendations();
    return Response.json(recommendations);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load alerts." },
      { status: 500 }
    );
  }
}