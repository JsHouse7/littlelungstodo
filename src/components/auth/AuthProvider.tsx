'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
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

// Create a single Supabase client instance outside the component
const supabaseClient = createClient()

// PWA Detection
const isPWA = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://') ||
           window.location.search.includes('utm_source=homescreen')
  }
  return false
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Use refs for cleanup and preventing race conditions
  const mountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initializingRef = useRef(false)
  const currentUserIdRef = useRef<string | null>(null)
  
  // Memoized functions to prevent re-creation
  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const safeSetState = useCallback((updater: () => void) => {
    if (mountedRef.current) {
      updater()
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log('AuthProvider: Fetching user profile for userId:', userId)
      
      // Add timeout to profile fetch
      const profilePromise = supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      )
      
      const { data: profileData, error: profileError } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any
      
      if (profileError) {
        console.error('Profile fetch error:', profileError)
        console.log('AuthProvider: Profile fetch failed, but continuing without profile')
        return null
      }
      
      console.log('AuthProvider: Profile fetched successfully:', profileData)
      return profileData
    } catch (profileErr) {
      console.error('Profile fetch exception:', profileErr)
      console.log('AuthProvider: Profile fetch failed with exception, continuing without profile')
      return null
    }
  }, [])

  const handleAuthState = useCallback(async (session: any, clearTimeout: boolean = true) => {
    if (!mountedRef.current) return
    
    if (clearTimeout) {
      clearExistingTimeout()
    }
    
    console.log('AuthProvider: Handling auth state, user:', session?.user ? 'present' : 'not present')
    
    if (session?.user) {
      console.log('AuthProvider: User authenticated, fetching profile...')
      
      // Check if this is the same user to avoid unnecessary profile refetch
      if (currentUserIdRef.current === session.user.id) {
        console.log('AuthProvider: Same user, updating session only')
        safeSetState(() => {
          setUser(session.user) // Update user object in case of token refresh
          setLoading(false)
        })
        return
      }
      
      try {
        const profileData = await fetchProfile(session.user.id)
        
        if (!mountedRef.current) return
        
        console.log('AuthProvider: Setting user and profile state, loading=false')
        currentUserIdRef.current = session.user.id
        safeSetState(() => {
          setUser(session.user)
          setProfile(profileData)
          setLoading(false)
        })
        
        // Store session info for PWA persistence
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('supabase.auth.token', JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
              user: session.user
            }))
          } catch (e) {
            console.warn('Failed to store auth token:', e)
          }
        }
      } catch (error) {
        console.error('AuthProvider: Error in handleAuthState:', error)
        // Still set loading to false even if profile fetch fails
        if (mountedRef.current) {
          currentUserIdRef.current = session.user.id
          safeSetState(() => {
            setUser(session.user)
            setProfile(null)
            setLoading(false)
          })
        }
      }
    } else {
      console.log('AuthProvider: No user session, setting loading=false')
      currentUserIdRef.current = null
      safeSetState(() => {
        setUser(null)
        setProfile(null)
        setLoading(false)
      })
      
      // Clear stored session for PWA
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('supabase.auth.token')
        } catch (e) {
          console.warn('Failed to clear auth token:', e)
        }
      }
    }
  }, [clearExistingTimeout, safeSetState, fetchProfile])

  const signOut = useCallback(async () => {
    // Clear local storage first for PWA
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('supabase.auth.token')
      } catch (e) {
        console.warn('Failed to clear stored auth token:', e)
      }
    }
    
    await supabaseClient.auth.signOut()
  }, [])

  useEffect(() => {
    // Prevent multiple initializations
    if (initializingRef.current) {
      return
    }
    
    initializingRef.current = true
    mountedRef.current = true
    
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured - setting auth loading to false')
      safeSetState(() => setLoading(false))
      return
    }

    // Initialize auth with PWA-awareness
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Starting session initialization...')
        
        // Check if running as PWA
        if (isPWA()) {
          console.log('AuthProvider: PWA mode detected, checking local storage...')
          
          // Try to restore session from localStorage for PWA
          try {
            const storedToken = localStorage.getItem('supabase.auth.token')
            if (storedToken) {
              const tokenData = JSON.parse(storedToken)
              console.log('AuthProvider: Found stored session, attempting restore...')
              
              // Set the session in Supabase
              const { data, error } = await supabaseClient.auth.setSession({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token
              })
              
              if (!error && data.session) {
                console.log('AuthProvider: Session restored successfully')
                await handleAuthState(data.session, true)
                console.log('AuthProvider: PWA initialization complete')
                return
              } else {
                console.log('AuthProvider: Stored session invalid, proceeding with normal flow')
                localStorage.removeItem('supabase.auth.token')
              }
            }
          } catch (e) {
            console.warn('AuthProvider: Failed to restore PWA session:', e)
          }
        }
        
        // Normal session check
        const { data: { session }, error } = await supabaseClient.auth.getSession()
        
        if (!mountedRef.current) return
        
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
        await handleAuthState(session, true)
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

    // Set timeout as fallback
    timeoutRef.current = setTimeout(() => {
      console.warn('Auth initialization timeout - setting loading to false')
      safeSetState(() => setLoading(false))
    }, 8000) // Increased timeout for PWA

    // Initialize
    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event: string, session: any) => {
      try {
        console.log('AuthProvider: Auth state changed:', event, 'session:', session?.user ? 'present' : 'null')
        if (!mountedRef.current) return
        
        await handleAuthState(session, false) // Don't clear timeout for auth state changes
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
      initializingRef.current = false
      currentUserIdRef.current = null
      clearExistingTimeout()
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array - only run once

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