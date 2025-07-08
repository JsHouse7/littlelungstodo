'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Calendar, ClipboardList, Plus, Edit, Trash2, Check, Filter, Search, Settings, ArrowLeft, CheckSquare } from 'lucide-react'
import UserSelector from '@/components/ui/UserSelector'
import DateInput from '@/components/ui/DateInput'
import EditSheetModal from '@/components/sheets/EditSheetModal'
import Sidebar from '@/components/layout/Sidebar'

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

// BottomNav for mobile navigation (copied from dashboard)
function BottomNav({ activeTab, onTabChange, navigation }: { activeTab: SheetType, onTabChange: (tab: SheetType) => void, navigation: any[] }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-around items-center h-16 lg:hidden">
      {navigation.map((item) => {
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
    </nav>
  )
}

export default function SheetPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile, loading } = useAuth()
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
  
  // Create supabase client once to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])
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



  // Filter tasks based on current filters
  const filteredTasks = tasks.filter(task => {
    // Text filter (search in all text fields)
    if (filterText) {
      const searchText = filterText.toLowerCase()
      const matchesText = Object.values(task.data).some(value => 
        value && value.toString().toLowerCase().includes(searchText)
      )
      if (!matchesText) return false
    }

    // User filter (check assigned_to and other user fields)
    if (filterUser) {
      const userFields = ['to_be_actioned_by', 'message_taken_by', 'assigned_to', 'message_take_by']
      const matchesUser = userFields.some(field => 
        task.data[field] && typeof task.data[field] === 'string' && task.data[field].toLowerCase().includes(filterUser.toLowerCase())
      ) || 
      // Also check any custom fields that might be user fields
      Object.keys(task.data).some(key => 
        (key.includes('actioned_by') || key.includes('taken_by') || key.includes('assigned_to')) &&
        task.data[key] && typeof task.data[key] === 'string' && task.data[key].toLowerCase().includes(filterUser.toLowerCase())
      )
      if (!matchesUser) return false
    }

    // Status filter
    if (filterStatus === 'completed' && !task.is_completed) return false
    if (filterStatus === 'pending' && task.is_completed) return false

    return true
  })

  if (loading || loadingSheet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sheet...</p>
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - only show on desktop */}
      <div className="hidden lg:block">
        <Sidebar 
          profile={{
            full_name: profile?.full_name,
            email: profile?.email || '',
            role: profile?.role || '',
            department: profile?.department
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={sheet?.type}
          onTabChange={(tab) => router.push(`/dashboard?tab=${tab}`)}
        />
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col pb-16 lg:pb-0"> {/* Add pb-16 for mobile bottom nav space */}
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center">
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
              <div className="flex items-center space-x-2 lg:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-colors flex items-center text-sm ${
                    showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-4 h-4 mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
                {(profile?.role === 'admin') && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 lg:px-4 py-2 rounded-lg font-medium transition-colors flex items-center text-sm"
                  >
                    <Settings className="w-4 h-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddTask(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 rounded-lg font-medium transition-colors flex items-center text-sm"
                >
                  <Plus className="w-4 h-4 mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">Add Task</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
          {/* Filters */}
          {showFilters && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 mb-6">
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
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showAddTask ? 'max-h-[800px] opacity-100 mb-6' : 'max-h-0 opacity-0'
          }`}>
            <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Task</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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

        {/* Edit Task Form */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          editingTask ? 'max-h-[800px] opacity-100 mb-6' : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Task</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
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

        {/* Tasks - Mobile Card View / Desktop Table View */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {columns.map((column) => (
                    <th key={column.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column.column_label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-6 py-12 text-center text-gray-500">
                      {tasks.length === 0 
                        ? "No tasks found. Click 'Add Task' to create your first task."
                        : "No tasks match your current filters. Try adjusting your search criteria."
                      }
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className={task.is_completed ? 'bg-gray-50 opacity-75' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                          className={`p-1 rounded-full transition-colors ${
                            task.is_completed 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </td>
                      {columns.map((column) => (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {column.column_type === 'boolean' 
                            ? (task.data[column.column_key] ? 'Yes' : 'No')
                            : task.data[column.column_key] || '-'
                          }
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditTask(task)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit task"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            {filteredTasks.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                {tasks.length === 0 
                  ? "No tasks found. Click 'Add Task' to create your first task."
                  : "No tasks match your current filters. Try adjusting your search criteria."
                }
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <div key={task.id} className={`p-4 ${task.is_completed ? 'bg-gray-50 opacity-75' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center flex-1">
                        <button
                          onClick={() => toggleTaskComplete(task.id, task.is_completed)}
                          className={`p-2 rounded-full transition-colors mr-3 ${
                            task.is_completed 
                              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          {columns.slice(0, 2).map((column) => (
                            <div key={column.id} className="mb-1">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                {column.column_label}:
                              </span>
                              <span className="ml-2 text-sm text-gray-900 truncate block">
                                {column.column_type === 'boolean' 
                                  ? (task.data[column.column_key] ? 'Yes' : 'No')
                                  : task.data[column.column_key] || '-'
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button 
                          onClick={() => handleEditTask(task)}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                          title="Edit task"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Additional fields */}
                    {columns.slice(2).map((column) => (
                      <div key={column.id} className="mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {column.column_label}:
                        </span>
                        <span className="ml-2 text-sm text-gray-900 block break-words">
                          {column.column_type === 'boolean' 
                            ? (task.data[column.column_key] ? 'Yes' : 'No')
                            : task.data[column.column_key] || '-'
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
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
      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={sheet?.type || 'monthly'}
        onTabChange={(tab) => router.push(`/dashboard?tab=${tab}`)}
        navigation={navigation}
      />
    </div>
  )
} 