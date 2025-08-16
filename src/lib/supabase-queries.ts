import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { track } from './track';

// Models queries
export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      track('query:models_fetch_start');
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        track('query:models_fetch_error', { error: error.message });
        throw error;
      }
      
      track('query:models_fetch_ok', { count: data?.length || 0 });
      return data;
    }
  });
}

export function useAddModel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ username, displayName }: { username: string; displayName?: string }) => {
      track('mutation:add_model_start', { username });
      
      // Clean username (remove @ if present)
      const cleanUsername = username.replace(/^@/, '');
      
      // Use the add_model RPC function which handles workspace creation automatically
      const { data, error } = await supabase.rpc('add_model', {
        username_param: cleanUsername,
        display_name_param: displayName || null
      });
      
      if (error) {
        track('mutation:add_model_error', { error: error.message });
        throw error;
      }
      
      track('mutation:add_model_ok', { username: cleanUsername, modelId: data });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    }
  });
}

// Reels queries
export function useReels(filters?: {
  modelId?: string;
  dateRange?: string;
  minViews?: number;
}) {
  return useQuery({
    queryKey: ['reels', filters],
    queryFn: async () => {
      track('query:reels_fetch_start', { filters });
      
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
        .order('posted_at', { ascending: false });

      if (filters?.modelId) {
        query = query.eq('model_id', filters.modelId);
      }

      // Apply date range filter
      if (filters?.dateRange) {
        const days = parseInt(filters.dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('posted_at', cutoffDate.toISOString());
      }

      // Apply min views filter at database level for better performance
      if (filters?.minViews && filters.minViews > 0) {
        query = query.gte('reel_metrics_daily.views', filters.minViews);
      }

      const { data, error } = await query;
      
      if (error) {
        track('query:reels_fetch_error', { error: error.message });
        throw error;
      }
      
      // Process data to structure 7-day sparkline data
      const processedData = (data || []).map(reel => {
        // Sort metrics by day (most recent first) and get last 7 days
        const sortedMetrics = (reel.reel_metrics_daily || [])
          .sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime())
          .slice(0, 7);
        
        // Create 7-day view trend (reverse to show oldest to newest)
        const weeklyViews = sortedMetrics.reverse().map(m => m.views || 0);
        
        // Pad with zeros if we don't have 7 days of data
        while (weeklyViews.length < 7) {
          weeklyViews.unshift(0);
        }
        
        return {
          ...reel,
          weeklyViews
        };
      });
      
      track('query:reels_fetch_ok', { count: processedData.length });
      return processedData;
    }
  });
}

// Health/diagnostics queries
export function useCronStatus() {
  return useQuery({
    queryKey: ['cron-status'],
    queryFn: async () => {
      track('query:cron_status_fetch_start');
      const { data, error } = await supabase
        .from('cron_status')
        .select('*');
      
      if (error) {
        track('query:cron_status_fetch_error', { error: error.message });
        throw error;
      }
      
      track('query:cron_status_fetch_ok', { count: data?.length || 0 });
      return data;
    }
  });
}

export function useEventLogs(limit = 100) {
  return useQuery({
    queryKey: ['event-logs', limit],
    queryFn: async () => {
      track('query:event_logs_fetch_start');
      const { data, error } = await supabase
        .from('event_logs')
        .select('*')
        .order('ts', { ascending: false })
        .limit(limit);
      
      if (error) {
        track('query:event_logs_fetch_error', { error: error.message });
        throw error;
      }
      
      track('query:event_logs_fetch_ok', { count: data?.length || 0 });
      return data;
    }
  });
}

// Dashboard bundle query using RPC
export function useDashboardBundle(filters?: { modelIds?: string[] }) {
  return useQuery({
    queryKey: ['dashboard-bundle', filters],
    queryFn: async () => {
      track('query:dashboard_bundle_fetch_start', { filters });
      
      const { data, error } = await supabase.rpc('api_dashboard_bundle', {
        model_ids: filters?.modelIds && filters.modelIds.length > 0 ? filters.modelIds : null
      });
      
      if (error) {
        track('query:dashboard_bundle_fetch_error', { error: error.message });
        throw error;
      }
      
      track('query:dashboard_bundle_fetch_ok');
      return data;
    }
  });
}

