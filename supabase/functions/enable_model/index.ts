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
        status: "enabled",
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

    // Log the enable action
    await supabase.from("event_logs").insert({
      event: "model:enabled",
      level: "info",
      context: { modelId, username: model.username },
      page: "/models"
    });

    // TODO: Trigger Apify backfill task here
    // This would involve calling the Apify API to start a scraping task
    console.log(`Model ${model.username} enabled, backfill triggered`);

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