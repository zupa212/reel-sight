import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting inbox processing...");

    // Fetch unprocessed webhooks in batches of 200
    const { data: webhooks, error: fetchError } = await supabase
      .from("webhooks_inbox")
      .select("*")
      .eq("processed", false)
      .limit(200);

    if (fetchError) {
      throw new Error(`Failed to fetch webhooks: ${fetchError.message}`);
    }

    if (!webhooks || webhooks.length === 0) {
      console.log("No unprocessed webhooks found");
      await supabase.from("cron_status").upsert({
        name: "process_inbox",
        last_run_at: new Date().toISOString(),
        last_ok: true,
        last_message: "No webhooks to process"
      });

      return new Response(JSON.stringify({ 
        ok: true, 
        processed: 0, 
        message: "No webhooks to process" 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let processedCount = 0;
    let errorCount = 0;

    // Process each webhook
    for (const webhook of webhooks) {
      try {
        await processApifyDataset(webhook, supabase);
        
        // Mark webhook as processed
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
      last_message: `Processed ${processedCount} webhooks${errorCount > 0 ? `, ${errorCount} errors` : ''}`
    });

    // Refresh materialized views
    try {
      await supabase.rpc("refresh_materialized_views");
    } catch (refreshError) {
      console.error("Error refreshing materialized views:", refreshError);
    }

    // Insert event log
    await supabase.from("event_logs").insert({
      event: "cron:process_inbox_completed",
      level: "info",
      context: { processedCount, errorCount },
      page: "system"
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      processed: processedCount, 
      errors: errorCount 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Unexpected error in process_inbox:", error);
    
    // Update cron status with error
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      await supabase.from("cron_status").upsert({
        name: "process_inbox",
        last_run_at: new Date().toISOString(),
        last_ok: false,
        last_message: `Error: ${error.message}`
      });
    } catch (statusError) {
      console.error("Error updating cron status:", statusError);
    }

    return new Response(JSON.stringify({ 
      ok: false, 
      error: "Internal server error" 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

async function processApifyDataset(webhook: any, supabase: any) {
  const payload = webhook.payload;
  
  // Extract datasetId from payload
  const datasetId = payload?.resource?.defaultDatasetId || payload?.data?.defaultDatasetId;
  
  if (!datasetId) {
    console.log("No datasetId found in webhook payload");
    return;
  }

  console.log(`Processing dataset: ${datasetId}`);

  // Fetch data from Apify dataset
  const apifyToken = Deno.env.get("APIFY_TOKEN");
  if (!apifyToken) {
    throw new Error("APIFY_TOKEN not configured");
  }

  const datasetResponse = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`,
    { method: "GET" }
  );

  if (!datasetResponse.ok) {
    throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`);
  }

  const items = await datasetResponse.json();
  console.log(`Processing ${items.length} items from dataset`);

  const processedModels = new Set<string>();

  for (const item of items) {
    // Skip if no ownerUsername
    if (!item.ownerUsername) {
      continue;
    }

    // Find model by username
    const { data: model } = await supabase
      .from("models")
      .select("id, workspace_id, username")
      .eq("username", item.ownerUsername)
      .single();

    if (!model) {
      console.log(`Model not found for username: ${item.ownerUsername}`);
      continue;
    }

    // Upsert reel
    const { data: reel, error: reelError } = await supabase
      .from("reels")
      .upsert({
        workspace_id: model.workspace_id,
        model_id: model.id,
        platform_post_id: item.id,
        instagram_id: item.id,
        url: item.url,
        caption: item.caption,
        hashtags: item.hashtags || [],
        thumbnail_url: item.displayUrl,
        posted_at: item.timestamp,
        duration_seconds: item.videoDuration ? Math.round(item.videoDuration) : null
      }, {
        onConflict: "workspace_id,platform_post_id",
        ignoreDuplicates: false
      })
      .select("id")
      .single();

    if (reelError) {
      console.error("Error upserting reel:", reelError);
      continue;
    }

    // Upsert reel metrics for today
    const today = new Date().toISOString().split('T')[0];
    
    await supabase
      .from("reel_metrics_daily")
      .upsert({
        workspace_id: model.workspace_id,
        reel_id: reel.id,
        day: today,
        views: item.videoPlayCount || item.videoViewCount || 0,
        likes: item.likesCount || 0,
        comments: item.commentsCount || 0,
        saves: 0,
        shares: 0,
        watch_time_seconds: 0,
        completion_rate: 0
      }, {
        onConflict: "reel_id,day",
        ignoreDuplicates: false
      });

    processedModels.add(model.id);
  }

  // Update processed models
  for (const modelId of processedModels) {
    await supabase
      .from("models")
      .update({
        last_scraped_at: new Date().toISOString(),
        backfill_completed: true
      })
      .eq("id", modelId);
  }

  console.log(`Processed ${processedModels.size} models from dataset ${datasetId}`);
}