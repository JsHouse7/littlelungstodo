import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Cache the client to prevent multiple instances
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null

export const createClient = () => {
  // For build-time compatibility, provide default values if env vars are missing
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not set. This may cause authentication issues.')
    return createClientComponentClient()
  }
  
  // Return cached client if it exists
  if (supabaseClient) {
    return supabaseClient
  }
  
  console.log('Supabase client created with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...')
  supabaseClient = createClientComponentClient()
  return supabaseClient
}

export type SupabaseClient = ReturnType<typeof createClient> 