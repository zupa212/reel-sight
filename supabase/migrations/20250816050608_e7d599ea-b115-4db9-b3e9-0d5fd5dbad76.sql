-- Fix the is_workspace_member function to handle NULL user IDs properly
-- This is needed for public testing mode where auth.uid() returns NULL

CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    -- Return false if user_id is NULL (unauthenticated users)
    SELECT CASE 
        WHEN $2 IS NULL THEN false
        ELSE EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = $1 
            AND workspace_members.user_id = $2
        )
    END;
$function$;