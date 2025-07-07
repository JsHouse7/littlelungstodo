-- Little Lungs ToDo Database Schema
-- Create the database schema for the task management system

-- Enable RLS (Row Level Security)
-- Enable realtime for tables

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'doctor', 'staff')),
  department TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Sheet types for different kinds of task lists
CREATE TYPE sheet_type AS ENUM ('monthly', 'ongoing_admin', 'personal_todo');

-- Sheets table - represents the different "Excel sheets"
CREATE TABLE IF NOT EXISTS public.sheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type sheet_type NOT NULL,
  month_year TEXT, -- Format: "YYYY-MM" for monthly sheets
  owner_id UUID REFERENCES public.profiles(id), -- For personal todos
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Column definitions for flexible sheet structure
CREATE TABLE IF NOT EXISTS public.column_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_type sheet_type NOT NULL,
  column_key TEXT NOT NULL, -- e.g., 'date', 'file_nr', 'patient_name'
  column_label TEXT NOT NULL, -- Display name
  column_type TEXT DEFAULT 'text' CHECK (column_type IN ('text', 'date', 'number', 'boolean', 'select')),
  column_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  select_options JSONB, -- For select type columns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(sheet_type, column_key)
);

-- User column preferences (for per-user customization)
CREATE TABLE IF NOT EXISTS public.user_column_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  sheet_type sheet_type NOT NULL,
  column_key TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  column_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, sheet_type, column_key)
);

-- Main tasks/entries table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID REFERENCES public.sheets(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}', -- Flexible column data
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- File attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default column definitions for each sheet type

-- Monthly task sheet columns
INSERT INTO public.column_definitions (sheet_type, column_key, column_label, column_type, column_order, is_required) VALUES
('monthly', 'date', 'Date', 'date', 1, true),
('monthly', 'file_nr', 'File Nr/Acc nr', 'text', 2, false),
('monthly', 'patient_name', 'Pat Name', 'text', 3, false),
('monthly', 'query', 'Query', 'text', 4, false),
('monthly', 'parents_name', 'Parents name', 'text', 5, false),
('monthly', 'cell_number', 'Cell Number', 'text', 6, false),
('monthly', 'assigned_to', 'To be actioned by', 'text', 7, false),
('monthly', 'executed', 'Executed', 'boolean', 8, false),
('monthly', 'message_take_by', 'Message Take BY', 'text', 9, false);

-- Ongoing practice admin columns
INSERT INTO public.column_definitions (sheet_type, column_key, column_label, column_type, column_order, is_required) VALUES
('ongoing_admin', 'date', 'Date', 'date', 1, true),
('ongoing_admin', 'query', 'Query', 'text', 2, false),
('ongoing_admin', 'cell_number', 'Cell Number', 'text', 3, false),
('ongoing_admin', 'assigned_to', 'To be actioned by', 'text', 4, false);

-- Personal todo columns
INSERT INTO public.column_definitions (sheet_type, column_key, column_label, column_type, column_order, is_required) VALUES
('personal_todo', 'date', 'Date', 'date', 1, true),
('personal_todo', 'todo', 'To Do', 'text', 2, true),
('personal_todo', 'done', 'Done?', 'boolean', 3, false);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_column_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Sheets: All authenticated users can read sheets, but only admins can create/modify global sheets
CREATE POLICY "All users can view sheets" ON public.sheets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create personal todo sheets" ON public.sheets
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (type = 'personal_todo' AND owner_id = auth.uid())
  );

CREATE POLICY "Admins can create any sheet" ON public.sheets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update their own personal sheets" ON public.sheets
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (type = 'personal_todo' AND owner_id = auth.uid())
  );

CREATE POLICY "Admins can update any sheet" ON public.sheets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Column definitions: Everyone can read, only admins can modify
CREATE POLICY "All users can view column definitions" ON public.column_definitions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify column definitions" ON public.column_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User column preferences: Users can only access their own
CREATE POLICY "Users can manage their own column preferences" ON public.user_column_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Tasks: Users can read all tasks, create tasks, and update tasks assigned to them
CREATE POLICY "All users can view tasks" ON public.tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update tasks they created or are assigned to" ON public.tasks
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (created_by = auth.uid() OR assigned_to = auth.uid())
  );

CREATE POLICY "Admins can update any task" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Task attachments: Follow same rules as tasks
CREATE POLICY "All users can view task attachments" ON public.task_attachments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can upload attachments" ON public.task_attachments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Functions and Triggers

-- Function to handle user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.sheets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sheets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_attachments; 