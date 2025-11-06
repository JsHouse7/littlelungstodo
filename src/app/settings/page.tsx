'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileLayout from '@/components/layout/MobileLayout';
import MobileHeader from '@/components/layout/MobileHeader';
import BottomNav from '@/components/layout/BottomNav';
import { createClient } from '@/lib/supabase'
import { Profile } from '@/lib/database.types'
import { 
  Settings, 
  Users, 
  User, 
  Plus, 
  Edit, 
  Shield, 
  Mail, 
  Phone, 
  Building, 
  Save,
  X,
  Check,
  AlertTriangle,
  Home,
  Trash2,
  Key,
  UserX,
  UserCheck,
  MoreVertical,
  Eye,
  EyeOff
} from 'lucide-react'

export default function SettingsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'general'>('profile')
  const [users, setUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [userFormData, setUserFormData] = useState({
    email: '',
    full_name: '',
    role: 'staff' as 'admin' | 'doctor' | 'staff',
    department: '',
    phone: ''
  })
  const [profileFormData, setProfileFormData] = useState({
    full_name: profile?.full_name || '',
    department: profile?.department || '',
    phone: profile?.phone || ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    userId: string
    action: string
    userEmail: string
    userName: string
  } | null>(null)
  
  // Create supabase client once to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')

      if (error) {
        console.error('Error loading users:', error)
        setError('Failed to load users')
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    
    if (user && profile) {
      setProfileFormData({
        full_name: profile.full_name || '',
        department: profile.department || '',
        phone: profile.phone || ''
      })
      
      if (profile.role === 'admin') {
        loadUsers()
      }
    }
  }, [user, profile, loading, router, loadUsers])

  const handleSaveProfile = async () => {
    setSaveLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileFormData.full_name.trim() || null,
          department: profileFormData.department.trim() || null,
          phone: profileFormData.phone.trim() || null
        })
        .eq('id', user?.id)

      if (error) {
        setError('Failed to update profile: ' + error.message)
      } else {
        setSuccess('Profile updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('An unexpected error occurred')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleInviteUser = async () => {
    setSaveLoading(true)
    setError('')
    setSuccess('')

    // Validate required fields
    if (!userFormData.email) {
      setError('Email is required')
      setSaveLoading(false)
      return
    }

    if (!userFormData.role) {
      setError('Role is required')
      setSaveLoading(false)
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userFormData.email)) {
      setError('Please enter a valid email address')
      setSaveLoading(false)
      return
    }

    try {
      // Call the API endpoint to invite the user
      const response = await fetch('/api/manage-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'invite_user',
          email: userFormData.email,
          full_name: userFormData.full_name,
          role: userFormData.role,
          department: userFormData.department,
          phone: userFormData.phone
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to invite user')
        return
      }

      setSuccess('Invitation sent successfully! The user will receive an email with instructions to set up their account.')
      setUserFormData({
        email: '',
        full_name: '',
        role: 'staff',
        department: '',
        phone: ''
      })
      setShowAddUser(false)
      loadUsers()
      setTimeout(() => setSuccess(''), 5000)

    } catch (err) {
      console.error('Error inviting user:', err)
      setError('An unexpected error occurred')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    
    setSaveLoading(true)
    setError('')
    setSuccess('')

    try {
      // Call the API endpoint to update the user
      const response = await fetch('/api/manage-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_user',
          userId: editingUser.id,
          full_name: userFormData.full_name,
          role: userFormData.role,
          department: userFormData.department,
          phone: userFormData.phone
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to update user')
        return
      }

      setSuccess('User updated successfully!')
      setEditingUser(null)
      setUserFormData({
        email: '',
        full_name: '',
        role: 'staff',
        department: '',
        phone: ''
      })
      loadUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error updating user:', err)
      setError('An unexpected error occurred')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleUserAction = async (action: string, userId: string, email: string) => {
    setSaveLoading(true)
    setError('')
    setSuccess('')
    setUserMenuOpen(null)

    try {
      const response = await fetch('/api/manage-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          userId,
          email
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to perform action')
        return
      }

      setSuccess(result.message)
      loadUsers()
      setTimeout(() => setSuccess(''), 5000)

    } catch (err) {
      console.error('Error performing user action:', err)
      setError('An unexpected error occurred')
    } finally {
      setSaveLoading(false)
      setConfirmAction(null)
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate_user' : 'activate_user'
    const userItem = users.find(u => u.id === userId)
    if (userItem) {
      await handleUserAction(action, userId, userItem.email)
    }
  }

  const startEditingUser = (user: Profile) => {
    setEditingUser(user)
    setUserFormData({
      email: user.email,
      full_name: user.full_name || '',
      role: user.role,
      department: user.department || '',
      phone: user.phone || ''
    })
  }

  const cancelEditing = () => {
    setEditingUser(null)
    setShowAddUser(false)
    setUserFormData({
      email: '',
      full_name: '',
      role: 'staff',
      department: '',
      phone: ''
    })
    setError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    router.push('/login')
    return null
  }

  // Compose header and bottom nav for MobileLayout
  const mobileHeader = <MobileHeader profile={profile} onSignOut={() => router.push('/login')} />;
  const bottomNav = (
    <BottomNav
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as 'profile' | 'users' | 'general')}
      navigation={[
        { name: 'Profile', key: 'profile', icon: User },
        { name: 'Users', key: 'users', icon: Users },
        { name: 'General', key: 'general', icon: Settings },
      ]}
      profile={profile}
      onSignOut={() => router.push('/login')}
    />
  );

  return (
    <MobileLayout header={mobileHeader} bottomNav={bottomNav}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 w-full">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-y-2">
            <div className="flex items-center w-full sm:w-auto">
              <Settings className="w-6 h-6 text-gray-400 mr-3" />
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500">Manage your account and application settings</p>
              </div>
            </div>
            <div className="flex items-center w-full sm:w-auto justify-end">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 px-2 sm:px-4 lg:px-8 py-4 sm:py-8 flex flex-col gap-y-4 w-full max-w-full">
        <div className="w-full max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex flex-col sm:flex-row gap-y-2 sm:gap-y-0 space-x-0 sm:space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm w-full sm:w-auto ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Profile
              </button>
              {profile.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm w-full sm:w-auto ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  User Management
                </button>
              )}
              <button
                onClick={() => setActiveTab('general')}
                className={`py-2 px-1 border-b-2 font-medium text-sm w-full sm:w-auto ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                General
              </button>
            </nav>
          </div>

          {/* Success/Error Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center">
              <Check className="w-4 h-4 mr-2" />
              {success}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 w-full"> {/* Always single column on mobile */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <Mail className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">{profile.email}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <Shield className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-600 capitalize">{profile.role}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Role is managed by administrators</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileFormData.full_name}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={profileFormData.department}
                        onChange={(e) => setProfileFormData(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="e.g., Pediatrics, Administration"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={profileFormData.phone}
                      onChange={(e) => setProfileFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="e.g., +1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saveLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {saveLoading ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saveLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && profile.role === 'admin' && (
            <div className="space-y-6">
              {/* Add User Button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-2">
                <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Send Invitation
                </button>
              </div>

              {/* Add/Edit User Form */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                (showAddUser || editingUser) ? 'max-h-[90vh] opacity-100 mb-4' : 'max-h-0 opacity-0'
              } w-full`}>
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 w-full">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    {editingUser ? 'Edit User' : 'Send User Invitation'}
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 w-full"> {/* Always single column on mobile */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={userFormData.email}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                          disabled={!!editingUser}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                          placeholder="user@example.com"
                          required
                        />
                        {editingUser && (
                          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={userFormData.full_name}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <select
                          value={userFormData.role}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'doctor' | 'staff' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        >
                          <option value="staff">Staff</option>
                          <option value="doctor">Doctor</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={userFormData.department}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, department: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="e.g., Pediatrics, Administration"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={userFormData.phone}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    {/* Email note for invitations */}
                    {!editingUser && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-start">
                          <Mail className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium">Email Invitation</p>
                            <p>The user will receive an email invitation to set up their account and password. No password is required during invitation.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingUser ? handleUpdateUser : handleInviteUser}
                        disabled={saveLoading || !userFormData.email || !userFormData.role}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                      >
                        {saveLoading ? 'Processing...' : editingUser ? 'Update User' : 'Send Invitation'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-medium text-gray-900">All Users</h4>
                </div>
                
                {loadingUsers ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading users...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((userItem) => (
                          <tr key={userItem.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {userItem.full_name || 'No name set'}
                                  </div>
                                  <div className="text-sm text-gray-500">{userItem.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                userItem.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800'
                                  : userItem.role === 'doctor'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {userItem.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {userItem.department || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                userItem.is_active 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {userItem.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => startEditingUser(userItem)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors"
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {userItem.id !== user?.id && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setUserMenuOpen(userMenuOpen === userItem.id ? null : userItem.id)}
                                      className="text-gray-600 hover:text-gray-800 transition-colors"
                                      title="More actions"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                    
                                    {userMenuOpen === userItem.id && (
                                      <>
                                        {/* Backdrop */}
                                        <div 
                                          className="fixed inset-0 z-40" 
                                          onClick={() => setUserMenuOpen(null)}
                                        />
                                        
                                        {/* Menu */}
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                          <div className="py-1">
                                            <button
                                              onClick={() => {
                                                setUserMenuOpen(null)
                                                handleUserAction('reset_password', userItem.id, userItem.email)
                                              }}
                                              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                              <Key className="w-4 h-4 mr-3 text-gray-400" />
                                              Reset Password
                                            </button>
                                            
                                            <button
                                              onClick={() => {
                                                setUserMenuOpen(null)
                                                handleToggleUserStatus(userItem.id, userItem.is_active)
                                              }}
                                              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                              {userItem.is_active ? (
                                                <>
                                                  <UserX className="w-4 h-4 mr-3 text-gray-400" />
                                                  Hibernate User
                                                </>
                                              ) : (
                                                <>
                                                  <UserCheck className="w-4 h-4 mr-3 text-gray-400" />
                                                  Activate User
                                                </>
                                              )}
                                            </button>

                                            <div className="border-t border-gray-100 my-1"></div>
                                            
                                            <button
                                              onClick={() => {
                                                setUserMenuOpen(null)
                                                setConfirmAction({
                                                  userId: userItem.id,
                                                  action: 'delete_user',
                                                  userEmail: userItem.email,
                                                  userName: userItem.full_name || userItem.email
                                                })
                                              }}
                                              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                              <Trash2 className="w-4 h-4 mr-3 text-red-400" />
                                              Delete User
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">General Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Application Information</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p><strong>Application:</strong> Little Lungs Task Manager</p>
                    <p><strong>Version:</strong> 1.0.0</p>
                    <p><strong>Environment:</strong> Development</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Data Management</h4>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Task data is automatically saved and synchronized across all devices in real-time.
                    </p>
                    <p className="text-sm text-gray-600">
                      File attachments are securely stored and backed up daily.
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Support</h4>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      For technical support or feature requests, please contact your system administrator.
                    </p>
                    {profile.role === 'admin' && (
                      <p className="text-sm text-gray-600">
                        As an administrator, you have access to all features including user management and system settings.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirm User Deletion
                  </h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to permanently delete <strong>{confirmAction.userName}</strong>? 
                  This action cannot be undone and will remove:
                </p>
                
                <ul className="text-sm text-gray-600 mb-6 space-y-1">
                  <li>• User account and login access</li>
                  <li>• All associated profile data</li>
                  <li>• Task assignments (tasks will remain)</li>
                </ul>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUserAction(confirmAction.action, confirmAction.userId, confirmAction.userEmail)}
                    disabled={saveLoading}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saveLoading ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  )
} 