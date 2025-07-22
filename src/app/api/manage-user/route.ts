import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { action, userId, email } = await request.json()

    // Validate required fields
    if (!action || !userId) {
      return NextResponse.json(
        { error: 'Action and userId are required' },
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

    // Prevent admin from performing actions on themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot perform this action on your own account' },
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

    switch (action) {
      case 'reset_password':
        if (!email) {
          return NextResponse.json(
            { error: 'Email is required for password reset' },
            { status: 400 }
          )
        }

        // Get the correct redirect URL based on environment
        const isProduction = process.env.NODE_ENV === 'production'
        const redirectTo = isProduction 
          ? process.env.NEXT_PUBLIC_SITE_URL || 'https://littlelungstodo.vercel.app'
          : 'http://localhost:3000'

        // Send password reset email
        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: redirectTo
          }
        })

        if (resetError) {
          console.error('Password reset error:', resetError)
          return NextResponse.json(
            { error: `Failed to send password reset: ${resetError.message}` },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Password reset email sent successfully'
        })

      case 'delete_user':
        // First deactivate the profile
        const { error: deactivateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_active: false })
          .eq('id', userId)

        if (deactivateError) {
          console.error('Profile deactivation error:', deactivateError)
          return NextResponse.json(
            { error: `Failed to deactivate profile: ${deactivateError.message}` },
            { status: 500 }
          )
        }

        // Delete the user from auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
          console.error('User deletion error:', deleteError)
          return NextResponse.json(
            { error: `Failed to delete user: ${deleteError.message}` },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'User deleted successfully'
        })

      case 'hibernate_user':
        // Deactivate the user profile
        const { error: hibernateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_active: false })
          .eq('id', userId)

        if (hibernateError) {
          console.error('User hibernation error:', hibernateError)
          return NextResponse.json(
            { error: `Failed to hibernate user: ${hibernateError.message}` },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'User hibernated successfully'
        })

      case 'activate_user':
        // Activate the user profile
        const { error: activateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_active: true })
          .eq('id', userId)

        if (activateError) {
          console.error('User activation error:', activateError)
          return NextResponse.json(
            { error: `Failed to activate user: ${activateError.message}` },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'User activated successfully'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('User management API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 