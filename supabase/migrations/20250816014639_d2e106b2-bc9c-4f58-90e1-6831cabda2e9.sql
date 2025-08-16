-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for workspace member roles
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');

-- Create enum for model status
CREATE TYPE model_status AS ENUM ('enabled', 'disabled', 'pending');

-- Create workspaces table
CREATE TABLE public.workspaces (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace_members table
CREATE TABLE public.workspace_members (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- Create models table (Instagram usernames)
CREATE TABLE public.models (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    display_name TEXT,
    status model_status NOT NULL DEFAULT 'pending',
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    backfill_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, username)
);

-- Create reels table
CREATE TABLE public.reels (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
    instagram_id TEXT NOT NULL,
    url TEXT NOT NULL,
    caption TEXT,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, instagram_id)
);

-- Create reel_metrics_daily table
CREATE TABLE public.reel_metrics_daily (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(reel_id, date)
);

-- Create webhooks_inbox table
CREATE TABLE public.webhooks_inbox (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID,
    source TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    hash TEXT NOT NULL UNIQUE, -- For deduplication
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user info
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    comfort_mode BOOLEAN NOT NULL DEFAULT FALSE,
    high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create helper function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_members.workspace_id = $1 
        AND workspace_members.user_id = $2
    );
$$;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they belong to"
    ON public.workspaces FOR SELECT
    USING (public.is_workspace_member(id, auth.uid()));

CREATE POLICY "Users can update workspaces they own"
    ON public.workspaces FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_id = id 
        AND user_id = auth.uid() 
        AND role = 'owner'
    ));

-- RLS Policies for workspace_members
CREATE POLICY "Users can view members of their workspaces"
    ON public.workspace_members FOR SELECT
    USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace owners can manage members"
    ON public.workspace_members FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'owner'
    ));

-- RLS Policies for models
CREATE POLICY "Users can view models in their workspaces"
    ON public.models FOR SELECT
    USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Users can manage models in their workspaces"
    ON public.models FOR ALL
    USING (public.is_workspace_member(workspace_id, auth.uid()));

-- RLS Policies for reels
CREATE POLICY "Users can view reels in their workspaces"
    ON public.reels FOR SELECT
    USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Users can manage reels in their workspaces"
    ON public.reels FOR ALL
    USING (public.is_workspace_member(workspace_id, auth.uid()));

-- RLS Policies for reel_metrics_daily
CREATE POLICY "Users can view metrics in their workspaces"
    ON public.reel_metrics_daily FOR SELECT
    USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Users can manage metrics in their workspaces"
    ON public.reel_metrics_daily FOR ALL
    USING (public.is_workspace_member(workspace_id, auth.uid()));

-- RLS Policies for webhooks_inbox
CREATE POLICY "Users can view webhooks in their workspaces"
    ON public.webhooks_inbox FOR SELECT
    USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "System can insert webhooks"
    ON public.webhooks_inbox FOR INSERT
    WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_models_updated_at
    BEFORE UPDATE ON public.models
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reel_metrics_daily_updated_at
    BEFORE UPDATE ON public.reel_metrics_daily
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$$;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();