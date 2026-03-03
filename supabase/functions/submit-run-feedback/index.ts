import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const VALID_REASON_CODES = ["too_long", "not_engaging", "wrong_tone", "poor_hook", "other"];

async function upsertMemory(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  videoId: string,
  key: string,
  value: Record<string, unknown>,
) {
  const { data: existing } = await adminClient
    .from("agent_memory")
    .select("id")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .eq("key", key)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await adminClient
      .from("agent_memory")
      .update({ value, source: "feedback", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return;
  }

  await adminClient.from("agent_memory").insert({
    user_id: userId,
    video_id: videoId,
    key,
    value,
    source: "feedback",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing required environment variables" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Missing authorization header" });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  const user = authData?.user;
  if (authError || !user) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const body = await req.json().catch(() => null) as {
    runId?: string;
    reasonCode?: string;
    freeText?: string;
  } | null;

  const runId = body?.runId?.trim();
  const reasonCode = body?.reasonCode?.trim();
  const freeText = body?.freeText?.trim() || null;

  if (!runId || !reasonCode) {
    return jsonResponse(400, { error: "runId and reasonCode are required" });
  }

  if (!VALID_REASON_CODES.includes(reasonCode)) {
    return jsonResponse(400, { error: "Invalid reasonCode" });
  }

  const { data: run, error: runError } = await userClient
    .from("runs")
    .select("id, video_id")
    .eq("id", runId)
    .eq("user_id", user.id)
    .single();

  if (runError || !run) {
    return jsonResponse(404, { error: "Run not found" });
  }

  const { error: feedbackError } = await adminClient.from("run_feedback").insert({
    run_id: runId,
    user_id: user.id,
    video_id: run.video_id,
    reason_code: reasonCode,
    free_text: freeText,
  });

  if (feedbackError) {
    return jsonResponse(500, { error: feedbackError.message });
  }

  await upsertMemory(adminClient, user.id, run.video_id, "latest_feedback", {
    reason_code: reasonCode,
    free_text: freeText,
    run_id: runId,
    submitted_at: new Date().toISOString(),
  });

  return jsonResponse(200, { success: true });
});
