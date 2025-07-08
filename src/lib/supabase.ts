import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Create a true singleton client
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null
let clientCreated = false

export const createClient = () => {
  // For build-time compatibility, provide default values if env vars are missing
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not set. This may cause authentication issues.')
    return createClientComponentClient()
  }
  
  // Return existing client if already created
  if (supabaseClient && clientCreated) {
    return supabaseClient
  }
  
  // Create client only once
  if (!clientCreated) {
    console.log('Supabase client created with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...')
    supabaseClient = createClientComponentClient()
    clientCreated = true
  }
  
  return supabaseClient!
}

export type SupabaseClient = ReturnType<typeof createClient> 