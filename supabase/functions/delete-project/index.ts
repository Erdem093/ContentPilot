import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

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

  const body = await req.json().catch(() => null) as { videoId?: string } | null;
  const videoId = body?.videoId?.trim();

  if (!videoId) {
    return jsonResponse(400, { error: "videoId is required" });
  }

  const { data: video, error: videoError } = await userClient
    .from("videos")
    .select("id")
    .eq("id", videoId)
    .eq("user_id", user.id)
    .single();

  if (videoError || !video) {
    return jsonResponse(404, { error: "Project not found" });
  }

  const { data: runRows, error: runReadError } = await adminClient
    .from("runs")
    .select("id")
    .eq("video_id", videoId)
    .eq("user_id", user.id);

  if (runReadError) {
    return jsonResponse(500, { error: runReadError.message });
  }

  const runIds = (runRows || []).map((row) => row.id);

  if (runIds.length > 0) {
    const { error: artifactDeleteError } = await adminClient
      .from("artifacts")
      .delete()
      .in("run_id", runIds)
      .eq("user_id", user.id);

    if (artifactDeleteError) {
      return jsonResponse(500, { error: artifactDeleteError.message });
    }
  }

  const cleanupDeletes = await Promise.all([
    adminClient.from("run_feedback").delete().eq("video_id", videoId).eq("user_id", user.id),
    adminClient.from("analysis_jobs").delete().eq("video_id", videoId).eq("user_id", user.id),
    adminClient.from("external_insights").delete().eq("video_id", videoId).eq("user_id", user.id),
    adminClient.from("agent_memory").delete().eq("video_id", videoId).eq("user_id", user.id),
    adminClient.from("runs").delete().eq("video_id", videoId).eq("user_id", user.id),
  ]);

  const cleanupError = cleanupDeletes.find((result) => result.error)?.error;
  if (cleanupError) {
    return jsonResponse(500, { error: cleanupError.message });
  }

  const { error: videoDeleteError } = await adminClient
    .from("videos")
    .delete()
    .eq("id", videoId)
    .eq("user_id", user.id);

  if (videoDeleteError) {
    return jsonResponse(500, { error: videoDeleteError.message });
  }

  return jsonResponse(200, { success: true, videoId });
});
