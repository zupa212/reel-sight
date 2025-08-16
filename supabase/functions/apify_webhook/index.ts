import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.168.0/crypto/crypto.ts";

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
    const url = new URL(req.url);
    const source = url.searchParams.get("source") || "unknown";
    const secret = url.searchParams.get("secret");
    
    // Verify webhook secret
    const expectedSecret = Deno.env.get("APIFY_WEBHOOK_SECRET");
    if (expectedSecret && secret !== expectedSecret) {
      return new Response("Unauthorized", { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const payload = await req.json();
    
    // Create hash for deduplication
    const payloadString = JSON.stringify(payload);
    const hash = await createHash("sha256")
      .update(payloadString)
      .digest("hex");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert webhook into inbox
    const { error } = await supabase.from("webhooks_inbox").insert({
      source,
      payload,
      hash,
      dedupe_key: `${source}_${hash}`
    });

    if (error) {
      console.error("Error inserting webhook:", error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log webhook receipt
    await supabase.from("event_logs").insert({
      event: "webhook:received",
      level: "info",
      context: { source, hash, payloadSize: payloadString.length },
      page: "webhook"
    });

    console.log(`Webhook received from ${source}, hash: ${hash}`);

    return new Response(JSON.stringify({ ok: true, hash }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Unexpected error in apify_webhook:", error);
    return new Response(JSON.stringify({ ok: false, error: "Internal server error" }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});