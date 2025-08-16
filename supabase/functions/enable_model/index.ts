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
    const { modelId, refresh } = await req.json();
    
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

    // Look up model by id to get username + workspace_id
    const { data: model, error: fetchError } = await supabase
      .from("models")
      .select("id, username, workspace_id")
      .eq("id", modelId)
      .single();

    if (fetchError || !model) {
      return new Response(JSON.stringify({ error: "Model not found" }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update status='enabled', last_backfill_at=now()
    const { error: updateError } = await supabase
      .from("models")
      .update({ 
        status: 'enabled',
        last_backfill_at: new Date().toISOString()
      })
      .eq("id", modelId);

    if (updateError) {
      console.error("Error updating model:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log the enable action
    await supabase.from("event_logs").insert({
      event: "model:enabled",
      level: "info",
      context: { modelId, username: model.username },
      workspace_id: model.workspace_id,
      page: "/models"
    });

    // Start Apify run
    try {
      const apifyToken = Deno.env.get("APIFY_TOKEN");
      const apifyWebhookSecret = Deno.env.get("APIFY_WEBHOOK_SECRET");
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      
      console.log("Environment check:", {
        hasApifyToken: !!apifyToken,
        hasWebhookSecret: !!apifyWebhookSecret,
        hasSupabaseUrl: !!supabaseUrl,
        tokenLength: apifyToken?.length || 0
      });
      
      if (!apifyToken || !apifyWebhookSecret) {
        throw new Error("APIFY_TOKEN or APIFY_WEBHOOK_SECRET not configured");
      }

      const webhookUrl = `${supabaseUrl}/functions/v1/apify_webhook?source=instagram&secret=${apifyWebhookSecret}`;
      
      // Use the correct Apify actor ID for Instagram Reel Scraper
      const actorId = "xMc5Ga1oCONPmWJIa";
      const apifyUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`;
      
      const apifyInput = {
        usernames: [model.username], // Updated to use 'usernames' field
        resultsLimit: 100
      };

      console.log(`Starting Apify run for ${model.username}:`, {
        url: apifyUrl,
        input: apifyInput,
        webhookUrl: webhookUrl
      });

      const runResponse = await fetch(apifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyInput)
      });

      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        throw new Error(`Apify API error: ${runResponse.status} - ${errorText}`);
      }

      const runData = await runResponse.json();
      console.log(`Apify run started for ${model.username}:`, runData.data.id);

      // Update model with Apify task ID
      await supabase
        .from("models")
        .update({ apify_task_id: runData.data.id })
        .eq("id", modelId);

      return new Response(JSON.stringify({ started: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });

    } catch (apifyError) {
      console.error("Error starting Apify task:", apifyError);
      
      // Log the error
      await supabase.from("event_logs").insert({
        event: "model:apify_error",
        level: "error",
        context: { modelId, error: apifyError.message },
        workspace_id: model.workspace_id,
        page: "/models"
      });

      return new Response(JSON.stringify({ error: apifyError.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error("Unexpected error in enable_model:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});