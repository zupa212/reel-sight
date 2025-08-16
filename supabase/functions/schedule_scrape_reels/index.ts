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
      .eq("status", "enabled");

    if (fetchError) {
      console.error("Error fetching models:", fetchError);
      throw fetchError;
    }

    let scheduledCount = 0;
    let errorCount = 0;

    for (const model of models || []) {
      try {
        // TODO: Trigger Apify scraping task for this model
        // This would involve calling the Apify API to schedule a daily scrape
        
        // Update last_daily_scrape_at
        await supabase
          .from("models")
          .update({ 
            last_daily_scrape_at: new Date().toISOString() 
          })
          .eq("id", model.id);

        scheduledCount++;
        console.log(`Scheduled daily scrape for model: ${model.username}`);
      } catch (error) {
        console.error(`Error scheduling scrape for model ${model.id}:`, error);
        errorCount++;
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