import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get unprocessed webhooks
    const { data: webhooks, error: fetchError } = await supabase
      .from("webhooks_inbox")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error("Error fetching webhooks:", fetchError);
      throw fetchError;
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const webhook of webhooks || []) {
      try {
        // Process webhook payload based on source
        if (webhook.source === "instagram") {
          await processInstagramData(supabase, webhook.payload);
        }

        // Mark as processed
        await supabase
          .from("webhooks_inbox")
          .update({ 
            processed: true, 
            processed_at: new Date().toISOString() 
          })
          .eq("id", webhook.id);

        processedCount++;
      } catch (error) {
        console.error(`Error processing webhook ${webhook.id}:`, error);
        errorCount++;
      }
    }

    // Update cron status
    await supabase.from("cron_status").upsert({
      name: "process_inbox",
      last_run_at: new Date().toISOString(),
      last_ok: errorCount === 0,
      last_message: `Processed ${processedCount} webhooks, ${errorCount} errors`
    });

    // Log completion
    await supabase.from("event_logs").insert({
      event: "cron:process_inbox_completed",
      level: errorCount > 0 ? "warn" : "info",
      context: { processedCount, errorCount },
      page: "cron"
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      processedCount, 
      errorCount 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Unexpected error in process_inbox:", error);
    
    // Update cron status with error
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    await supabase.from("cron_status").upsert({
      name: "process_inbox",
      last_run_at: new Date().toISOString(),
      last_ok: false,
      last_message: `Error: ${error}`
    });

    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processInstagramData(supabase: any, payload: any) {
  // Extract reels data from Instagram payload
  const reels = payload.reels || [];
  
  for (const reelData of reels) {
    // Insert or update reel
    const { data: reel, error: reelError } = await supabase
      .from("reels")
      .upsert({
        instagram_id: reelData.id,
        url: reelData.url,
        caption: reelData.caption,
        posted_at: reelData.posted_at,
        thumbnail_url: reelData.thumbnail_url,
        duration_seconds: reelData.duration_seconds,
        hashtags: reelData.hashtags,
        model_id: reelData.model_id,
        workspace_id: reelData.workspace_id
      }, { 
        onConflict: "instagram_id" 
      })
      .select()
      .single();

    if (reelError) {
      console.error("Error upserting reel:", reelError);
      continue;
    }

    // Insert daily metrics
    if (reelData.metrics) {
      await supabase.from("reel_metrics_daily").upsert({
        reel_id: reel.id,
        day: new Date().toISOString().split('T')[0],
        views: reelData.metrics.views,
        likes: reelData.metrics.likes,
        comments: reelData.metrics.comments,
        shares: reelData.metrics.shares,
        saves: reelData.metrics.saves,
        watch_time_seconds: reelData.metrics.watch_time_seconds,
        completion_rate: reelData.metrics.completion_rate,
        workspace_id: reelData.workspace_id
      }, { 
        onConflict: "reel_id,day" 
      });
    }
  }
}