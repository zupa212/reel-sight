import { track } from "./track";

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

    const response = await fetch(url, {
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