// Legacy individual dashboard queries (keeping for backward compatibility)
export function useDashboardKPIs(filters?: { modelIds?: string[] }) {
  return useQuery({
    queryKey: ['dashboard-kpis', filters],
    queryFn: async () => {
      track('query:dashboard_kpis_fetch_start', { filters });
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get reels with metrics for last 30 days
      let reelsQuery = supabase
        .from('reels')
        .select(`
          *,
          models!inner(username, display_name),
          reel_metrics_daily!inner(*)
        `)
        .gte('posted_at', thirtyDaysAgo.toISOString())
        .order('posted_at', { ascending: false });
      
      if (filters?.modelIds && filters.modelIds.length > 0) {
        reelsQuery = reelsQuery.in('model_id', filters.modelIds);
      }
      
      const { data: reelsData, error } = await reelsQuery;
      
      if (error) {
        track('query:dashboard_kpis_fetch_error', { error: error.message });
        throw error;
      }
      
      // Calculate KPIs
      const now = new Date();
      const reels7d = reelsData?.filter(r => new Date(r.posted_at) >= sevenDaysAgo) || [];
      const reels30d = reelsData || [];
      
      const views7d = reels7d.reduce((sum, reel) => {
        const latestMetrics = reel.reel_metrics_daily?.[0];
        return sum + (latestMetrics?.views || 0);
      }, 0);
      
      const views30d = reels30d.reduce((sum, reel) => {
        const latestMetrics = reel.reel_metrics_daily?.[0];
        return sum + (latestMetrics?.views || 0);
      }, 0);
      
      const likes30d = reels30d.reduce((sum, reel) => {
        const latestMetrics = reel.reel_metrics_daily?.[0];
        return sum + (latestMetrics?.likes || 0);
      }, 0);
      
      const comments30d = reels30d.reduce((sum, reel) => {
        const latestMetrics = reel.reel_metrics_daily?.[0];
        return sum + (latestMetrics?.comments || 0);
      }, 0);
      
      // Calculate previous 7 days for momentum
      const prevSevenDaysAgo = new Date();
      prevSevenDaysAgo.setDate(prevSevenDaysAgo.getDate() - 14);
      const reelsPrev7d = reelsData?.filter(r => {
        const postedAt = new Date(r.posted_at);
        return postedAt >= prevSevenDaysAgo && postedAt < sevenDaysAgo;
      }) || [];
      
      const viewsPrev7d = reelsPrev7d.reduce((sum, reel) => {
        const latestMetrics = reel.reel_metrics_daily?.[0];
        return sum + (latestMetrics?.views || 0);
      }, 0);
      
      const avgViewsPerReel30d = reels30d.length > 0 ? views30d / reels30d.length : 0;
      const engagementPer1k30d = views30d > 0 ? ((likes30d + comments30d) / views30d) * 1000 : 0;
      const momentumDown = views7d < viewsPrev7d * 0.75; // 25%+ drop
      
      const kpis = {
        views7d,
        views30d,
        avgViewsPerReel30d,
        engagementPer1k30d,
        momentumDown,
        reelsCount30d: reels30d.length
      };
      
      track('query:dashboard_kpis_fetch_ok', kpis);
      return kpis;
    }
  });
}

// Top reels for dashboard
export function useTopReels(filters?: { modelIds?: string[] }) {
  return useQuery({
    queryKey: ['top-reels', filters],
    queryFn: async () => {
      track('query:top_reels_fetch_start', { filters });
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabase
        .from('reels')
        .select(`
          *,
          models!inner(username, display_name),
          reel_metrics_daily!inner(*)
        `)
        .gte('posted_at', thirtyDaysAgo.toISOString())
        .order('posted_at', { ascending: false })
        .limit(10);
        
      if (filters?.modelIds && filters.modelIds.length > 0) {
        query = query.in('model_id', filters.modelIds);
      }
      
      const { data, error } = await query;
      
      if (error) {
        track('query:top_reels_fetch_error', { error: error.message });
        throw error;
      }
      
      // Sort by views and take top 5
      const sortedReels = (data || [])
        .map(reel => ({
          ...reel,
          latestViews: reel.reel_metrics_daily?.[0]?.views || 0,
          latestLikes: reel.reel_metrics_daily?.[0]?.likes || 0,
          latestComments: reel.reel_metrics_daily?.[0]?.comments || 0
        }))
        .sort((a, b) => b.latestViews - a.latestViews)
        .slice(0, 5);
      
      track('query:top_reels_fetch_ok', { count: sortedReels.length });
      return sortedReels;
    }
  });
}

// Cadence data for dashboard
export function useCadenceData(filters?: { modelIds?: string[] }) {
  return useQuery({
    queryKey: ['cadence-data', filters],
    queryFn: async () => {
      track('query:cadence_fetch_start', { filters });
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabase
        .from('reels')
        .select('posted_at, model_id')
        .gte('posted_at', thirtyDaysAgo.toISOString());
        
      if (filters?.modelIds && filters.modelIds.length > 0) {
        query = query.in('model_id', filters.modelIds);
      }
      
      const { data, error } = await query;
      
      if (error) {
        track('query:cadence_fetch_error', { error: error.message });
        throw error;
      }
      
      // Group by day
      const cadenceMap: Record<string, number> = {};
      data?.forEach(reel => {
        const day = new Date(reel.posted_at).toISOString().split('T')[0];
        cadenceMap[day] = (cadenceMap[day] || 0) + 1;
      });
      
      // Convert to array format for last 30 days
      const cadenceData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const day = date.toISOString().split('T')[0];
        cadenceData.push({
          day,
          reels: cadenceMap[day] || 0
        });
      }
      
      track('query:cadence_fetch_ok', { daysWithData: Object.keys(cadenceMap).length });
      return cadenceData;
    }
  });
}
