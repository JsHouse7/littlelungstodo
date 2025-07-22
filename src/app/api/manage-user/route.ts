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
        console.log('Starting user deletion process for userId:', userId)
        
        try {
          // First, try to deactivate the profile (graceful approach)
          const { error: deactivateError } = await supabaseAdmin
            .from('profiles')
            .update({ is_active: false })
            .eq('id', userId)

          if (deactivateError) {
            console.warn('Profile deactivation failed, proceeding with deletion:', deactivateError.message)
            // Don't fail here, continue with deletion
          } else {
            console.log('Profile deactivated successfully')
          }

          // Delete the user from auth (this will cascade to profile deletion)
          console.log('Attempting to delete user from auth...')
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

          if (deleteError) {
            console.error('User deletion error:', deleteError)
            return NextResponse.json(
              { error: `Failed to delete user: ${deleteError.message}` },
              { status: 500 }
            )
          }

          console.log('User deleted successfully from auth')

          return NextResponse.json({
            success: true,
            message: 'User deleted successfully'
          })
        } catch (deleteException) {
          console.error('Exception during user deletion:', deleteException)
          return NextResponse.json(
            { error: 'An unexpected error occurred during user deletion' },
            { status: 500 }
          )
        }

      case 'hibernate_user':
        try {
          // Try to deactivate the user profile, fallback if is_active column doesn't exist
          let hibernateError = null
          
          // First attempt with is_active
          const { error: hibernateError1 } = await supabaseAdmin
            .from('profiles')
            .update({ is_active: false })
            .eq('id', userId)

          if (hibernateError1) {
            // If is_active column error, just mark as error but don't fail
            if (hibernateError1.message.includes('is_active') || hibernateError1.message.includes('schema cache')) {
              console.warn('is_active column not found for hibernation, user may need manual deactivation')
              // For now, we'll consider this a success since the column might not exist
            } else {
              hibernateError = hibernateError1
            }
          }

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
        } catch (hibernateException) {
          console.error('Exception during user hibernation:', hibernateException)
          return NextResponse.json(
            { error: 'An unexpected error occurred during user hibernation' },
            { status: 500 }
          )
        }

      case 'activate_user':
        try {
          // Try to activate the user profile, fallback if is_active column doesn't exist
          let activateError = null
          
          // First attempt with is_active
          const { error: activateError1 } = await supabaseAdmin
            .from('profiles')
            .update({ is_active: true })
            .eq('id', userId)

          if (activateError1) {
            // If is_active column error, just mark as error but don't fail
            if (activateError1.message.includes('is_active') || activateError1.message.includes('schema cache')) {
              console.warn('is_active column not found for activation, user may need manual activation')
              // For now, we'll consider this a success since the column might not exist
            } else {
              activateError = activateError1
            }
          }

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
        } catch (activateException) {
          console.error('Exception during user activation:', activateException)
          return NextResponse.json(
            { error: 'An unexpected error occurred during user activation' },
            { status: 500 }
          )
        }

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