import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Eye, 
  TrendingUp, 
  BarChart3, 
  AlertTriangle,
  ExternalLink,
  Users,
  PlayCircle,
  Heart,
  MessageCircle,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { useModels, useDashboardKPIs, useTopReels, useCadenceData } from '@/lib/supabase-queries';
import { track } from '@/lib/track';

export default function Dashboard() {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  
  const { data: models } = useModels();
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs({ 
    modelIds: selectedModels.length > 0 ? selectedModels : undefined 
  });
  const { data: topReels, isLoading: reelsLoading } = useTopReels({ 
    modelIds: selectedModels.length > 0 ? selectedModels : undefined 
  });
  const { data: cadenceData, isLoading: cadenceLoading } = useCadenceData({ 
    modelIds: selectedModels.length > 0 ? selectedModels : undefined 
  });

  useEffect(() => {
    track('dashboard:load', { 
      selectedModels: selectedModels.length,
      totalModels: models?.length || 0 
    });
  }, [selectedModels, models]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return Math.round(num).toString();
  };

  const handleModelFilterChange = (value: string) => {
    if (value === 'all') {
      setSelectedModels([]);
      track('dashboard:filter_changed', { type: 'model', value: 'all' });
    } else {
      const modelIds = models?.filter(m => 
        m.username === value
      ).map(m => m.id) || [];
      setSelectedModels(modelIds);
      track('dashboard:filter_changed', { type: 'model', value, modelIds });
    }
  };

  const maxCadence = Math.max(...(cadenceData?.map(d => d.reels) || [0]));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Instagram Reels performance overview and analytics
          </p>
        </div>
        
        {/* Model Filter */}
        <div className="w-64">
          <Select value={selectedModels.length === 0 ? 'all' : models?.find(m => selectedModels.includes(m.id))?.username || 'all'} onValueChange={handleModelFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {models?.map(model => (
                <SelectItem key={model.id} value={model.username}>
                  @{model.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Views (7d)
            </CardTitle>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              {kpis?.momentumDown && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpisLoading ? '...' : formatNumber(kpis?.views7d || 0)}
            </div>
            {kpis?.momentumDown && (
              <Badge variant="destructive" className="text-xs mt-1">
                ▼ Momentum down 25%+
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Views (30d)
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpisLoading ? '...' : formatNumber(kpis?.views30d || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Views / Reel (30d)
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpisLoading ? '...' : formatNumber(kpis?.avgViewsPerReel30d || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Engagement / 1k (30d)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpisLoading ? '...' : kpis?.engagementPer1k30d?.toFixed(1) || '0.0'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Reels */}
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5" />
              Top Reels (30d)
            </CardTitle>
            <CardDescription>
              Best performing content by views
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reelsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Likes</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topReels?.map((reel) => (
                    <TableRow key={reel.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm font-medium line-clamp-2">
                            {reel.caption || 'No caption'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{(reel as any).models?.username || 'Unknown'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(reel.latestViews)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(reel.latestLikes)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(reel.latestComments)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            track('dashboard:open_reel', { reelId: reel.id });
                            window.open(reel.url, '_blank');
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Cadence Chart */}
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Cadence (30d)
            </CardTitle>
            <CardDescription>
              Reels posted per day
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cadenceLoading ? (
              <div className="h-32 bg-muted animate-pulse rounded-lg" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-end justify-between h-24 gap-1">
                  {cadenceData?.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-primary/20 rounded-sm transition-all hover:bg-primary/40"
                        style={{
                          height: maxCadence > 0 ? `${(day.reels / maxCadence) * 80}px` : '2px',
                          minHeight: '2px'
                        }}
                        title={`${format(new Date(day.day), 'MMM d')}: ${day.reels} reels`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{cadenceData?.[0] ? format(new Date(cadenceData[0].day), 'MMM d') : ''}</span>
                  <span>{cadenceData?.[cadenceData.length - 1] ? format(new Date(cadenceData[cadenceData.length - 1].day), 'MMM d') : ''}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}