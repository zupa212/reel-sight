import { track } from "./track";
import { APP_CONFIG } from "./config";

export interface ActionOptions {
  okToast?: string;
  failToast?: string;
}

export async function callEdge<T = any>(
  url: string, 
  input?: any, 
  opts: ActionOptions = {}
) {
  const start = performance.now();
  
  try {
    track("edge:call_start", { 
      url, 
      inputPreview: input ? Object.keys(input) : [] 
    });

    // Use configured edge function URLs
    const fullUrl = url.startsWith('http') ? url : `${APP_CONFIG.SUPABASE_URL}/functions/v1/${url}`;

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: input ? JSON.stringify(input) : undefined
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    const duration = Math.round(performance.now() - start);
    track("edge:call_ok", { url, ms: duration });
    
    return { ok: true, data: data as T };
  } catch (error: any) {
    const duration = Math.round(performance.now() - start);
    track("edge:call_error", { url, error: String(error), ms: duration });
    
    return { ok: false, error: String(error) };
  }
}