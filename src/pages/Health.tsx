import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Activity, 
  Database, 
  Zap, 
  Calendar,
  Eye,
  EyeOff
} from "lucide-react";
import { WorkspaceBanner } from "@/components/ui/workspace-banner";
import { APP_CONFIG, getMaskedAnonKey } from "@/lib/config";
import { track } from "@/lib/track";
import { callEdge } from "@/lib/action";

export default function Health() {
  const [testingFunctions, setTestingFunctions] = useState<Set<string>>(new Set());

  // Fetch recent event logs
  const { data: eventLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['event-logs', 5],
    queryFn: async () => {
      track('health:event_logs_fetch_start');
      const { data, error } = await supabase
        .from('event_logs')
        .select('*')
        .order('ts', { ascending: false })
        .limit(5);
      
      if (error) {
        track('health:event_logs_fetch_error', { error: error.message });
        throw error;
      }
      
      track('health:event_logs_fetch_ok', { count: data?.length || 0 });
      return data;
    }
  });

  // Test edge function
  const testFunction = async (functionName: string, url: string, payload = {}) => {
    setTestingFunctions(prev => new Set([...prev, functionName]));
    track('health:function_test_start', { functionName });

    try {
      const result = await callEdge(url, payload);
      
      if (result.ok) {
        track('health:function_test_ok', { functionName });
        toast({
          title: `${functionName} ✅`,
          description: "Function responded successfully",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      track('health:function_test_error', { functionName, error: String(error) });
      toast({
        title: `${functionName} ❌`,
        description: error instanceof Error ? error.message : "Function test failed",
        variant: "destructive",
      });
    } finally {
      setTestingFunctions(prev => {
        const next = new Set(prev);
        next.delete(functionName);
        return next;
      });
    }
  };

  const constants = [
    {
      name: "SUPABASE_URL",
      value: APP_CONFIG.SUPABASE_URL,
      status: "ok" as const,
      masked: false
    },
    {
      name: "SUPABASE_ANON_KEY",
      value: getMaskedAnonKey(),
      status: "ok" as const,
      masked: true
    },
    {
      name: "DEFAULT_WORKSPACE_ID",
      value: APP_CONFIG.DEFAULT_WORKSPACE_ID,
      status: "ok" as const,
      masked: false
    },
    {
      name: "ENABLE_MODEL_URL",
      value: APP_CONFIG.ENABLE_MODEL_URL,
      status: "ok" as const,
      masked: false
    },
    {
      name: "APIFY_WEBHOOK_URL", 
      value: APP_CONFIG.APIFY_WEBHOOK_URL,
      status: "ok" as const,
      masked: false
    }
  ];

  const edgeFunctions = [
    {
      name: "enable_model",
      url: APP_CONFIG.ENABLE_MODEL_URL,
      payload: { modelId: "test-model-id" },
      description: "Starts Apify backfill and sets model status enabled"
    },
    {
      name: "process_inbox",
      url: `${APP_CONFIG.SUPABASE_URL}/functions/v1/process_inbox`,
      payload: {},
      description: "Pulls Apify dataset, upserts into reels + reel_metrics_daily"
    },
    {
      name: "schedule_scrape_reels",
      url: `${APP_CONFIG.SUPABASE_URL}/functions/v1/schedule_scrape_reels`,
      payload: {},
      description: "Daily run (3 newest reels per enabled model)"
    },
    {
      name: "log_event",
      url: `${APP_CONFIG.SUPABASE_URL}/functions/v1/log_event`,
      payload: { event: "health:test", context: { source: "health_page" }, page: "/dev/health" },
      description: "Client event logging"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok": return <CheckCircle className="h-4 w-4 text-success" />;
      case "warning": return <XCircle className="h-4 w-4 text-warning" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatLogTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto py-8 space-y-6 animate-fade-in">
      <WorkspaceBanner />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Health Check</h1>
        <p className="text-muted-foreground">System diagnostics and configuration status</p>
      </div>

      <div className="grid gap-6">
        {/* Configuration Constants */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Configuration Constants
            </CardTitle>
            <CardDescription>
              Hardcoded values used throughout the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {constants.map((constant) => (
                <div key={constant.name} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(constant.status)}
                    <div>
                      <div className="font-medium text-foreground">{constant.name}</div>
                      <div className="text-sm text-muted-foreground font-mono flex items-center gap-2">
                        {constant.value}
                        {constant.masked && <EyeOff className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                  <Badge variant={constant.status === "ok" ? "default" : "destructive"}>
                    {constant.status === "ok" ? "✅" : "⚠️"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edge Functions Testing */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Edge Functions
            </CardTitle>
            <CardDescription>
              Test connectivity and functionality of Supabase edge functions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {edgeFunctions.map((func) => (
                <div key={func.name} className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{func.name}</div>
                    <div className="text-sm text-muted-foreground">{func.description}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">{func.url}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testFunction(func.name, func.url, func.payload)}
                    disabled={testingFunctions.has(func.name)}
                  >
                    {testingFunctions.has(func.name) ? "Testing..." : "Test"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Event Logs */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Event Logs
            </CardTitle>
            <CardDescription>
              Last 5 events from the application (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                    <div className="h-4 w-4 bg-muted rounded"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-muted rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : eventLogs && eventLogs.length > 0 ? (
              <div className="space-y-3">
                {eventLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-border/50">
                    <div className="flex-shrink-0 mt-0.5">
                      {log.level === 'error' ? 
                        <XCircle className="h-4 w-4 text-destructive" /> :
                        <CheckCircle className="h-4 w-4 text-success" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{log.event}</div>
                      {log.context && Object.keys(log.context).length > 0 && (
                        <div className="text-xs text-muted-foreground font-mono mt-1">
                          {JSON.stringify(log.context, null, 2)}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {log.page && `${log.page} • `}{formatLogTime(log.ts)}
                      </div>
                    </div>
                    <Badge variant={log.level === 'error' ? 'destructive' : 'outline'} className="text-xs">
                      {log.level}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No event logs available
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status Summary */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {constants.filter(c => c.status === "ok").length}/{constants.length}
                </div>
                <div className="text-sm text-muted-foreground">Config Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {edgeFunctions.length}
                </div>
                <div className="text-sm text-muted-foreground">Edge Functions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {APP_CONFIG.AUTH_ENABLED ? "Enabled" : "Disabled"}
                </div>
                <div className="text-sm text-muted-foreground">Authentication</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}