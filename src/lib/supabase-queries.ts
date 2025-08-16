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
      
      // For now, use a hardcoded workspace_id since auth is disabled
      const hardcodedWorkspaceId = '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase
        .from('models')
        .insert({
          username,
          display_name: displayName,
          workspace_id: hardcodedWorkspaceId,
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) {
        track('mutation:add_model_error', { error: error.message });
        throw error;
      }
      
      track('mutation:add_model_ok', { modelId: data.id });
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
          reel_metrics_daily(*)
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

      const { data, error } = await query;
      
      if (error) {
        track('query:reels_fetch_error', { error: error.message });
        throw error;
      }
      
      // Filter by min views if specified
      let filteredData = data || [];
      if (filters?.minViews) {
        filteredData = filteredData.filter(reel => {
          const latestMetrics = reel.reel_metrics_daily?.[0];
          return latestMetrics && latestMetrics.views >= filters.minViews;
        });
      }
      
      track('query:reels_fetch_ok', { count: filteredData.length });
      return filteredData;
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