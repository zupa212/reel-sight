-- Update RLS policies for models table to allow public testing
-- When there's no authenticated user (public testing mode), allow operations on the default workspace

-- Drop existing policies that conflict with public testing
DROP POLICY IF EXISTS "Users can insert models in their workspace" ON public.models;
DROP POLICY IF EXISTS "Users can update their models" ON public.models;
DROP POLICY IF EXISTS "Users can view models in their workspace" ON public.models;
DROP POLICY IF EXISTS "Users can view models in their workspaces" ON public.models;
DROP POLICY IF EXISTS "Users can manage models in their workspaces" ON public.models;

-- Create new policies that work for both authenticated users and public testing
CREATE POLICY "Allow model operations for workspace members or public testing" 
ON public.models 
FOR ALL 
USING (
  -- Allow if user is authenticated and is a workspace member
  (auth.uid() IS NOT NULL AND is_workspace_member(workspace_id, auth.uid())) 
  OR 
  -- Allow if no user is authenticated (public testing mode) and it's the default workspace
  (auth.uid() IS NULL AND workspace_id = '07ac503e-47b5-45a7-b13f-d0cc7ec1cec1'::uuid)
)
WITH CHECK (
  -- Same check for inserts/updates
  (auth.uid() IS NOT NULL AND is_workspace_member(workspace_id, auth.uid())) 
  OR 
  (auth.uid() IS NULL AND workspace_id = '07ac503e-47b5-45a7-b13f-d0cc7ec1cec1'::uuid)
);