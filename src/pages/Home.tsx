import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PlayCircle, Users, TrendingUp, Instagram, Zap, Target } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Instagram,
      title: 'Instagram Integration',
      description: 'Seamlessly connect and monitor your Instagram creators'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track views, likes, comments, and engagement metrics'
    },
    {
      icon: TrendingUp,
      title: 'Performance Insights',
      description: 'Identify trending content and optimization opportunities'
    },
    {
      icon: Target,
      title: 'Goal Tracking',
      description: 'Set and monitor KPI targets for your creator network'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="relative container mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Instagram Reels KPI Tracker
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Track Your Creator
              <span className="bg-gradient-primary bg-clip-text text-transparent"> Performance</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Monitor Instagram Reels metrics, analyze engagement patterns, and optimize your creator network performance with real-time analytics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                <Link to="/models" className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Open Models
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="bg-card/50 hover:bg-card">
                <Link to="/reels" className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Open Reels
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Comprehensive tools to track, analyze, and optimize your Instagram creator performance
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-gradient-card border-0 shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats Preview */}
      <div className="bg-card/30 border-t">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Get Started Today</h2>
            <p className="text-muted-foreground text-lg">
              Join creators who are already tracking their performance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">2.4M+</div>
              <div className="text-muted-foreground">Total Views Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">1,248</div>
              <div className="text-muted-foreground">Reels Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">4.8%</div>
              <div className="text-muted-foreground">Avg Engagement Rate</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" className="bg-gradient-primary hover:shadow-glow">
              <Link to="/models">
                Start Tracking Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}