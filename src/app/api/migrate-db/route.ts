import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Create a client to check if the current user is an admin
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if the current user is an admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError || currentUserProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const migrations = []

    // Check if user_invitations table exists
    const { data: tables, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_invitations')

    if (tableError) {
      console.error('Error checking tables:', tableError)
    } else if (!tables || tables.length === 0) {
      // user_invitations table doesn't exist, create it
      try {
        const { error: createTableError } = await supabaseAdmin.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.user_invitations (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              invited_by UUID REFERENCES public.profiles(id) NOT NULL,
              role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'staff')),
              department TEXT,
              phone TEXT,
              full_name TEXT,
              invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
              accepted_at TIMESTAMP WITH TIME ZONE,
              status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
            );
          `
        })

        if (createTableError) {
          console.error('Error creating user_invitations table:', createTableError)
          migrations.push({
            migration: 'create_user_invitations_table',
            status: 'failed',
            error: createTableError.message
          })
        } else {
          migrations.push({
            migration: 'create_user_invitations_table',
            status: 'success'
          })
        }
      } catch (err) {
        console.error('Exception creating user_invitations table:', err)
        migrations.push({
          migration: 'create_user_invitations_table',
          status: 'failed',
          error: 'Exception during table creation'
        })
      }
    } else {
      migrations.push({
        migration: 'create_user_invitations_table',
        status: 'already_exists'
      })
    }

    // Enable RLS on user_invitations table
    try {
      const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
        sql: 'ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;'
      })

      if (rlsError) {
        console.error('Error enabling RLS on user_invitations:', rlsError)
        migrations.push({
          migration: 'enable_rls_user_invitations',
          status: 'failed',
          error: rlsError.message
        })
      } else {
        migrations.push({
          migration: 'enable_rls_user_invitations',
          status: 'success'
        })
      }
    } catch (err) {
      console.error('Exception enabling RLS on user_invitations:', err)
      migrations.push({
        migration: 'enable_rls_user_invitations',
        status: 'failed',
        error: 'Exception during RLS enable'
      })
    }

    // Add RLS policies for user_invitations
    try {
      const { error: policyError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE POLICY "Admins can view all invitations" ON public.user_invitations
            FOR SELECT USING (
              EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
              )
            );

          CREATE POLICY "Admins can create invitations" ON public.user_invitations
            FOR INSERT WITH CHECK (
              EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
              )
            );

          CREATE POLICY "Admins can update invitations" ON public.user_invitations
            FOR UPDATE USING (
              EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
              )
            );
        `
      })

      if (policyError) {
        console.error('Error creating RLS policies for user_invitations:', policyError)
        migrations.push({
          migration: 'create_rls_policies_user_invitations',
          status: 'failed',
          error: policyError.message
        })
      } else {
        migrations.push({
          migration: 'create_rls_policies_user_invitations',
          status: 'success'
        })
      }
    } catch (err) {
      console.error('Exception creating RLS policies for user_invitations:', err)
      migrations.push({
        migration: 'create_rls_policies_user_invitations',
        status: 'failed',
        error: 'Exception during policy creation'
      })
    }

    // Add updated_at trigger for user_invitations
    try {
      const { error: triggerError } = await supabaseAdmin.rpc('exec_sql', {
        sql: "CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_invitations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();"
      })

      if (triggerError) {
        console.error('Error creating updated_at trigger for user_invitations:', triggerError)
        migrations.push({
          migration: 'create_updated_at_trigger_user_invitations',
          status: 'failed',
          error: triggerError.message
        })
      } else {
        migrations.push({
          migration: 'create_updated_at_trigger_user_invitations',
          status: 'success'
        })
      }
    } catch (err) {
      console.error('Exception creating updated_at trigger for user_invitations:', err)
      migrations.push({
        migration: 'create_updated_at_trigger_user_invitations',
        status: 'failed',
        error: 'Exception during trigger creation'
      })
    }

    // Check if user_audit_log table exists
    const { data: auditTable, error: auditTableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_audit_log')

    if (auditTableError) {
      console.error('Error checking audit table:', auditTableError)
    } else if (!auditTable || auditTable.length === 0) {
      // user_audit_log table doesn't exist, create it
      try {
        const { error: createAuditTableError } = await supabaseAdmin.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.user_audit_log (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              performed_by UUID REFERENCES public.profiles(id) NOT NULL,
              action TEXT NOT NULL CHECK (action IN ('invite_user', 'update_user', 'reset_password', 'deactivate_user', 'activate_user', 'delete_user')),
              target_user_id UUID,
              target_user_email TEXT,
              details JSONB,
              ip_address INET,
              user_agent TEXT,
              performed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
            );
          `
        })

        if (createAuditTableError) {
          console.error('Error creating user_audit_log table:', createAuditTableError)
          migrations.push({
            migration: 'create_user_audit_log_table',
            status: 'failed',
            error: createAuditTableError.message
          })
        } else {
          migrations.push({
            migration: 'create_user_audit_log_table',
            status: 'success'
          })
        }
      } catch (err) {
        console.error('Exception creating user_audit_log table:', err)
        migrations.push({
          migration: 'create_user_audit_log_table',
          status: 'failed',
          error: 'Exception during table creation'
        })
      }
    } else {
      migrations.push({
        migration: 'create_user_audit_log_table',
        status: 'already_exists'
      })
    }

    // Enable RLS on user_audit_log table
    try {
      const { error: auditRlsError } = await supabaseAdmin.rpc('exec_sql', {
        sql: 'ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;'
      })

      if (auditRlsError) {
        console.error('Error enabling RLS on user_audit_log:', auditRlsError)
        migrations.push({
          migration: 'enable_rls_user_audit_log',
          status: 'failed',
          error: auditRlsError.message
        })
      } else {
        migrations.push({
          migration: 'enable_rls_user_audit_log',
          status: 'success'
        })
      }
    } catch (err) {
      console.error('Exception enabling RLS on user_audit_log:', err)
      migrations.push({
        migration: 'enable_rls_user_audit_log',
        status: 'failed',
        error: 'Exception during RLS enable'
      })
    }

    // Add RLS policies for user_audit_log
    try {
      const { error: auditPolicyError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE POLICY "Admins can view audit logs" ON public.user_audit_log
            FOR SELECT USING (
              EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
              )
            );

          CREATE POLICY "System can create audit logs" ON public.user_audit_log
            FOR INSERT WITH CHECK (true);
        `
      })

      if (auditPolicyError) {
        console.error('Error creating RLS policies for user_audit_log:', auditPolicyError)
        migrations.push({
          migration: 'create_rls_policies_user_audit_log',
          status: 'failed',
          error: auditPolicyError.message
        })
      } else {
        migrations.push({
          migration: 'create_rls_policies_user_audit_log',
          status: 'success'
        })
      }
    } catch (err) {
      console.error('Exception creating RLS policies for user_audit_log:', err)
      migrations.push({
        migration: 'create_rls_policies_user_audit_log',
        status: 'failed',
        error: 'Exception during policy creation'
      })
    }

    // Update handle_new_user function to handle invitations
    try {
      const { error: functionError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION public.handle_new_user()
          RETURNS TRIGGER AS $$
          DECLARE
            invitation_record RECORD;
          BEGIN
            -- Check if this user was invited
            SELECT * INTO invitation_record
            FROM public.user_invitations
            WHERE email = NEW.email AND status = 'pending'
            LIMIT 1;

            IF FOUND THEN
              -- Create profile from invitation data
              INSERT INTO public.profiles (id, email, full_name, role, department, phone, is_active)
              VALUES (
                NEW.id,
                NEW.email,
                COALESCE(invitation_record.full_name, NEW.raw_user_meta_data->>'full_name'),
                invitation_record.role,
                invitation_record.department,
                invitation_record.phone,
                true
              );

              -- Mark invitation as accepted
              UPDATE public.user_invitations
              SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
              WHERE id = invitation_record.id;
            ELSE
              -- Fallback: create basic profile for non-invited users
              INSERT INTO public.profiles (id, email, full_name, role, is_active)
              VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
                COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
                true
              );
            END IF;

            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      })

      if (functionError) {
        console.error('Error updating handle_new_user function:', functionError)
        migrations.push({
          migration: 'update_handle_new_user_function',
          status: 'failed',
          error: functionError.message
        })
      } else {
        migrations.push({
          migration: 'update_handle_new_user_function',
          status: 'success'
        })
      }
    } catch (err) {
      console.error('Exception updating handle_new_user function:', err)
      migrations.push({
        migration: 'update_handle_new_user_function',
        status: 'failed',
        error: 'Exception during function update'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Database migration completed',
      migrations
    })

  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 