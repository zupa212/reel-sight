import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Heart, MessageCircle, Share, Bookmark, Filter, Download, RefreshCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useModels, useReels } from '@/lib/supabase-queries';
import { track } from '@/lib/track';

// Mock data for reels (fallback)
const mockReels = [
  {
    id: '1',
    modelUsername: '@model_sarah',
    caption: 'Morning workout routine ✨ Who\'s ready to get fit? #fitness #workout #motivation',
    thumbnailUrl: '/placeholder.svg',
    postedAt: new Date('2024-01-15T10:30:00Z'),
    url: 'https://instagram.com/reel/1',
    metrics: {
      views: 45200,
      likes: 3420,
      comments: 234,
      shares: 89,
      saves: 156
    },
    weeklyViews: [1200, 1800, 2400, 3100, 3800, 4200, 4520] // 7-day trend
  },
  {
    id: '2',
    modelUsername: '@fitness_emma',
    caption: 'Quick HIIT session for busy schedules 🔥 Save for later! #hiit #quickworkout',
    thumbnailUrl: '/placeholder.svg',
    postedAt: new Date('2024-01-15T08:15:00Z'),
    url: 'https://instagram.com/reel/2',
    metrics: {
      views: 32100,
      likes: 2890,
      comments: 178,
      shares: 67,
      saves: 234
    },
    weeklyViews: [800, 1500, 2100, 2700, 3000, 3150, 3210]
  },
  {
    id: '3',
    modelUsername: '@lifestyle_alex',
    caption: 'Sunday self-care routine 🧘‍♀️ Taking time for myself #selfcare #sunday #wellness',
    thumbnailUrl: '/placeholder.svg',
    postedAt: new Date('2024-01-14T16:45:00Z'),
    url: 'https://instagram.com/reel/3',
    metrics: {
      views: 28700,
      likes: 2145,
      comments: 156,
      shares: 45,
      saves: 189
    },
    weeklyViews: [900, 1400, 1900, 2300, 2600, 2750, 2870]
  },
  {
    id: '4',
    modelUsername: '@beauty_mia',
    caption: 'Get ready with me - natural glow edition ✨ #grwm #naturalbeauty #makeup',
    thumbnailUrl: '/placeholder.svg',
    postedAt: new Date('2024-01-14T12:20:00Z'),
    url: 'https://instagram.com/reel/4',
    metrics: {
      views: 19400,
      likes: 1876,
      comments: 98,
      shares: 34,
      saves: 145
    },
    weeklyViews: [600, 1100, 1500, 1750, 1850, 1920, 1940]
  }
];

// Simple sparkline component
const Sparkline = ({ data, className }: { data: number[], className?: string }) => {
  const max = Math.max(...data);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - (value / max) * 15;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="60" height="20" className={className}>
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        className="opacity-80"
      />
    </svg>
  );
};

export default function Reels() {
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [minViews, setMinViews] = useState<number[]>([0]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const { data: models } = useModels();
  const { data: reels, isLoading, error } = useReels({
    modelId: selectedModel !== 'all' ? selectedModel : undefined,
    dateRange,
    minViews: minViews[0]
  });

  useEffect(() => {
    track('reels:page_load', { 
      selectedModel,
      dateRange,
      minViews: minViews[0]
    });
  }, []);

  const handleFilterChange = (type: string, value: any) => {
    track('reels:filter_changed', { type, value });
    
    if (type === 'model') {
      setSelectedModel(value);
    } else if (type === 'dateRange') {
      setDateRange(value);
    } else if (type === 'minViews') {
      setMinViews([value]);
    }
  };

  const handleRowOpen = (reelId: string, url: string) => {
    track('reels:row_open', { reelId });
    window.open(url, '_blank');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const calculateEngagement = (metrics: any) => {
    const total = metrics.likes + metrics.comments + metrics.shares + metrics.saves;
    return ((total / metrics.views) * 100).toFixed(1);
  };

  // Process the data to match the expected format
  const reelsData = (reels || mockReels).map(reel => ({
    ...reel,
    models: reel.models || { username: reel.modelUsername?.replace('@', '') },
    reel_metrics_daily: reel.reel_metrics_daily || [{
      views: reel.metrics?.views || 0,
      likes: reel.metrics?.likes || 0,
      comments: reel.metrics?.comments || 0,
      shares: reel.metrics?.shares || 0,
      saves: reel.metrics?.saves || 0
    }]
  }));

  // Filter reels based on current filters
  const filteredReels = reelsData.filter(reel => {
    const username = reel.models?.username || reel.modelUsername?.replace('@', '');
    const latestMetrics = reel.reel_metrics_daily?.[0] || reel.metrics;
    
    const matchesModel = selectedModel === 'all' || username === selectedModel;
    const matchesViews = (latestMetrics?.views || 0) >= minViews[0];
    const matchesSearch = (reel.caption || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         username.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesModel && matchesViews && matchesSearch;
  });

  const uniqueModels = models || Array.from(new Set(mockReels.map(reel => ({ 
    username: reel.modelUsername.replace('@', '') 
  }))));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reels Analytics</h1>
          <p className="text-muted-foreground">
            Track performance metrics across all your creator content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Views</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatNumber(mockReels.reduce((sum, reel) => sum + reel.metrics.views, 0))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Likes</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatNumber(mockReels.reduce((sum, reel) => sum + reel.metrics.likes, 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Comments</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatNumber(mockReels.reduce((sum, reel) => sum + reel.metrics.comments, 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Share className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Avg Engagement</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {(mockReels.reduce((sum, reel) => sum + parseFloat(calculateEngagement(reel.metrics)), 0) / mockReels.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search captions or usernames..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={selectedModel} onValueChange={(value) => handleFilterChange('model', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {uniqueModels.map(model => (
                  <SelectItem key={model.username} value={model.username}>
                    @{model.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <Select value={dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minViews">Min Views: {formatNumber(minViews[0])}</Label>
            <Slider
              id="minViews"
              value={minViews}
              onValueChange={(value) => handleFilterChange('minViews', value[0])}
              max={50000}
              step={1000}
              className="w-full"
            />
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Reels Table */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle>Reels Performance</CardTitle>
          <CardDescription>
            Showing {filteredReels.length} reels matching your filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                  <TableHead className="text-right">7d Trend</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReels.map((reel) => {
                  const latestMetrics = reel.reel_metrics_daily?.[0] || reel.metrics;
                  const username = reel.models?.username || reel.modelUsername?.replace('@', '');
                  const postedAt = reel.posted_at ? new Date(reel.posted_at) : reel.postedAt;
                  const weeklyData = reel.weeklyViews || reel.reel_metrics_daily?.map(m => m.views || 0).slice(-7) || [0, 0, 0, 0, 0, 0, latestMetrics?.views || 0];
                  
                  return (
                    <TableRow key={reel.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-start gap-3 max-w-xs">
                          <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                            {reel.thumbnail_url ? (
                              <img src={reel.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Eye className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium line-clamp-2">
                              {reel.caption || 'No caption'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">@{username}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {postedAt ? format(postedAt, 'MMM d, yyyy') : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(latestMetrics?.views || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(latestMetrics?.likes || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(latestMetrics?.comments || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Sparkline data={weeklyData} />
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleRowOpen(reel.id, reel.url)}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}