'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
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
  
  // Create supabase client once to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured - setting auth loading to false')
      setLoading(false)
      return
    }

    // Get initial session with timeout and error handling
    const getSession = async () => {
      try {
        console.log('AuthProvider: Starting session initialization...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth session error:', error)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        console.log('AuthProvider: Session retrieved, user:', session?.user ? 'authenticated' : 'not authenticated')
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Fetch user profile with error handling
          try {
            console.log('AuthProvider: Fetching user profile...')
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (profileError) {
              console.error('Profile fetch error:', profileError)
            }
            
            console.log('AuthProvider: Profile fetched successfully')
            setProfile(profileData || null)
          } catch (profileErr) {
            console.error('Profile fetch exception:', profileErr)
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
        
        console.log('AuthProvider: Initialization complete')
      } catch (sessionErr) {
        console.error('Session fetch exception:', sessionErr)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth initialization timeout - setting loading to false')
      setLoading(false)
    }, 15000) // 15 second timeout for slower connections

    getSession().finally(() => {
      clearTimeout(timeoutId)
    })

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      try {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Fetch user profile with error handling
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (profileError) {
              console.error('Profile fetch error on auth change:', profileError)
            }
            
            setProfile(profileData || null)
          } catch (profileErr) {
            console.error('Profile fetch exception on auth change:', profileErr)
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
      } catch (authErr) {
        console.error('Auth state change error:', authErr)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase])

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