import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type InsightInput = {
  key: string;
  value: string;
  priority?: number;
  agentName?: string | null;
  appliesGlobally?: boolean;
};

function isAuthorized(req: Request): boolean {
  const token = req.headers.get("x-openclaw-token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const expected = Deno.env.get("OPENCLAW_SERVICE_TOKEN");
  return Boolean(expected && token && token === expected);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });
  if (!isAuthorized(req)) return jsonResponse(401, { error: "Unauthorized" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: "Missing required environment variables" });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => null) as {
    jobId?: string;
    userId?: string;
    videoId?: string;
    source?: string;
    rawSummary?: string;
    insights?: InsightInput[];
    status?: "completed" | "failed";
    errorMessage?: string;
  } | null;

  const userId = body?.userId?.trim();
  const source = body?.source?.trim() || "openclaw";
  const videoId = body?.videoId?.trim() || null;
  const jobId = body?.jobId?.trim();
  const rawSummary = body?.rawSummary?.trim() || null;
  const status = body?.status || "completed";
  const insights = Array.isArray(body?.insights) ? body!.insights : [];

  if (!userId) return jsonResponse(400, { error: "userId is required" });

  const normalizedInsights = insights
    .filter((insight) => insight?.key && insight?.value)
    .map((insight) => ({
      key: insight.key.trim(),
      value: insight.value.trim(),
      priority: Math.max(1, Number(insight.priority ?? 1)),
      agent_name: insight.agentName ?? null,
      applies_globally: Boolean(insight.appliesGlobally),
    }));

  if (normalizedInsights.length > 0) {
    const memoryRows = normalizedInsights.map((insight) => ({
      user_id: userId,
      video_id: insight.applies_globally ? null : videoId,
      key: insight.key,
      value: {
        text: insight.value,
        source,
        ingested_at: new Date().toISOString(),
      },
      source: "external_insight",
      agent_name: insight.agent_name,
      priority: insight.priority,
      updated_at: new Date().toISOString(),
    }));

    const { error: memoryError } = await adminClient.from("agent_memory").insert(memoryRows);
    if (memoryError) return jsonResponse(500, { error: memoryError.message });
  }

  const { error: insightError } = await adminClient.from("external_insights").insert({
    user_id: userId,
    video_id: videoId,
    source,
    insights: normalizedInsights,
    raw_summary: rawSummary,
  });

  if (insightError) return jsonResponse(500, { error: insightError.message });

  if (jobId) {
    await adminClient
      .from("analysis_jobs")
      .update({
        status,
        payload: {
          processed_at: new Date().toISOString(),
          insight_count: normalizedInsights.length,
          error: body?.errorMessage ?? null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  return jsonResponse(200, { success: true, insightCount: normalizedInsights.length });
});
