import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Heart, 
  MessageCircle, 
  ExternalLink,
  Calendar,
  Activity
} from "lucide-react";
import { WorkspaceBanner } from "@/components/ui/workspace-banner";
import { APP_CONFIG, getDefaultWorkspaceId, isWorkspaceConfigured } from "@/lib/config";
import { track } from "@/lib/track";

export default function Dashboard() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Fetch models for filter
  const { data: models } = useQuery({
    queryKey: ['models-for-dashboard'],
    queryFn: async () => {
      track('dashboard:load');
      
      const workspaceId = getDefaultWorkspaceId();
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('models')
        .select('id, username, display_name')
        .eq('workspace_id', workspaceId)
        .order('username');

      if (error) throw error;
      return data;
    },
    enabled: isWorkspaceConfigured()
  });

  // Fetch dashboard data using RPC bundle
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-bundle', selectedModels],
    queryFn: async () => {
      track('dashboard:bundle_fetch_start', { selectedModels });

      const { data, error } = await supabase.rpc('api_dashboard_bundle', {
        model_ids: selectedModels.length > 0 ? selectedModels : null
      });

      if (error) {
        track('dashboard:bundle_fetch_error', { error: error.message });
        throw error;
      }

      track('dashboard:bundle_fetch_ok');
      return data;
    },
    enabled: isWorkspaceConfigured()
  });

  const kpis = (dashboardData as any)?.kpis || {};
  const topReels = (dashboardData as any)?.topReels || [];
  const cadenceData = (dashboardData as any)?.cadence || [];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6 animate-fade-in">
      <WorkspaceBanner />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your Instagram content performance</p>
        </div>
        
        <div className="w-64">
          <Select
            value={selectedModels.length > 0 ? selectedModels.join(",") : "all"}
            onValueChange={(value) => {
              if (value === "all") {
                setSelectedModels([]);
              } else {
                setSelectedModels(value.split(","));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {models?.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.display_name || `@${model.username}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded"></div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Views (7d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-foreground">
                    {formatNumber(kpis.views7d || 0)}
                  </div>
                  {kpis.momentumDown && (
                    <Badge variant="destructive" className="text-xs">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Down
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Engagement/1k (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {(kpis.engagementPer1k30d || 0).toFixed(1)}‰
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Avg Views/Reel (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatNumber(Math.round(kpis.avgViewsPerReel30d || 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Reels */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Reels (30d)
              </CardTitle>
              <CardDescription>
                Best performing content by views
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topReels && topReels.length > 0 ? (
                <div className="space-y-4">
                  {topReels.slice(0, 10).map((reel, index) => (
                    <div key={reel.id} className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border border-border/50">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {index + 1}
                      </div>
                      
                      {reel.thumbnail_url && (
                        <img 
                          src={reel.thumbnail_url} 
                          alt="Reel thumbnail"
                          className="w-16 h-16 object-cover rounded border border-border"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {reel.caption || 'No caption'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{reel.username} • {formatDate(reel.posted_at)}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{formatNumber(reel.views)}</p>
                        <p className="text-xs text-muted-foreground">views</p>
                      </div>
                      
                      <Button variant="ghost" size="sm" asChild>
                        <a href={reel.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No top reels data available. Enable a model to start tracking performance.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Publishing Cadence */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Publishing Cadence (30d)
              </CardTitle>
              <CardDescription>
                Daily posting frequency over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cadenceData && cadenceData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cadenceData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="day" 
                        tickFormatter={(value) => formatDate(value)}
                        className="text-muted-foreground"
                      />
                      <YAxis className="text-muted-foreground" />
                      <Tooltip 
                        labelFormatter={(value) => formatDate(value)}
                        formatter={(value) => [value, 'Reels']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Bar 
                        dataKey="reels" 
                        fill="hsl(var(--primary))"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No cadence data available. Enable a model to start tracking posting frequency.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}