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

    // Get all enabled models
    const { data: models, error: fetchError } = await supabase
      .from("models")
      .select("*")
      .eq("status", 'enabled');

    if (fetchError) {
      console.error("Error fetching models:", fetchError);
      throw fetchError;
    }

    let scheduledCount = 0;
    let errorCount = 0;

    // Group usernames into chunks of 10 for efficient Apify runs
    const usernames = models?.map(m => m.username).filter(Boolean) || [];
    const chunks = [];
    for (let i = 0; i < usernames.length; i += 10) {
      chunks.push(usernames.slice(i, i + 10));
    }

    console.log(`Processing ${chunks.length} chunks for ${usernames.length} models`);

    for (const chunk of chunks) {
      try {
        const apifyToken = Deno.env.get("APIFY_TOKEN");
        if (!apifyToken) {
          throw new Error("APIFY_TOKEN not configured");
        }

        const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/apify_webhook?source=instagram&secret=${Deno.env.get("APIFY_WEBHOOK_SECRET")}`;
        
        const runResponse = await fetch(
          `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/runs?token=${apifyToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: {
                username: chunk,
                resultsLimit: 3 // Limit for daily scraping
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
        console.log(`Apify run started for chunk:`, chunk, "Run ID:", runData.data.id);

        // Update last_daily_scrape_at for models in this chunk
        for (const username of chunk) {
          const model = models?.find(m => m.username === username);
          if (model) {
            await supabase
              .from("models")
              .update({ 
                last_daily_scrape_at: new Date().toISOString() 
              })
              .eq("id", model.id);
          }
        }

        scheduledCount += chunk.length;
        console.log(`Scheduled daily scrape for ${chunk.length} models in chunk`);
      } catch (error) {
        console.error(`Error scheduling scrape for chunk:`, chunk, error);
        errorCount += chunk.length;
      }
    }

    // Update cron status
    await supabase.from("cron_status").upsert({
      name: "schedule_scrape_reels",
      last_run_at: new Date().toISOString(),
      last_ok: errorCount === 0,
      last_message: `Scheduled ${scheduledCount} models, ${errorCount} errors`
    });

    // Log completion
    await supabase.from("event_logs").insert({
      event: "cron:schedule_scrape_completed",
      level: errorCount > 0 ? "warn" : "info",
      context: { scheduledCount, errorCount },
      page: "cron"
    });

    return new Response(JSON.stringify({ 
      ok: true, 
      scheduledCount, 
      errorCount 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Unexpected error in schedule_scrape_reels:", error);
    
    // Update cron status with error
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    await supabase.from("cron_status").upsert({
      name: "schedule_scrape_reels",
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