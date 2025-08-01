import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, full_name, role, department, phone, password } = await request.json()

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Validate password
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

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

    // Create the user directly with password instead of invitation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email since admin is creating
      user_metadata: {
        full_name,
        role,
        department,
        phone
      }
    })

    if (authError) {
      console.error('Auth invitation error:', authError)
      return NextResponse.json(
        { error: `Failed to invite user: ${authError.message}` },
        { status: 500 }
      )
    }

    // Try to create the profile record, first with is_active, then without if it fails
    let profileInsertError = null
    
    // First attempt with is_active
    const { error: profileError1 } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authData.user?.id,
        email,
        full_name: full_name?.trim() || null,
        role,
        department: department?.trim() || null,
        phone: phone?.trim() || null,
        is_active: true
      }])

    if (profileError1) {
      // If is_active column error, try without it
      if (profileError1.message.includes('is_active') || profileError1.message.includes('schema cache')) {
        console.log('is_active column not found, trying without it')
        const { error: profileError2 } = await supabaseAdmin
          .from('profiles')
          .insert([{
            id: authData.user?.id,
            email,
            full_name: full_name?.trim() || null,
            role,
            department: department?.trim() || null,
            phone: phone?.trim() || null
          }])
        profileInsertError = profileError2
      } else {
        profileInsertError = profileError1
      }
    }

    if (profileInsertError) {
      console.error('Profile creation error:', profileInsertError)
      return NextResponse.json(
        { error: `User invited but profile creation failed: ${profileInsertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: authData.user
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 