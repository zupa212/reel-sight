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

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { modelId } = await req.json();
    
    if (!modelId) {
      return new Response(JSON.stringify({ error: "modelId required" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update model status to enabled
    const { data: model, error: updateError } = await supabase
      .from("models")
      .update({ 
        enabled: true,
        last_backfill_at: new Date().toISOString()
      })
      .eq("id", modelId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating model:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!model?.instagram_username) {
      return new Response(JSON.stringify({ error: "Model not found or missing username" }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log the enable action
    await supabase.from("event_logs").insert({
      event: "model:enabled",
      level: "info",
      context: { modelId, username: model.instagram_username },
      page: "/models"
    });

    // Start Apify backfill task
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
              username: [model.instagram_username],
              resultsLimit: 100
            },
            webhooks: [{
              eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.ABORTED"],
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
      console.log(`Apify run started for ${model.instagram_username}:`, runData.data.id);

      // Update model with Apify task ID
      await supabase
        .from("models")
        .update({ apify_task_id: runData.data.id })
        .eq("id", modelId);

    } catch (apifyError) {
      console.error("Error starting Apify task:", apifyError);
      
      // Log the error but don't fail the request
      await supabase.from("event_logs").insert({
        event: "model:apify_error",
        level: "error",
        context: { modelId, error: apifyError.message },
        page: "/models"
      });
    }

    console.log(`Model ${model.instagram_username} enabled, backfill initiated`);

    return new Response(JSON.stringify({ 
      ok: true, 
      message: "Model enabled and backfill started",
      model 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Unexpected error in enable_model:", error);
    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});