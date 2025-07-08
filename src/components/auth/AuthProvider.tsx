'use client'

import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/database.types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Use refs to track cleanup and prevent race conditions
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  
  // Create supabase client once to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Reset mounted ref
    mountedRef.current = true
    
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured - setting auth loading to false')
      if (mountedRef.current) {
        setLoading(false)
      }
      return
    }

    // Function to safely update state only if component is mounted
    const safeSetState = (updater: () => void) => {
      if (mountedRef.current) {
        updater()
      }
    }

    // Fetch user profile
    const fetchProfile = async (userId: string): Promise<Profile | null> => {
      try {
        console.log('AuthProvider: Fetching user profile...')
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (profileError) {
          console.error('Profile fetch error:', profileError)
          return null
        }
        
        console.log('AuthProvider: Profile fetched successfully')
        return profileData
      } catch (profileErr) {
        console.error('Profile fetch exception:', profileErr)
        return null
      }
    }

    // Clear any existing timeout when we start initialization
    const clearExistingTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Starting session initialization...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mountedRef.current) return // Component unmounted
        
        // Clear timeout on successful response
        clearExistingTimeout()
        
        if (error) {
          console.error('Auth session error:', error)
          safeSetState(() => {
            setUser(null)
            setProfile(null)
            setLoading(false)
          })
          return
        }

        console.log('AuthProvider: Session retrieved, user:', session?.user ? 'authenticated' : 'not authenticated')
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          safeSetState(() => {
            setUser(session.user)
            setProfile(profileData)
            setLoading(false)
          })
        } else {
          safeSetState(() => {
            setUser(null)
            setProfile(null)
            setLoading(false)
          })
        }
        
        console.log('AuthProvider: Initialization complete')
      } catch (sessionErr) {
        console.error('Session fetch exception:', sessionErr)
        clearExistingTimeout()
        safeSetState(() => {
          setUser(null)
          setProfile(null)
          setLoading(false)
        })
      }
    }

    // Set timeout as fallback - only fires if initialization doesn't complete
    timeoutRef.current = setTimeout(() => {
      console.warn('Auth initialization timeout - setting loading to false')
      safeSetState(() => {
        setLoading(false)
      })
    }, 8000) // Reduced to 8 seconds

    // Initialize auth
    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      try {
        console.log('AuthProvider: Auth state changed:', event)
        
        if (!mountedRef.current) return // Component unmounted
        
        // Clear any pending timeout since auth state changed
        clearExistingTimeout()
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          safeSetState(() => {
            setUser(session.user)
            setProfile(profileData)
            setLoading(false)
          })
        } else {
          safeSetState(() => {
            setUser(null)
            setProfile(null)
            setLoading(false)
          })
        }
      } catch (authErr) {
        console.error('Auth state change error:', authErr)
        safeSetState(() => {
          setUser(null)
          setProfile(null)
          setLoading(false)
        })
      }
    })

    return () => {
      mountedRef.current = false
      clearExistingTimeout()
      subscription.unsubscribe()
    }
  }, [supabase]) // Removed initialized from dependency array

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 