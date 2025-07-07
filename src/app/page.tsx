'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Stethoscope } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Add a small delay to prevent rapid redirects during hard refresh
    if (!loading) {
      const redirectTimer = setTimeout(() => {
        if (user) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      }, 100) // Small delay to allow proper auth state settling

      return () => clearTimeout(redirectTimer)
    }
  }, [user, loading, router])

  // Show loading spinner while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-4 rounded-full">
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Little Lungs ToDo
        </h1>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    </div>
  )
}
