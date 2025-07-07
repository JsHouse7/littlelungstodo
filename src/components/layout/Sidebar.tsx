'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { 
  Calendar, 
  ClipboardList, 
  User, 
  Settings, 
  LogOut,
  Stethoscope,
  FileText,
  Clock,
  CheckSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

type SheetType = 'monthly' | 'ongoing_admin' | 'personal_todo'

interface Profile {
  full_name?: string | null
  email: string
  role: string
  department?: string | null
}

interface SidebarProps {
  profile: Profile
  collapsed: boolean
  onToggleCollapse: () => void
  activeTab?: SheetType
  onTabChange?: (tab: SheetType) => void
}

export default function Sidebar({
  profile,
  collapsed,
  onToggleCollapse,
  activeTab,
  onTabChange
}: SidebarProps) {
  const router = useRouter()
  const [sheetCounts, setSheetCounts] = useState<Record<SheetType, number>>({
    monthly: 0,
    ongoing_admin: 0,
    personal_todo: 0
  })
  const supabase = createClient()

  useEffect(() => {
    loadSheetCounts()
  }, [])

  const loadSheetCounts = async () => {
    try {
      const { data: sheets, error } = await supabase
        .from('sheets')
        .select('type, id')
        .eq('is_active', true)

      if (!error && sheets) {
        const counts = sheets.reduce((acc, sheet) => {
          acc[sheet.type as SheetType] = (acc[sheet.type as SheetType] || 0) + 1
          return acc
        }, {} as Record<SheetType, number>)

        setSheetCounts({
          monthly: counts.monthly || 0,
          ongoing_admin: counts.ongoing_admin || 0,
          personal_todo: counts.personal_todo || 0
        })
      }
    } catch (error) {
      console.error('Error loading sheet counts:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navigation = [
    {
      name: 'Monthly Tasks',
      key: 'monthly' as SheetType,
      icon: Calendar,
      description: 'Patient tasks organized by month',
      count: sheetCounts.monthly
    },
    {
      name: 'Practice Admin',
      key: 'ongoing_admin' as SheetType,
      icon: ClipboardList,
      description: 'Ongoing administrative tasks',
      count: sheetCounts.ongoing_admin
    },
    {
      name: 'Personal ToDos',
      key: 'personal_todo' as SheetType,
      icon: CheckSquare,
      description: 'Your personal task list',
      count: sheetCounts.personal_todo
    }
  ]

  const handleNavClick = (key: SheetType) => {
    if (onTabChange) {
      onTabChange(key)
    } else {
      // Navigate to dashboard with the selected tab
      router.push(`/dashboard?tab=${key}`)
    }
  }

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64 lg:w-64'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center px-4 lg:px-6 py-4 lg:py-6 border-b border-gray-200">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Stethoscope className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="ml-3">
            <h1 className="text-lg lg:text-xl font-bold text-gray-900">Little Lungs</h1>
            <p className="text-xs lg:text-sm text-gray-500">Task Manager</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-4 py-4 lg:py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.key
          
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`w-full group flex items-center px-3 py-4 lg:py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`${collapsed ? 'mr-0' : 'mr-3'} h-5 w-5 ${
                isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
              }`} />
              {!collapsed && (
                <>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.name}</div>
                    <div className={`text-xs ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isActive 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {item.count}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-gray-200 px-3 lg:px-4 py-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
          </div>
          {!collapsed && (
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-gray-500 capitalize truncate">
                {profile.role} {profile.department && `• ${profile.department}`}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3 flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-2">
            <button 
              onClick={() => router.push('/settings')}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center"
            >
              <Settings className="w-4 h-4 inline mr-1" />
              Settings
            </button>
            <button 
              onClick={handleSignOut}
              className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center"
            >
              <LogOut className="w-4 h-4 inline mr-1" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Collapse toggle - only show on desktop */}
      <div className="hidden lg:block border-t border-gray-200 p-2">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
} 