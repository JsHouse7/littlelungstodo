import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Helper function to create audit log entries
async function createAuditLog(
  supabase: any,
  performed_by: string,
  action: string,
  target_user_id: string | null,
  target_user_email: string | null,
  details: any = null,
  request: Request
) {
  try {
    const ip_address = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown'

    const user_agent = request.headers.get('user-agent') || 'unknown'

    await supabase
      .from('user_audit_log')
      .insert([{
        performed_by,
        action,
        target_user_id,
        target_user_email,
        details,
        ip_address,
        user_agent
      }])
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't fail the main operation if audit logging fails
  }
}

// Consolidated user management API
export async function POST(request: Request) {
  try {
    const { action, userId, email, full_name, role, department, phone, password } = await request.json()

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
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

    // Get the correct redirect URL based on environment (used in multiple places)
    const isProduction = process.env.NODE_ENV === 'production'
    const redirectTo = isProduction
      ? process.env.NEXT_PUBLIC_SITE_URL || 'https://littlelungstodo.vercel.app'
      : 'http://localhost:3000'

    switch (action) {
      case 'invite_user':
        // Validate invitation fields
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required for invitations' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'doctor', 'staff']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, doctor, or staff' },
        { status: 400 }
      )
    }

    // If password is provided, validate it
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        )
      }
    }

    // Check if user already exists (only when not providing password - for invitation flow)
    if (!password) {
      console.log('Checking for existing user (invitation mode)...')
      try {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const userExists = existingUsers?.users?.some(user => user.email === email)

        if (userExists) {
          return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 409 }
          )
        }
      } catch (listError) {
        console.warn('Could not check existing users, proceeding with invitation:', listError)
      }
    }

    console.log('Proceeding with user creation for email:', email, password ? '(with password)' : '(invitation mode)')

    let userResult

    if (password) {
      // Create user directly with password
      console.log('Creating user with password...')
      try {
        const createResult = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm since admin is creating
          user_metadata: {
            full_name: full_name?.trim(),
            role,
            department: department?.trim(),
            phone: phone?.trim()
          }
        })

        if (createResult.error) {
          console.error('User creation error:', createResult.error)
          return NextResponse.json(
            { error: `Failed to create user: ${createResult.error.message}` },
            { status: 500 }
          )
        }

        userResult = createResult.data
        console.log('User created successfully with password')
      } catch (createError) {
        console.error('Exception during user creation:', createError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }
    } else {
      // Generate invitation link
      console.log('Generating invitation link...')
      let inviteData, inviteError
      try {
        const result = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: email,
          options: {
            redirectTo: `${redirectTo}/login`,
            data: {
              full_name: full_name?.trim(),
              role,
              department: department?.trim(),
              phone: phone?.trim()
            }
          }
        })
        inviteData = result.data
        inviteError = result.error
      } catch (genError) {
        console.error('Exception during invitation generation:', genError)
        return NextResponse.json(
          { error: 'Failed to generate invitation link' },
          { status: 500 }
        )
      }

      if (inviteError) {
        console.error('Invitation generation error:', inviteError)
        return NextResponse.json(
          { error: `Failed to send invitation: ${inviteError.message}` },
          { status: 500 }
        )
      }

      userResult = inviteData
    }

    // Handle profile/invitation record creation
    if (password) {
      // For password-based creation, create the profile immediately
      console.log('Creating profile record for password-based user...')
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: userResult.user?.id,
            email,
            full_name: full_name?.trim() || null,
            role,
            department: department?.trim() || null,
            phone: phone?.trim() || null,
            is_active: true
          }])

        if (profileError) {
          console.warn('Failed to create profile record:', profileError)
          // Don't fail user creation if profile creation fails
        } else {
          console.log('Profile record created successfully')
        }
      } catch (profileDbError) {
        console.warn('Database error creating profile record:', profileDbError)
      }
    } else {
      // For invitation-based creation, create invitation record
      console.log('Creating invitation record...')
      try {
        const { error: invitationRecordError } = await supabase
          .from('user_invitations')
          .insert([{
            email,
            invited_by: session.user.id,
            role,
            department: department?.trim() || null,
            phone: phone?.trim() || null,
            full_name: full_name?.trim() || null,
            invited_at: new Date().toISOString(),
            status: 'pending'
          }])

        if (invitationRecordError) {
          console.warn('Failed to create invitation record (continuing anyway):', invitationRecordError)
          // Don't fail the invitation if we can't create the record
        } else {
          console.log('Invitation record created successfully')
        }
      } catch (dbError) {
        console.warn('Database error creating invitation record (continuing anyway):', dbError)
        // Continue with invitation even if DB record creation fails
      }
    }

        // Log the invitation
        try {
          await createAuditLog(supabase, session.user.id, 'invite_user', null, email, {
            role,
            department,
            phone,
            full_name
          }, request)
        } catch (auditError) {
          console.warn('Failed to create audit log:', auditError)
          // Don't fail invitation if audit logging fails
        }

        return NextResponse.json({
          success: true,
          message: password
            ? 'User created successfully with the provided password. They can now log in immediately.'
            : 'Invitation sent successfully. The user will receive an email with instructions to set up their account.',
          user: password ? {
            id: userResult.user?.id,
            email,
            role,
            created_at: userResult.user?.created_at
          } : {
            email,
            role,
            invited_at: new Date().toISOString()
          }
        })

      case 'update_user':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required for user updates' },
            { status: 400 }
          )
        }

        if (!full_name && !role && !department && phone === undefined) {
          return NextResponse.json(
            { error: 'At least one field must be provided for update' },
            { status: 400 }
          )
        }

        const updateData: any = {}
        if (full_name !== undefined) updateData.full_name = full_name?.trim() || null
        if (role !== undefined) {
          if (!['admin', 'doctor', 'staff'].includes(role)) {
            return NextResponse.json(
              { error: 'Invalid role' },
              { status: 400 }
            )
          }
          updateData.role = role
        }
        if (department !== undefined) updateData.department = department?.trim() || null
        if (phone !== undefined) updateData.phone = phone?.trim() || null

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)

        if (updateError) {
          console.error('User update error:', updateError)
          return NextResponse.json(
            { error: `Failed to update user: ${updateError.message}` },
            { status: 500 }
          )
        }

        // Log the update
        await createAuditLog(supabase, session.user.id, 'update_user', userId, null, updateData, request)

        return NextResponse.json({
          success: true,
          message: 'User updated successfully'
        })

      case 'set_password':
        if (!userId || !password) {
          return NextResponse.json(
            { error: 'userId and password are required' },
            { status: 400 }
          )
        }

        // Validate password
        if (password.length < 6) {
          return NextResponse.json(
            { error: 'Password must be at least 6 characters long' },
            { status: 400 }
          )
        }

        // First, check if the user exists in auth system
        console.log('Checking if user exists in auth system:', userId)
        try {
          const { data: userData, error: userCheckError } = await supabaseAdmin.auth.admin.getUserById(userId)

          if (userCheckError || !userData.user) {
            console.error('User not found in auth system:', userCheckError)
            return NextResponse.json(
              { error: 'User not found in authentication system' },
              { status: 404 }
            )
          }

          console.log('User found in auth system:', userData.user.email)
        } catch (checkError) {
          console.error('Error checking user existence:', checkError)
          return NextResponse.json(
            { error: 'Failed to verify user exists' },
            { status: 500 }
          )
        }

        // Update user's password directly
        console.log('Attempting to update password for userId:', userId)
        const { data: updateResult, error: passwordError } = await supabaseAdmin.auth.admin.updateUser({
          id: userId,
          password: password
        })

        console.log('Password update result:', { data: updateResult, error: passwordError })

        if (passwordError) {
          console.error('Password update error:', passwordError)
          return NextResponse.json(
            { error: `Failed to update password: ${passwordError.message}` },
            { status: 500 }
          )
        }

        // Log the password change
        await createAuditLog(supabase, session.user.id, 'set_password', userId, null, null, request)

        return NextResponse.json({
          success: true,
          message: 'Password updated successfully'
        })

      case 'reset_password':
        if (!email) {
          return NextResponse.json(
            { error: 'Email is required for password reset' },
            { status: 400 }
          )
        }

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

        // Log the password reset
        await createAuditLog(supabase, session.user.id, 'reset_password', null, email, null, request)

        return NextResponse.json({
          success: true,
          message: 'Password reset email sent successfully'
        })

      case 'deactivate_user':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          )
        }

        // Prevent admin from deactivating themselves
        if (userId === session.user.id) {
          return NextResponse.json(
            { error: 'Cannot deactivate your own account' },
            { status: 403 }
          )
        }

        const { error: deactivateError } = await supabase
          .from('profiles')
          .update({ is_active: false })
          .eq('id', userId)

        if (deactivateError) {
          console.error('User deactivation error:', deactivateError)
          return NextResponse.json(
            { error: `Failed to deactivate user: ${deactivateError.message}` },
            { status: 500 }
          )
        }

        // Log the deactivation
        await createAuditLog(supabase, session.user.id, 'deactivate_user', userId, null, null, request)

        return NextResponse.json({
          success: true,
          message: 'User deactivated successfully'
        })

      case 'activate_user':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          )
        }

        const { error: activateError } = await supabase
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

        // Log the activation
        await createAuditLog(supabase, session.user.id, 'activate_user', userId, null, null, request)

        return NextResponse.json({
          success: true,
          message: 'User activated successfully'
        })

      case 'delete_user':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          )
        }

        // Prevent admin from deleting themselves
        if (userId === session.user.id) {
          return NextResponse.json(
            { error: 'Cannot delete your own account' },
            { status: 403 }
          )
        }

        console.log('Starting user deletion process for userId:', userId)

        try {
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

          // Log the deletion
          await createAuditLog(supabase, session.user.id, 'delete_user', userId, null, null, request)

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