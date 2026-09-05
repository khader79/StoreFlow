import { supabase } from "@/lib/supabase";
import { STORE_ID } from "@/lib/tenant";

export interface AiRecommendation {
  id: number;
  store_id: number;
  category: "restock" | "pricing" | "insight" | "operational";
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

const CATEGORY_PRIORITY: Record<AiRecommendation["category"], number> = {
  restock: 0,
  pricing: 1,
  insight: 2,
  operational: 3,
};

const PRIORITY_ORDER: Record<AiRecommendation["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export async function getAiRecommendations(
  storeId = STORE_ID,
  limit = 20
): Promise<AiRecommendation[]> {
  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as AiRecommendation[]).sort((a, b) => {
    const priorityDiff =
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category];
    if (priorityDiff !== 0) return priorityDiff;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}

export async function markRecommendationRead(
  id: number,
  read: boolean
): Promise<void> {
  const { error } = await supabase
    .from("ai_recommendations")
    .update({ is_read: read })
    .eq("id", id);
  if (error) throw error;
}

export async function getUnreadAlertCount(storeId = STORE_ID): Promise<number> {
  const { count, error } = await supabase
    .from("ai_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}