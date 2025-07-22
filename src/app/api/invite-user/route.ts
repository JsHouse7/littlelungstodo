import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, full_name, role, department, phone } = await request.json()

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
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

    // Invite the user via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name,
          role,
          department,
          phone
        }
      }
    )

    if (authError) {
      console.error('Auth invitation error:', authError)
      return NextResponse.json(
        { error: `Failed to invite user: ${authError.message}` },
        { status: 500 }
      )
    }

    // Create the profile record
    const { error: profileInsertError } = await supabaseAdmin
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

    if (profileInsertError) {
      console.error('Profile creation error:', profileInsertError)
      return NextResponse.json(
        { error: `User invited but profile creation failed: ${profileInsertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User invited successfully',
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