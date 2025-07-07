'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronDown, User, Plus } from 'lucide-react'

interface Profile {
  id: string
  full_name: string | null
  email: string
  role: string
  department: string | null
}

interface UserSelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
}

export default function UserSelector({
  value,
  onChange,
  placeholder = "Select user...",
  label,
  required = false
}: UserSelectorProps) {
  const [users, setUsers] = useState<Profile[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Create supabase client once to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  const loadUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, department')
        .order('full_name')

      if (error) {
        console.error('Error loading users:', error)
      } else {
        setUsers(data || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleUserSelect = (user: Profile) => {
    const displayName = user.full_name || user.email
    onChange(displayName)
    setIsOpen(false)
    setShowManualEntry(false)
  }

  const handleManualEntry = () => {
    setShowManualEntry(true)
    setIsOpen(false)
  }

  const handleManualSubmit = () => {
    if (manualValue.trim()) {
      onChange(manualValue.trim())
      setManualValue('')
      setShowManualEntry(false)
    }
  }

  const selectedUser = users.find(u => 
    (u.full_name && u.full_name === value) || u.email === value
  )

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {showManualEntry ? (
        <div className="space-y-2">
          <input
            type="text"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="Enter name manually..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleManualSubmit}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualEntry(false)
                setManualValue('')
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between text-gray-900"
          >
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2 text-gray-400" />
              <span className={value ? 'text-gray-900' : 'text-gray-500'}>
                {value || placeholder}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {isOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {loading ? (
                <div className="px-3 py-2 text-gray-500 text-sm">Loading users...</div>
              ) : (
                <>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none text-gray-900"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {user.full_name || user.email}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {user.role} {user.department && `• ${user.department}`}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {/* Manual Entry Option */}
                  <button
                    type="button"
                    onClick={handleManualEntry}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-t border-gray-200 text-gray-700"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <Plus className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Enter manually</div>
                        <div className="text-xs text-gray-500">Add someone not in the list</div>
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 