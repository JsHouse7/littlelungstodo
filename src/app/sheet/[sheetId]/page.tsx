'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { 
  Calendar, 
  ClipboardList, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  Filter, 
  Search, 
  Settings, 
  ArrowLeft, 
  CheckSquare,
  User,
  LogOut,
  ChevronDown,
  Menu
} from 'lucide-react'
import UserSelector from '@/components/ui/UserSelector'
import DateInput from '@/components/ui/DateInput'
import EditSheetModal from '@/components/sheets/EditSheetModal'
import Sidebar from '@/components/layout/Sidebar'
import MobileLayout from '@/components/layout/MobileLayout';
import MobileHeader from '@/components/layout/MobileHeader';
import BottomNav from '@/components/layout/BottomNav';

// Local types
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

interface Task {
  id: string
  sheet_id: string
  data: Record<string, any>
  created_by: string
  assigned_to: string | null
  is_completed: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

interface ColumnDefinition {
  id: string
  sheet_type: SheetType
  column_key: string
  column_label: string
  column_type: 'text' | 'date' | 'number' | 'boolean' | 'select'
  column_order: number
  is_required: boolean
  is_visible: boolean
  select_options: any
  created_at: string
}

export default function SheetPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile, loading, signOut } = useAuth()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [columns, setColumns] = useState<ColumnDefinition[]>([])
  const [loadingSheet, setLoadingSheet] = useState(true)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskData, setNewTaskData] = useState<Record<string, any>>({})
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTaskData, setEditTaskData] = useState<Record<string, any>>({})
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  
  // Create supabase client once to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])
  
  // Add timeout failsafe for loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('Sheet page: Loading timeout reached, forcing load')
      setLoadingTimeout(true)
    }, 10000) // 10 second timeout
    
    return () => clearTimeout(timeout)
  }, [])
  const sheetId = params.sheetId as string

  // Add navigation array for bottom nav
  const navigation = [
    {
      name: 'Monthly Tasks',
      key: 'monthly' as SheetType,
      icon: Calendar,
      description: 'Patient tasks organized by month',
    },
    {
      name: 'Practice Admin',
      key: 'ongoing_admin' as SheetType,
      icon: ClipboardList,
      description: 'Ongoing administrative tasks',
    },
    {
      name: 'Personal ToDos',
      key: 'personal_todo' as SheetType,
      icon: CheckSquare,
      description: 'Your personal task list',
    },
  ]

  const loadSheetData = useCallback(async () => {
    setLoadingSheet(true)
    try {
      // Load sheet
      const { data: sheetData, error: sheetError } = await supabase
        .from('sheets')
        .select('*')
        .eq('id', sheetId)
        .single()

      if (sheetError) {
        console.error('Error loading sheet:', sheetError)
        return
      }

      setSheet(sheetData)

      // Load column definitions
      const { data: columnsData, error: columnsError } = await supabase
        .from('column_definitions')
        .select('*')
        .eq('sheet_type', sheetData.type)
        .eq('is_visible', true)
        .order('column_order')

      if (columnsError) {
        console.error('Error loading columns:', columnsError)
      } else {
        setColumns(columnsData || [])
      }

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('created_at', { ascending: false })

      if (tasksError) {
        console.error('Error loading tasks:', tasksError)
      } else {
        setTasks(tasksData || [])
      }

    } catch (error) {
      console.error('Error loading sheet data:', error)
    } finally {
      setLoadingSheet(false)
    }
  }, [supabase, sheetId])

  // Load sheet data when user or sheetId changes
  useEffect(() => {
    if (user && sheetId) {
      loadSheetData()
    }
  }, [user, sheetId, loadSheetData])

  const handleAddTask = async () => {
    if (!user || !sheet) return

    try {
      const { error } = await supabase
        .from('tasks')
        .insert([{
          sheet_id: sheetId,
          data: newTaskData,
          created_by: user.id,
          is_completed: false
        }])

      if (error) {
        console.error('Error adding task:', error)
      } else {
        setNewTaskData({})
        setShowAddTask(false)
        loadSheetData() // Reload tasks
      }
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const toggleTaskComplete = async (taskId: string, isCompleted: boolean) => {
    console.log('Toggle task complete clicked:', taskId, 'current status:', isCompleted)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_completed: !isCompleted,
          completed_at: !isCompleted ? new Date().toISOString() : null
        })
        .eq('id', taskId)

      if (error) {
        console.error('Error updating task:', error)
      } else {
        loadSheetData() // Reload tasks
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleEditTask = (task: Task) => {
    console.log('Edit task clicked:', task.id, task)
    setEditingTask(task)
    setEditTaskData(task.data)
  }

  const handleUpdateTask = async () => {
    if (!editingTask) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          data: editTaskData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTask.id)

      if (error) {
        console.error('Error updating task:', error)
      } else {
        setEditingTask(null)
        setEditTaskData({})
        loadSheetData() // Reload tasks
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    console.log('Delete task clicked:', taskId)
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        console.error('Error deleting task:', error)
      } else {
        loadSheetData() // Reload tasks
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }



  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Text filter
      if (filterText) {
        const searchableText = Object.values(task.data).join(' ').toLowerCase()
        if (!searchableText.includes(filterText.toLowerCase())) {
          return false
        }
      }
      
      // User filter
      if (filterUser) {
        const userText = Object.values(task.data).join(' ').toLowerCase()
        if (!userText.includes(filterUser.toLowerCase())) {
          return false
        }
      }
      
      // Status filter
      if (filterStatus === 'completed' && !task.is_completed) return false
      if (filterStatus === 'pending' && task.is_completed) return false
      
      return true
    })
  }, [tasks, filterText, filterUser, filterStatus])

  if ((loading || loadingSheet) && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sheet...</p>
          {(loading || loadingSheet) && (
            <p className="mt-2 text-sm text-gray-500">
              If this takes too long, try refreshing the page
            </p>
          )}
        </div>
      </div>
    )
  }

  // Handle case where loading times out but we don't have user data
  if (loadingTimeout && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Issue</h1>
          <p className="text-gray-600 mb-4">The page is taking longer than expected to load. Please try refreshing or logging in again.</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={() => router.push('/login')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !sheet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sheet Not Found</h1>
          <p className="text-gray-600 mb-4">The sheet you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300`}>
        <Sidebar 
          profile={profile!}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={sheet?.type || 'monthly'}
          onTabChange={(tab) => router.push(`/dashboard?tab=${tab}`)}
        />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">
        {/* Mobile Header */}
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
                          {profile?.full_name || profile?.email}
                        </p>
                        <p className="text-xs text-gray-500 capitalize truncate">
                          {profile?.role} {profile?.department && `• ${profile.department}`}
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
                            handleSignOut()
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
        
        {/* Content area */}
        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'}`}>
          {/* Main Content (header, filters, add/edit forms, task list, etc.) */}
          <div className="bg-white border-b border-gray-200 w-full">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-y-2">
            <div className="flex items-center w-full sm:w-auto">
              <button
                onClick={() => router.push('/dashboard')}
                className="lg:hidden mr-3 p-2 -m-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{sheet.name}</h1>
                <p className="text-sm text-gray-500">
                  {sheet.type === 'monthly' && `${sheet.month_year} • Monthly Tasks`}
                  {sheet.type === 'ongoing_admin' && 'Practice Administration'}
                  {sheet.type === 'personal_todo' && 'Personal Todo List'}
                </p>
              </div>
            </div>
            <div className="flex flex-row flex-wrap gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center text-sm w-full sm:w-auto ${
                  showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="sm:inline">Filters</span>
              </button>
              {(profile?.role === 'admin') && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors flex items-center text-sm w-full sm:w-auto"
                >
                  <Settings className="w-4 h-4 mr-1 lg:mr-2" />
                  <span className="sm:inline">Edit</span>
                </button>
              )}
              <button
                onClick={() => setShowAddTask(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center text-sm w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="sm:inline">Add Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full">
          <div className="px-2 sm:px-4 lg:px-8 py-4 sm:py-6 flex flex-col gap-y-4 w-full max-w-full">
            {/* Filters */}
            {showFilters && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 mb-4 w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Text
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder="Search in all fields..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by User
                    </label>
                    <input
                      type="text"
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      placeholder="Enter user name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'pending')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      <option value="all">All Tasks</option>
                      <option value="pending">Pending Tasks</option>
                      <option value="completed">Completed Tasks</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      setFilterText('')
                      setFilterUser('')
                      setFilterStatus('all')
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            {/* Add Task Form */}
            <div className={`transition-all duration-300 ease-in-out ${
              showAddTask ? 'opacity-100 mb-4' : 'max-h-0 opacity-0 overflow-hidden'
            } w-full relative z-30`}> {/* Ensure full width on mobile */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-lg w-full relative">
                <div className="p-4 lg:p-6 w-full relative z-10">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Task</h3>
                  <div className="grid grid-cols-1 gap-4 w-full"> {/* Always single column on mobile */}
                    {columns.map((column) => {
                      // Special handling for specific fields
                      const isUserField = 
                        column.column_key === 'to_be_actioned_by' || 
                        column.column_key === 'message_taken_by' || 
                        column.column_key === 'assigned_to' ||
                        column.column_key === 'message_take_by' ||
                        column.column_key.includes('actioned_by') ||
                        column.column_key.includes('taken_by') ||
                        column.column_key.includes('assigned_to') ||
                        column.column_label.toLowerCase().includes('actioned by') ||
                        column.column_label.toLowerCase().includes('taken by') ||
                        column.column_label.toLowerCase().includes('assigned to')
                      const isDateField = column.column_type === 'date'
                      const isQueryField = column.column_key === 'query'
                      
                      return (
                        <div key={column.id} className={isQueryField ? 'lg:col-span-2 xl:col-span-3' : ''}>
                          {column.column_type === 'boolean' ? (
                            <div>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={newTaskData[column.column_key] || false}
                                  onChange={(e) => setNewTaskData(prev => ({
                                    ...prev,
                                    [column.column_key]: e.target.checked
                                  }))}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2 relative z-10 cursor-pointer"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                  {column.column_label}
                                  {column.is_required && <span className="text-red-500 ml-1">*</span>}
                                </span>
                              </label>
                            </div>
                          ) : isUserField ? (
                            <UserSelector
                              value={newTaskData[column.column_key] || ''}
                              onChange={(value) => setNewTaskData(prev => ({
                                ...prev,
                                [column.column_key]: value
                              }))}
                              label={column.column_label}
                              required={column.is_required}
                              placeholder={`Select ${column.column_label.toLowerCase()}...`}
                            />
                          ) : isDateField ? (
                            <DateInput
                              value={newTaskData[column.column_key] || ''}
                              onChange={(value) => setNewTaskData(prev => ({
                                ...prev,
                                [column.column_key]: value
                              }))}
                              label={column.column_label}
                              required={column.is_required}
                            />
                          ) : isQueryField ? (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {column.column_label}
                                {column.is_required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <textarea
                                value={newTaskData[column.column_key] || ''}
                                onChange={(e) => setNewTaskData(prev => ({
                                  ...prev,
                                  [column.column_key]: e.target.value
                                }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 relative z-10"
                                placeholder="Enter your query or message..."
                                required={column.is_required}
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {column.column_label}
                                {column.is_required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <input
                                type={column.column_type === 'number' ? 'number' : 'text'}
                                value={newTaskData[column.column_key] || ''}
                                onChange={(e) => setNewTaskData(prev => ({
                                  ...prev,
                                  [column.column_key]: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 relative z-10"
                                required={column.is_required}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowAddTask(false)
                        setNewTaskData({})
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTask}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Add Task
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Task Form */}
            <div className={`transition-all duration-300 ease-in-out ${
              editingTask ? 'opacity-100 mb-4' : 'max-h-0 opacity-0 overflow-hidden'
            } w-full relative z-30`}> {/* Ensure full width on mobile */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-lg w-full relative">
                <div className="p-4 lg:p-6 w-full relative z-10">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Task</h3>
                  <div className="grid grid-cols-1 gap-4 w-full"> {/* Always single column on mobile */}
                    {columns.map((column) => {
                      // Special handling for specific fields
                      const isUserField = 
                        column.column_key === 'to_be_actioned_by' || 
                        column.column_key === 'message_taken_by' || 
                        column.column_key === 'assigned_to' ||
                        column.column_key === 'message_take_by' ||
                        column.column_key.includes('actioned_by') ||
                        column.column_key.includes('taken_by') ||
                        column.column_key.includes('assigned_to') ||
                        column.column_label.toLowerCase().includes('actioned by') ||
                        column.column_label.toLowerCase().includes('taken by') ||
                        column.column_label.toLowerCase().includes('assigned to')
                      const isDateField = column.column_type === 'date'
                      const isQueryField = column.column_key === 'query'
                      
                      return (
                        <div key={column.id} className={isQueryField ? 'lg:col-span-2 xl:col-span-3' : ''}>
                          {column.column_type === 'boolean' ? (
                            <div>
                              <label className="flex items-center">
                                                              <input
                                type="checkbox"
                                checked={editTaskData[column.column_key] || false}
                                onChange={(e) => setEditTaskData(prev => ({
                                  ...prev,
                                  [column.column_key]: e.target.checked
                                }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2 relative z-10 cursor-pointer"
                              />
                                <span className="text-sm font-medium text-gray-700">
                                  {column.column_label}
                                  {column.is_required && <span className="text-red-500 ml-1">*</span>}
                                </span>
                              </label>
                            </div>
                          ) : isUserField ? (
                            <UserSelector
                              value={editTaskData[column.column_key] || ''}
                              onChange={(value) => setEditTaskData(prev => ({
                                ...prev,
                                [column.column_key]: value
                              }))}
                              label={column.column_label}
                              required={column.is_required}
                              placeholder={`Select ${column.column_label.toLowerCase()}...`}
                            />
                          ) : isDateField ? (
                            <DateInput
                              value={editTaskData[column.column_key] || ''}
                              onChange={(value) => setEditTaskData(prev => ({
                                ...prev,
                                [column.column_key]: value
                              }))}
                              label={column.column_label}
                              required={column.is_required}
                            />
                          ) : isQueryField ? (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {column.column_label}
                                {column.is_required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <textarea
                                value={editTaskData[column.column_key] || ''}
                                onChange={(e) => setEditTaskData(prev => ({
                                  ...prev,
                                  [column.column_key]: e.target.value
                                }))}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 relative z-10"
                                placeholder="Enter your query or message..."
                                required={column.is_required}
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {column.column_label}
                                {column.is_required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <input
                                type={column.column_type === 'number' ? 'number' : 'text'}
                                value={editTaskData[column.column_key] || ''}
                                onChange={(e) => setEditTaskData(prev => ({
                                  ...prev,
                                  [column.column_key]: e.target.value
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 relative z-10"
                                required={column.is_required}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setEditingTask(null)
                        setEditTaskData({})
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateTask}
                      className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Update Task
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Table */}
            <div className="w-full">
              {filteredTasks.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
                  No tasks found.
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 relative">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          {columns.map((column) => (
                            <th key={column.id} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {column.column_label}
                            </th>
                          ))}
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTasks.map((task) => (
                          <tr key={task.id} className={`hover:bg-gray-50 ${task.is_completed ? 'bg-green-50' : ''}`}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  console.log('Status toggle clicked!')
                                  toggleTaskComplete(task.id, task.is_completed)
                                }}
                                className={`p-2 rounded-full transition-colors cursor-pointer relative z-10 ${
                                  task.is_completed 
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                                title={task.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
                                type="button"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </td>
                            {columns.map((column) => (
                              <td key={column.id} className="px-4 py-4 text-sm text-gray-900">
                                <div className="max-w-xs break-words">
                                  {column.column_type === 'boolean' 
                                    ? (task.data[column.column_key] ? 'Yes' : 'No')
                                    : task.data[column.column_key] || '-'
                                  }
                                </div>
                              </td>
                            ))}
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex space-x-2 relative z-10">
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    console.log('Edit button clicked!')
                                    handleEditTask(task)
                                  }}
                                  className="text-blue-600 hover:text-blue-800 transition-colors p-1 cursor-pointer"
                                  title="Edit task"
                                  type="button"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    console.log('Delete button clicked!')
                                    handleDeleteTask(task.id)
                                  }}
                                  className="text-red-600 hover:text-red-800 transition-colors p-1 cursor-pointer"
                                  title="Delete task"
                                  type="button"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          activeTab={sheet?.type || 'monthly'}
          onTabChange={(tab) => router.push(`/dashboard?tab=${tab}`)}
          navigation={navigation}
          profile={profile}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Edit Sheet Modal */}
      {sheet && (
        <EditSheetModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          sheetId={sheet.id}
          sheetType={sheet.type}
          currentName={sheet.name}
          onSuccess={() => {
            loadSheetData()
            setShowEditModal(false)
          }}
        />
      )}
    </div>
  )
} 