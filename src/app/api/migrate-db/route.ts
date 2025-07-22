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

    // Check if is_active column exists
    const { data: columns, error: columnError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'profiles')
      .eq('column_name', 'is_active')

    if (columnError) {
      console.error('Error checking columns:', columnError)
    } else if (!columns || columns.length === 0) {
      // is_active column doesn't exist, add it
      try {
        const { error: addColumnError } = await supabaseAdmin
          .rpc('exec_sql', {
            sql: 'ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT true;'
          })
        
        if (addColumnError) {
          console.error('Error adding is_active column:', addColumnError)
          migrations.push({ 
            migration: 'add_is_active_column', 
            status: 'failed', 
            error: addColumnError.message 
          })
        } else {
          migrations.push({ 
            migration: 'add_is_active_column', 
            status: 'success' 
          })
        }
      } catch (err) {
        console.error('Exception adding is_active column:', err)
        migrations.push({ 
          migration: 'add_is_active_column', 
          status: 'failed', 
          error: 'Exception during column addition' 
        })
      }
    } else {
      migrations.push({ 
        migration: 'add_is_active_column', 
        status: 'already_exists' 
      })
    }

    // Update existing profiles to have is_active = true if they don't have it set
    try {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: true })
        .is('is_active', null)

      if (updateError) {
        migrations.push({ 
          migration: 'set_default_is_active', 
          status: 'failed', 
          error: updateError.message 
        })
      } else {
        migrations.push({ 
          migration: 'set_default_is_active', 
          status: 'success' 
        })
      }
    } catch (err) {
      migrations.push({ 
        migration: 'set_default_is_active', 
        status: 'failed', 
        error: 'Exception during update' 
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