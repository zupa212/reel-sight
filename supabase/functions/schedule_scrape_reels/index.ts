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

    // Select all models where status='enabled'
    const { data: models, error: modelsError } = await supabase
      .from("models")
      .select("id, username, workspace_id")
      .eq("status", "enabled");

    if (modelsError) {
      console.error("Error fetching enabled models:", modelsError);
      throw modelsError;
    }

    if (!models || models.length === 0) {
      console.log("No enabled models found");
      return new Response(JSON.stringify({ 
        ok: true, 
        message: "No enabled models to scrape" 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Chunk usernames into arrays of 10
    const usernames = models.map(m => m.username);
    const chunks: string[][] = [];
    for (let i = 0; i < usernames.length; i += 10) {
      chunks.push(usernames.slice(i, i + 10));
    }

    const apifyToken = Deno.env.get("APIFY_TOKEN");
    const apifyWebhookSecret = Deno.env.get("APIFY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    
    if (!apifyToken || !apifyWebhookSecret) {
      throw new Error("APIFY_TOKEN or APIFY_WEBHOOK_SECRET not configured");
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/apify_webhook?source=instagram&secret=${apifyWebhookSecret}`;
    
    let successfulRuns = 0;
    let errorCount = 0;

    // For each chunk, POST run with resultsLimit: 3
    for (const chunk of chunks) {
      try {
        const runResponse = await fetch(
          `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/runs?token=${apifyToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: {
                username: chunk,
                resultsLimit: 3
              },
              webhooks: [{
                eventTypes: ["ACTOR.RUN.SUCCEEDED"],
                requestUrl: webhookUrl
              }]
            })
          }
        );

        if (!runResponse.ok) {
          const errorText = await runResponse.text();
          throw new Error(`Apify API error: ${runResponse.status} - ${errorText}`);
        }

        const runData = await runResponse.json();
        console.log(`Daily scrape run started for chunk [${chunk.join(', ')}]:`, runData.data.id);
        successfulRuns++;

      } catch (chunkError) {
        console.error(`Error starting run for chunk [${chunk.join(', ')}]:`, chunkError);
        errorCount++;
      }
    }

    // Update last_daily_scrape_at=now() for all enabled models
    const modelIds = models.map(m => m.id);
    await supabase
      .from("models")
      .update({ last_daily_scrape_at: new Date().toISOString() })
      .in("id", modelIds);

    // Upsert cron_status for schedule_scrape_reels
    await supabase.from("cron_status").upsert({
      name: "schedule_scrape_reels",
      last_run_at: new Date().toISOString(),
      last_ok: errorCount === 0,
      last_message: `Started ${successfulRuns} runs for ${models.length} models in ${chunks.length} chunks, ${errorCount} errors`
    });

    // Refresh materialized views after scheduling scrapes
    console.log("Refreshing materialized views...");
    try {
      await supabase.rpc('refresh_materialized_views');
      console.log("Materialized views refreshed successfully");
    } catch (refreshError) {
      console.error("Error refreshing materialized views:", refreshError);
    }

    // Log completion
    await supabase.from("event_logs").insert({
      event: "cron:schedule_scrape_reels_completed",
      level: errorCount > 0 ? "warn" : "info",
      context: { 
        modelsCount: models.length, 
        chunksCount: chunks.length, 
        successfulRuns, 
        errorCount 
      },
      page: "cron"
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      modelsCount: models.length,
      chunksCount: chunks.length,
      successfulRuns,
      errorCount
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Unexpected error in schedule_scrape_reels:", error);
    
    // Update cron status with error
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      await supabase.from("cron_status").upsert({
        name: "schedule_scrape_reels",
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