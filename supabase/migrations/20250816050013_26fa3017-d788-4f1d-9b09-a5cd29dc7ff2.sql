-- Create a default workspace for public testing
INSERT INTO public.workspaces (name, slug)
VALUES ('Default Workspace', 'default')
ON CONFLICT (slug) DO NOTHING;

-- Get the workspace ID and display it for configuration
SELECT id, name, slug 
FROM public.workspaces 
WHERE slug = 'default';