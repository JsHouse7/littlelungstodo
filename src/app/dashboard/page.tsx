'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { useState, useEffect, useCallback, useMemo } from 'react'
import CreateSheetModal from '@/components/sheets/CreateSheetModal'
import Sidebar from '@/components/layout/Sidebar'
import { 
  Calendar, 
  ClipboardList, 
  Menu,
  X,
  FileText,
  Clock,
  CheckSquare,
  Plus,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Define types locally since we're not importing the database types
type SheetType = 'monthly' | 'ongoing_admin' | 'personal_todo'

interface Sheet {
  id: string
  name: string
  type: SheetType
  month_year: string | null
  owner_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Mobile Header Component
function MobileHeader({ profile, onSignOut }: { profile: any, onSignOut: () => void }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()

  return (
    <div className="lg:hidden bg-white border-b border-gray-200">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* App Logo/Title */}
          <div className="flex items-center">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-gray-900">Little Lungs</h1>
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)}
                />
                
                {/* Menu */}
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile.full_name || profile.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize truncate">
                      {profile.role} {profile.department && `• ${profile.department}`}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/settings')
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3 text-gray-400" />
                      Settings & Profile
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        onSignOut()
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3 text-red-400" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Bottom Navigation with More Button
function BottomNav({ 
  activeTab, 
  onTabChange, 
  navigation, 
  profile, 
  onSignOut 
}: { 
  activeTab: SheetType
  onTabChange: (tab: SheetType) => void
  navigation: any[]
  profile: any
  onSignOut: () => void
}) {
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const router = useRouter()

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-around items-center h-16 lg:hidden">
        {/* Main navigation items (first 3) */}
        {navigation.slice(0, 3).map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.key
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-blue-700'}`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="text-xs font-medium">{item.name.split(' ')[0]}</span>
            </button>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`flex flex-col items-center justify-center flex-1 h-full focus:outline-none ${showMoreMenu ? 'text-blue-600' : 'text-gray-500 hover:text-blue-700'}`}
        >
          <Menu className={`w-6 h-6 mb-1 ${showMoreMenu ? 'text-blue-600' : 'text-gray-400'}`} />
          <span className="text-xs font-medium">More</span>
        </button>
      </nav>

      {/* More Menu Overlay */}
      {showMoreMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden" 
            onClick={() => setShowMoreMenu(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed bottom-16 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 lg:hidden">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {profile.full_name || profile.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize truncate">
                    {profile.role} {profile.department && `• ${profile.department}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  setShowMoreMenu(false)
                  router.push('/settings')
                }}
                className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-5 h-5 mr-3 text-gray-400" />
                <div className="text-left">
                  <div className="font-medium">Settings & Profile</div>
                  <div className="text-xs text-gray-500">
                    {profile.role === 'admin' ? 'Manage profile and users' : 'Manage your profile'}
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false)
                  onSignOut()
                }}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3 text-red-400" />
                <div className="text-left">
                  <div className="font-medium">Sign Out</div>
                  <div className="text-xs text-red-500">End your session</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function DashboardContent() {
  const { user, profile, loading, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SheetType>('monthly')
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loadingSheets, setLoadingSheets] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Create supabase client once to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  // Set initial tab based on URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as SheetType
    if (tabParam && ['monthly', 'ongoing_admin', 'personal_todo'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const loadSheets = useCallback(async () => {
    setLoadingSheets(true)
    try {
      const { data, error } = await supabase
        .from('sheets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading sheets:', error)
      } else {
        setSheets(data || [])
      }
    } catch (error) {
      console.error('Error loading sheets:', error)
    } finally {
      setLoadingSheets(false)
    }
  }, [supabase])

  // Load sheets when user changes
  useEffect(() => {
    if (user) {
      loadSheets()
    }
  }, [user, loadSheets])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const navigation = [
    { 
      name: 'Monthly Tasks', 
      key: 'monthly' as SheetType, 
      icon: Calendar, 
      description: 'Patient tasks organized by month',
      count: sheets.filter(s => s.type === 'monthly').length
    },
    { 
      name: 'Practice Admin', 
      key: 'ongoing_admin' as SheetType, 
      icon: ClipboardList, 
      description: 'Ongoing administrative tasks',
      count: sheets.filter(s => s.type === 'ongoing_admin').length
    },
    { 
      name: 'Personal ToDos', 
      key: 'personal_todo' as SheetType, 
      icon: CheckSquare, 
      description: 'Your personal task list',
      count: sheets.filter(s => s.type === 'personal_todo' && s.owner_id === user.id).length
    },
  ]

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Mobile sidebar removed, only desktop sidebar remains */}
      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300`}>
        <Sidebar 
          profile={profile}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0"> {/* Add pb-16 for mobile bottom nav space */}
        {/* Mobile Header */}
        <MobileHeader profile={profile} onSignOut={handleSignOut} />
        
        {/* Content area */}
        <main className={`flex-1 overflow-y-auto p-4 lg:p-8 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          <div className="max-w-7xl mx-auto">
            <MainContent 
              activeTab={activeTab} 
              sheets={sheets.filter(s => s.type === activeTab)}
              loading={loadingSheets}
              onRefresh={loadSheets}
              onCreateSheet={() => setShowCreateModal(true)}
              userRole={profile?.role}
              router={router}
            />
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          navigation={navigation}
          profile={profile}
          onSignOut={handleSignOut}
        />
      </div>
      
      {/* Create Sheet Modal */}
      <CreateSheetModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        sheetType={activeTab}
        userId={user.id}
        onSuccess={() => {
          loadSheets()
          setShowCreateModal(false)
        }}
      />
    </div>
  )
}



function MainContent({ 
  activeTab, 
  sheets, 
  loading, 
  onRefresh,
  onCreateSheet,
  userRole,
  router
}: {
  activeTab: SheetType
  sheets: Sheet[]
  loading: boolean
  onRefresh: () => void
  onCreateSheet: () => void
  userRole?: string
  router: ReturnType<typeof useRouter>
}) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading sheets...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">
              {activeTab === 'monthly' && 'Monthly Tasks'}
              {activeTab === 'ongoing_admin' && 'Practice Administration'}
              {activeTab === 'personal_todo' && 'Personal ToDos'}
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              {activeTab === 'monthly' && 'Manage patient tasks organized by month'}
              {activeTab === 'ongoing_admin' && 'Handle ongoing administrative tasks'}
              {activeTab === 'personal_todo' && 'Track your personal tasks and notes'}
            </p>
          </div>
          
          {/* Create New Sheet Button */}
          {((activeTab === 'personal_todo') || (userRole === 'admin')) && (
            <button
              onClick={onCreateSheet}
              className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 lg:px-4 lg:py-2 rounded-lg font-medium transition-colors flex items-center justify-center lg:justify-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New {' '}
              {activeTab === 'monthly' && 'Monthly Sheet'}
              {activeTab === 'ongoing_admin' && 'Admin Sheet'}
              {activeTab === 'personal_todo' && 'Todo List'}
            </button>
          )}
        </div>
      </div>

      {sheets.length === 0 ? (
        <div className="text-center py-8 lg:py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sheets found</h3>
          <p className="text-gray-600 mb-6 px-4">
            {activeTab === 'personal_todo' 
              ? "You don't have any personal todo lists yet."
              : "No sheets available for this category."
            }
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3 px-4">
            {((activeTab === 'personal_todo') || (userRole === 'admin')) && (
              <button 
                onClick={onCreateSheet}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First {' '}
                {activeTab === 'monthly' && 'Monthly Sheet'}
                {activeTab === 'ongoing_admin' && 'Admin Sheet'}
                {activeTab === 'personal_todo' && 'Todo List'}
              </button>
            )}
            <button 
              onClick={onRefresh}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h3 className="text-base lg:text-lg font-medium text-gray-900 truncate flex-1 mr-2">{sheet.name}</h3>
                <span className="text-xs lg:text-sm text-gray-500 flex-shrink-0">
                  {sheet.month_year && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap">
                      {sheet.month_year}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center text-xs lg:text-sm text-gray-500 mb-4">
                <Clock className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                Created {new Date(sheet.created_at).toLocaleDateString()}
              </div>
              <button 
                onClick={() => router.push(`/sheet/${sheet.id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Open Sheet
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}