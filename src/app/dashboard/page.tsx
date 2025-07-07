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
  Plus
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
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <Sidebar 
            profile={profile}
            collapsed={false}
            onToggleCollapse={() => {}}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>

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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {navigation.find(n => n.key === activeTab)?.name}
          </h1>
          <div className="w-6 h-6" /> {/* Spacer */}
        </div>

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
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {activeTab === 'monthly' && 'Monthly Tasks'}
              {activeTab === 'ongoing_admin' && 'Practice Administration'}
              {activeTab === 'personal_todo' && 'Personal ToDos'}
            </h1>
            <p className="text-gray-600">
              {activeTab === 'monthly' && 'Manage patient tasks organized by month'}
              {activeTab === 'ongoing_admin' && 'Handle ongoing administrative tasks'}
              {activeTab === 'personal_todo' && 'Track your personal tasks and notes'}
            </p>
          </div>
          
          {/* Create New Sheet Button */}
          {((activeTab === 'personal_todo') || (userRole === 'admin')) && (
            <button
              onClick={onCreateSheet}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
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
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sheets found</h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'personal_todo' 
              ? "You don't have any personal todo lists yet."
              : "No sheets available for this category."
            }
          </p>
          <div className="flex justify-center space-x-3">
            {((activeTab === 'personal_todo') || (userRole === 'admin')) && (
              <button 
                onClick={onCreateSheet}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
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
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{sheet.name}</h3>
                <span className="text-sm text-gray-500">
                  {sheet.month_year && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {sheet.month_year}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <Clock className="w-4 h-4 mr-1" />
                Created {new Date(sheet.created_at).toLocaleDateString()}
              </div>
              <button 
                onClick={() => router.push(`/sheet/${sheet.id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
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