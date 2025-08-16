-- Fix workspace member infinite recursion policy issue
-- The issue is in the workspace_members RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;

-- Create new safe policies for workspace_members
CREATE POLICY "Members can view their own membership" 
ON public.workspace_members FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Members can view workspace members" 
ON public.workspace_members FOR SELECT 
USING (
  workspace_id IN (
    SELECT wm.workspace_id 
    FROM public.workspace_members wm 
    WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage workspace members" 
ON public.workspace_members FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.workspace_members owner_check 
    WHERE owner_check.workspace_id = workspace_members.workspace_id 
    AND owner_check.user_id = auth.uid() 
    AND owner_check.role = 'owner'
  )
);

CREATE POLICY "System can insert workspace members"
ON public.workspace_members FOR INSERT
WITH CHECK (true);