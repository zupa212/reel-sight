import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, TrendingUp, BarChart3, Download, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardKPIs, useTopReels, useCadenceData } from "@/lib/supabase-queries";
import { track } from "@/lib/track";

export default function Performance() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  });
  
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [viewType, setViewType] = useState<'overview' | 'detailed'>('overview');

  // Fetch performance data
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs({
    modelIds: selectedModels.length > 0 ? selectedModels : undefined
  });

  const { data: topReels, isLoading: reelsLoading } = useTopReels({
    modelIds: selectedModels.length > 0 ? selectedModels : undefined
  });

  const { data: cadenceData, isLoading: cadenceLoading } = useCadenceData({
    modelIds: selectedModels.length > 0 ? selectedModels : undefined
  });

  const handleExport = () => {
    track('performance:export_data', { 
      dateRange: dateRange ? {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      } : null,
      selectedModels,
      viewType
    });

    // Create CSV data
    const data = {
      kpis,
      topReels,
      cadenceData,
      exportDate: new Date().toISOString(),
      filters: { dateRange, selectedModels, viewType }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isLoading = kpisLoading || reelsLoading || cadenceLoading;

  return (
    <div className="container mx-auto py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Performance Analytics</h1>
          <p className="text-muted-foreground">Advanced analytics and performance insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          
          <Select value={viewType} onValueChange={(value: 'overview' | 'detailed') => setViewType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="View type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filters & Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-80 justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Quick Date Presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Select</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: startOfDay(subDays(new Date(), 7)),
                    to: endOfDay(new Date())
                  })}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: startOfDay(subDays(new Date(), 30)),
                    to: endOfDay(new Date())
                  })}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: startOfDay(subDays(new Date(), 90)),
                    to: endOfDay(new Date())
                  })}
                >
                  Last 90 days
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-40 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpis?.views30d?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Views/Reel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {Math.round(kpis?.avgViewsPerReel30d || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Engagement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {(kpis?.engagementPer1k30d || 0).toFixed(1)}‰
                </div>
                <p className="text-xs text-muted-foreground">Per 1k views</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Reels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{kpis?.reelsCount30d || 0}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Content */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Performing Reels
              </CardTitle>
              <CardDescription>
                Your highest-performing content based on views
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topReels && topReels.length > 0 ? (
                <div className="space-y-4">
                  {topReels.slice(0, 5).map((reel, index) => (
                    <div key={reel.id} className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border border-border/50">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
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
                          {format(new Date(reel.posted_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{(reel as any).views?.toLocaleString() || '0'}</p>
                        <p className="text-xs text-muted-foreground">views</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No performance data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Publishing Analysis */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Publishing Cadence Analysis
              </CardTitle>
              <CardDescription>
                Content publishing frequency and timing insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cadenceData && cadenceData.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {cadenceData.slice(0, 28).map((data, index) => {
                      const intensity = Math.min(data.reels / 3, 1); // Normalize to 0-1
                      return (
                        <div 
                          key={index}
                          className="aspect-square rounded border border-border flex items-center justify-center text-xs font-medium"
                          style={{
                            backgroundColor: intensity > 0 
                              ? `hsl(var(--primary) / ${0.2 + intensity * 0.8})` 
                              : 'hsl(var(--muted))',
                            color: intensity > 0.5 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'
                          }}
                          title={`${format(new Date(data.day), 'MMM dd')}: ${data.reels} reels`}
                        >
                          {data.reels}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Less</span>
                    <span>More</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No cadence data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}