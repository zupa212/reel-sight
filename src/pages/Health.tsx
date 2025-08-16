import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  Database, 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Activity,
  Webhook,
  Settings,
  Code2
} from 'lucide-react';
import { format } from 'date-fns';

export default function Health() {
  // Mock health data - in real app this would come from actual health checks
  const environmentStatus = {
    supabaseUrl: 'https://gmhirmoqzuipceblfzfe.supabase.co',
    supabaseConnected: true,
    secretsConfigured: {
      apifyToken: true,
      apifyWebhookSecret: true
    }
  };

  const edgeFunctions = [
    {
      name: 'apify_webhook',
      url: 'https://gmhirmoqzuipceblfzfe.functions.supabase.co/apify_webhook',
      status: 'healthy',
      lastDeployment: new Date('2024-01-15T10:30:00Z'),
      description: 'Handles incoming webhook data from Apify scraper'
    },
    {
      name: 'process_inbox',
      url: 'https://gmhirmoqzuipceblfzfe.functions.supabase.co/process_inbox',
      status: 'healthy',
      lastDeployment: new Date('2024-01-15T10:25:00Z'),
      description: 'Processes webhook inbox and normalizes data'
    },
    {
      name: 'enable_model',
      url: 'https://gmhirmoqzuipceblfzfe.functions.supabase.co/enable_model',
      status: 'warning',
      lastDeployment: new Date('2024-01-15T09:45:00Z'),
      description: 'Starts backfill scraping for newly enabled models'
    },
    {
      name: 'schedule_scrape_reels',
      url: 'https://gmhirmoqzuipceblfzfe.functions.supabase.co/schedule_scrape_reels',
      status: 'healthy',
      lastDeployment: new Date('2024-01-15T10:15:00Z'),
      description: 'Daily cron job to scrape latest reels'
    }
  ];

  const databaseHealth = {
    tables: [
      { name: 'models', count: 12, lastActivity: new Date('2024-01-15T11:20:00Z') },
      { name: 'reels', count: 1248, lastActivity: new Date('2024-01-15T11:15:00Z') },
      { name: 'reel_metrics_daily', count: 8736, lastActivity: new Date('2024-01-15T11:10:00Z') },
      { name: 'webhooks_inbox', count: 342, lastActivity: new Date('2024-01-15T11:00:00Z') },
      { name: 'workspaces', count: 3, lastActivity: new Date('2024-01-14T16:30:00Z') }
    ],
    rls: {
      enabled: true,
      policies: 12,
      status: 'healthy'
    }
  };

  const cronJobs = [
    {
      name: 'Daily Reel Scraping',
      schedule: '0 6 * * *', // 6 AM daily
      lastRun: new Date('2024-01-15T06:00:00Z'),
      nextRun: new Date('2024-01-16T06:00:00Z'),
      status: 'success'
    },
    {
      name: 'Process Webhook Inbox',
      schedule: '*/15 * * * *', // Every 15 minutes
      lastRun: new Date('2024-01-15T11:15:00Z'),
      nextRun: new Date('2024-01-15T11:30:00Z'),
      status: 'success'
    }
  ];

  const webhookStats = {
    last24h: {
      received: 45,
      processed: 43,
      failed: 2,
      avgProcessingTime: '2.3s'
    },
    recentActivity: [
      { source: 'instagram', status: 'success', timestamp: new Date('2024-01-15T11:20:00Z'), items: 5 },
      { source: 'instagram', status: 'success', timestamp: new Date('2024-01-15T11:15:00Z'), items: 3 },
      { source: 'instagram', status: 'failed', timestamp: new Date('2024-01-15T11:10:00Z'), items: 0 },
      { source: 'instagram', status: 'success', timestamp: new Date('2024-01-15T11:05:00Z'), items: 8 }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error':
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return <Badge className="bg-success/10 text-success border-success/20">{status}</Badge>;
      case 'warning':
        return <Badge className="bg-warning/10 text-warning border-warning/20">{status}</Badge>;
      case 'error':
      case 'failed':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Monitor system status, edge functions, and data pipeline health
          </p>
        </div>
        <Button size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Environment Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Environment
            </CardTitle>
            <CardDescription>
              Core system configuration and connectivity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Supabase Connection</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(environmentStatus.supabaseConnected ? 'success' : 'error')}
                <span className="text-xs text-muted-foreground font-mono">
                  {environmentStatus.supabaseUrl}
                </span>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Secrets Configuration</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">APIFY_TOKEN</span>
                  {getStatusIcon(environmentStatus.secretsConfigured.apifyToken ? 'success' : 'error')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">APIFY_WEBHOOK_SECRET</span>
                  {getStatusIcon(environmentStatus.secretsConfigured.apifyWebhookSecret ? 'success' : 'error')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Metrics
            </CardTitle>
            <CardDescription>
              Real-time performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">98.9%</div>
                <div className="text-xs text-muted-foreground">Uptime (30d)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">145ms</div>
                <div className="text-xs text-muted-foreground">Avg Response</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">0</div>
                <div className="text-xs text-muted-foreground">Active Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">4.2GB</div>
                <div className="text-xs text-muted-foreground">DB Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edge Functions */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Edge Functions
          </CardTitle>
          <CardDescription>
            Serverless function deployment status and health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {edgeFunctions.map((func) => (
              <div key={func.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium font-mono">{func.name}</span>
                    {getStatusBadge(func.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{func.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Last deployed: {format(func.lastDeployment, 'MMM d, yyyy HH:mm')}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={func.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Test
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Health */}
      <Card className="bg-gradient-card border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Health
          </CardTitle>
          <CardDescription>
            Table statistics and Row Level Security status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-3">
              <div className="font-medium">Table Statistics</div>
              {databaseHealth.tables.map((table) => (
                <div key={table.name} className="flex items-center justify-between text-sm">
                  <span className="font-mono">{table.name}</span>
                  <div className="text-right">
                    <div className="font-medium">{table.count.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(table.lastActivity, 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="font-medium">Row Level Security</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">RLS Enabled</span>
                  {getStatusIcon(databaseHealth.rls.enabled ? 'success' : 'error')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Policies</span>
                  <span className="text-sm font-medium">{databaseHealth.rls.policies}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  {getStatusBadge(databaseHealth.rls.status)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-medium">Recent Migrations</div>
              <div className="text-sm text-muted-foreground">
                Last migration: <br />
                <span className="font-mono">20240115_add_models_table</span><br />
                <span className="text-xs">Jan 15, 2024 10:30 AM</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cron Jobs & Webhooks */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Scheduled Jobs
            </CardTitle>
            <CardDescription>
              Cron job status and execution history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cronJobs.map((job, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{job.name}</span>
                  {getStatusIcon(job.status)}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Schedule: <span className="font-mono">{job.schedule}</span></div>
                  <div>Last run: {format(job.lastRun, 'MMM d, HH:mm')}</div>
                  <div>Next run: {format(job.nextRun, 'MMM d, HH:mm')}</div>
                </div>
                {index < cronJobs.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Webhook Activity
            </CardTitle>
            <CardDescription>
              Incoming webhook processing statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-primary">{webhookStats.last24h.received}</div>
                <div className="text-xs text-muted-foreground">Received (24h)</div>
              </div>
              <div>
                <div className="text-lg font-bold text-success">{webhookStats.last24h.processed}</div>
                <div className="text-xs text-muted-foreground">Processed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-destructive">{webhookStats.last24h.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-accent">{webhookStats.last24h.avgProcessingTime}</div>
                <div className="text-xs text-muted-foreground">Avg Time</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Activity</div>
              {webhookStats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(activity.status)}
                    <span className="font-mono">{activity.source}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs">{activity.items} items</div>
                    <div className="text-xs text-muted-foreground">
                      {format(activity.timestamp, 'HH:mm:ss')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}