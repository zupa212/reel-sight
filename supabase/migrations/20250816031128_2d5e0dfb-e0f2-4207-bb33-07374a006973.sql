-- Fix workspace authentication issue: Create default workspace for users without one
-- And update the add model process to use proper workspace_id

-- First, let's create a function to ensure users have a workspace
CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_id uuid;
    workspace_id uuid;
    user_email text;
BEGIN
    -- Get current user
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if user already has a workspace
    SELECT wm.workspace_id INTO workspace_id
    FROM workspace_members wm
    WHERE wm.user_id = user_id
    LIMIT 1;
    
    -- If no workspace found, create one
    IF workspace_id IS NULL THEN
        -- Get user email for workspace name
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = user_id;
        
        -- Create workspace
        INSERT INTO workspaces (name, slug)
        VALUES (
            COALESCE(user_email, 'My Workspace'),
            LOWER(REPLACE(COALESCE(user_email, 'workspace-' || user_id::text), '@', '-'))
        )
        RETURNING id INTO workspace_id;
        
        -- Add user as workspace owner
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (workspace_id, user_id, 'owner');
    END IF;
    
    RETURN workspace_id;
END;
$$;

-- Create function to add models with proper workspace handling
CREATE OR REPLACE FUNCTION public.add_model(username_param text, display_name_param text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    model_id uuid;
    user_workspace_id uuid;
BEGIN
    -- Ensure user has a workspace
    user_workspace_id := ensure_user_workspace();
    
    -- Insert the model
    INSERT INTO models (workspace_id, username, display_name, status)
    VALUES (user_workspace_id, username_param, display_name_param, 'pending')
    RETURNING id INTO model_id;
    
    RETURN model_id;
END;
$$;