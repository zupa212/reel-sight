import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { ExternalLink, Filter, Video, Eye, Heart, MessageCircle } from "lucide-react";
import { WorkspaceBanner } from "@/components/ui/workspace-banner";
import { APP_CONFIG, getDefaultWorkspaceId, isWorkspaceConfigured } from "@/lib/config";
import { track } from "@/lib/track";

interface Reel {
  id: string;
  caption: string | null;
  url: string;
  thumbnail_url: string | null;
  posted_at: string;
  model_id: string;
  models: {
    username: string;
    display_name: string | null;
  };
  reel_metrics_daily: Array<{
    day: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }>;
}

export default function Reels() {
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [minViews, setMinViews] = useState([0]);

  // Fetch models for filter dropdown
  const { data: models } = useQuery({
    queryKey: ['models-for-filter'],
    queryFn: async () => {
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

  // Fetch reels with filters
  const { data: reels, isLoading } = useQuery({
    queryKey: ['reels', selectedModel, dateRange, minViews[0]],
    queryFn: async () => {
      track('reels:fetch_start', { selectedModel, dateRange, minViews: minViews[0] });
      
      const workspaceId = getDefaultWorkspaceId();
      if (!workspaceId) return [];

      // Calculate date filter
      const days = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query = supabase
        .from('reels')
        .select(`
          *,
          models!inner(username, display_name),
          reel_metrics_daily(
            day,
            views,
            likes,
            comments,
            shares,
            saves
          )
        `)
        .eq('workspace_id', workspaceId)
        .gte('posted_at', cutoffDate.toISOString())
        .order('posted_at', { ascending: false });

      // Apply model filter
      if (selectedModel !== "all") {
        query = query.eq('model_id', selectedModel);
      }

      const { data, error } = await query;

      if (error) {
        track('reels:fetch_error', { error: error.message });
        throw error;
      }

      // Process and filter by min views
      const processedReels = (data || []).map(reel => {
        // Get latest metrics for this reel
        const latestMetrics = reel.reel_metrics_daily
          ?.sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime())[0];

        // Create 7-day sparkline data - if only one point, create flat line ending at that value
        const last7Days = reel.reel_metrics_daily
          ?.sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime())
          .slice(0, 7)
          .reverse()
          .map(m => m.views || 0) || [];

        // If we have only one data point, create a flat line ending at that value
        if (last7Days.length === 1) {
          const singleValue = last7Days[0];
          last7Days.unshift(0, 0, 0, 0, 0, 0); // 6 zeros + the actual value = flat line ending at value
        }

        // Pad with zeros if less than 7 days
        while (last7Days.length < 7) {
          last7Days.unshift(0);
        }

        return {
          ...reel,
          latestViews: latestMetrics?.views || 0,
          latestLikes: latestMetrics?.likes || 0,
          latestComments: latestMetrics?.comments || 0,
          weeklyViews: last7Days
        };
      }).filter(reel => reel.latestViews >= minViews[0]);

      track('reels:fetch_ok', { count: processedReels.length });
      return processedReels;
    },
    enabled: isWorkspaceConfigured()
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="container mx-auto py-8 space-y-6 animate-fade-in">
      <WorkspaceBanner />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reels</h1>
        <p className="text-muted-foreground">Browse and analyze Instagram reel performance</p>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
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

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Views Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Min Views: {formatNumber(minViews[0])}
              </label>
              <Slider
                value={minViews}
                onValueChange={setMinViews}
                max={1000000}
                step={1000}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reels Grid */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-muted rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reels && reels.length > 0 ? (
        <div className="grid gap-4">
          {reels.map((reel) => (
            <Card key={reel.id} className="bg-gradient-card border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {reel.thumbnail_url ? (
                      <img
                        src={reel.thumbnail_url}
                        alt="Reel thumbnail"
                        className="w-20 h-20 object-cover rounded border border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded border border-border flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-foreground line-clamp-2">
                          {reel.caption || 'No caption'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          @{reel.models.username} • {formatDate(reel.posted_at)}
                        </p>
                      </div>
                      
                      <Button variant="ghost" size="sm" asChild>
                        <a href={reel.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatNumber(reel.latestViews)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {formatNumber(reel.latestLikes)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {formatNumber(reel.latestComments)}
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">7-day trend:</span>
                      <div className="flex-1 max-w-[120px]">
                        <Sparkline 
                          data={reel.weeklyViews} 
                          height={20}
                          className="text-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-12 text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No reels yet</h3>
            <p className="text-muted-foreground mb-4">
              Enable scraping for a model to start seeing reels here
            </p>
            <p className="text-sm text-muted-foreground">
              Reels will appear automatically once the backfill process completes
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}