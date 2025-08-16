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

    // Get batch of 200 unprocessed webhooks
    const { data: webhooks, error: fetchError } = await supabase
      .from("webhooks_inbox")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(200);

    if (fetchError) {
      console.error("Error fetching webhooks:", fetchError);
      throw fetchError;
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const webhook of webhooks || []) {
      try {
        // Extract datasetId from payload
        const datasetId = webhook.payload?.resource?.defaultDatasetId;
        
        if (datasetId) {
          await processApifyDataset(supabase, datasetId);
        }

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

    // Update cron_status
    await supabase.from("cron_status").upsert({
      name: "process_inbox",
      last_run_at: new Date().toISOString(),
      last_ok: errorCount === 0,
      last_message: `Processed ${processedCount} webhooks, ${errorCount} errors`
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

    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processApifyDataset(supabase: any, datasetId: string) {
  // Fetch items from Apify dataset
  const apifyToken = Deno.env.get("APIFY_TOKEN");
  if (!apifyToken) {
    throw new Error("APIFY_TOKEN not configured");
  }

  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&format=json`,
    { headers: { 'Accept': 'application/json' } }
  );

  if (!response.ok) {
    throw new Error(`Apify API error: ${response.status}`);
  }

  const items = await response.json();
  console.log(`Processing ${items.length} reel items from dataset ${datasetId}`);

  const processedModels = new Set<string>();

  for (const item of items) {
    try {
      // Resolve model by username
      const { data: model } = await supabase
        .from("models")
        .select("*")
        .eq("username", item.ownerUsername)
        .single();

      if (!model) {
        console.log(`Model not found for username: ${item.ownerUsername}`);
        continue;
      }

      // Upsert into reels
      const reelData = {
        workspace_id: model.workspace_id,
        model_id: model.id,
        platform_post_id: item.id,
        url: item.url,
        caption: item.caption || "",
        hashtags: item.hashtags || [],
        thumbnail_url: item.displayUrl || null,
        posted_at: new Date(item.timestamp).toISOString(),
        duration_seconds: item.videoDuration ? Math.round(item.videoDuration) : null
      };

      const { data: reel, error: reelError } = await supabase
        .from("reels")
        .upsert(reelData, { 
          onConflict: 'workspace_id,platform_post_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (reelError) {
        console.error(`Error upserting reel ${item.id}:`, reelError);
        continue;
      }

      // Upsert into reel_metrics_daily with day=today
      const today = new Date().toISOString().split('T')[0];
      const metricsData = {
        day: today,
        reel_id: reel.id,
        workspace_id: model.workspace_id,
        views: item.videoPlayCount || item.videoViewCount || 0,
        likes: item.likesCount || 0,
        comments: item.commentsCount || 0,
        saves: 0, // Not available in Apify data
        shares: 0, // Not available in Apify data
        watch_time_seconds: 0, // Not available in Apify data
        completion_rate: null // Not available in Apify data
      };

      await supabase
        .from("reel_metrics_daily")
        .upsert(metricsData, { 
          onConflict: 'day,reel_id',
          ignoreDuplicates: false 
        });

      processedModels.add(model.id);

    } catch (itemError) {
      console.error(`Error processing item ${item.id}:`, itemError);
    }
  }

  // Update models: last_scraped_at=now(), backfill_completed=true
  for (const modelId of processedModels) {
    await supabase
      .from("models")
      .update({ 
        last_scraped_at: new Date().toISOString(),
        backfill_completed: true
      })
      .eq("id", modelId);
  }

  console.log(`Processed dataset ${datasetId}: ${items.length} items, ${processedModels.size} models updated`);
}