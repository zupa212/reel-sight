-- Fix the security issue by recreating the function with proper search_path
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_members.workspace_id = $1 
        AND workspace_members.user_id = $2
    );
$$;