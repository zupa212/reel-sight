import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, PlayCircle, TrendingUp, Eye, Heart, MessageCircle, Share } from 'lucide-react';

export default function Dashboard() {
  // Mock data for demo purposes
  const stats = [
    {
      title: 'Total Models',
      value: '12',
      change: '+2.5%',
      changeType: 'positive' as const,
      icon: Users
    },
    {
      title: 'Total Reels',
      value: '1,248',
      change: '+12.3%', 
      changeType: 'positive' as const,
      icon: PlayCircle
    },
    {
      title: 'Total Views',
      value: '2.4M',
      change: '+8.7%',
      changeType: 'positive' as const,
      icon: Eye
    },
    {
      title: 'Engagement Rate',
      value: '4.8%',
      change: '-0.3%',
      changeType: 'negative' as const,
      icon: TrendingUp
    }
  ];

  const topModels = [
    { name: '@model_sarah', reels: 45, views: '284K', engagement: '5.2%' },
    { name: '@fitness_emma', reels: 38, views: '192K', engagement: '4.8%' },
    { name: '@lifestyle_alex', reels: 42, views: '156K', engagement: '4.1%' },
    { name: '@beauty_mia', reels: 35, views: '134K', engagement: '3.9%' },
  ];

  const recentActivity = [
    { model: '@model_sarah', action: 'Posted new reel', time: '2 hours ago', metric: '+1.2K views' },
    { model: '@fitness_emma', action: 'Reached milestone', time: '4 hours ago', metric: '100K views' },
    { model: '@lifestyle_alex', action: 'High engagement reel', time: '6 hours ago', metric: '8.3% rate' },
    { model: '@beauty_mia', action: 'Posted new reel', time: '8 hours ago', metric: '+987 views' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Instagram Reels performance
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-gradient-card border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.changeType === 'positive' 
                  ? 'text-success' 
                  : 'text-destructive'
              }`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Performing Models */}
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Top Performing Models
            </CardTitle>
            <CardDescription>
              Models with highest engagement this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topModels.map((model, index) => (
              <div key={model.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{model.name}</p>
                    <p className="text-sm text-muted-foreground">{model.reels} reels</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{model.views}</p>
                  <p className="text-sm text-success">{model.engagement}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest updates from your models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium text-primary">{activity.model}</span>
                    {' '}
                    <span className="text-muted-foreground">{activity.action}</span>
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                    <p className="text-xs font-medium text-success">{activity.metric}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <button className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Add Model</span>
            </button>
            <button className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
              <PlayCircle className="w-4 h-4" />
              <span className="text-sm font-medium">View Reels</span>
            </button>
            <button className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">Analytics</span>
            </button>
            <button className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-colors">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Reports</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}