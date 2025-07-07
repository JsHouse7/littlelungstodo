'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { X, Plus, Trash2, Settings, Save } from 'lucide-react'

type SheetType = 'monthly' | 'ongoing_admin' | 'personal_todo'

interface EditSheetModalProps {
  isOpen: boolean
  onClose: () => void
  sheetId: string
  sheetType: SheetType
  currentName: string
  onSuccess: () => void
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

export default function EditSheetModal({
  isOpen,
  onClose,
  sheetId,
  sheetType,
  currentName,
  onSuccess
}: EditSheetModalProps) {
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [columns, setColumns] = useState<ColumnDefinition[]>([])
  const [newColumns, setNewColumns] = useState<Array<{
    label: string
    key: string
    type: 'text' | 'date' | 'number' | 'boolean'
    required: boolean
  }>>([])
  const [loadingColumns, setLoadingColumns] = useState(true)
  
  // Create supabase client once to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  const loadColumns = useCallback(async () => {
    setLoadingColumns(true)
    try {
      const { data, error } = await supabase
        .from('column_definitions')
        .select('*')
        .eq('sheet_type', sheetType)
        .order('column_order')

      if (error) {
        console.error('Error loading columns:', error)
      } else {
        setColumns(data || [])
      }
    } catch (error) {
      console.error('Error loading columns:', error)
    } finally {
      setLoadingColumns(false)
    }
  }, [supabase, sheetType])

  useEffect(() => {
    if (isOpen) {
      setName(currentName)
      loadColumns()
    }
  }, [isOpen, currentName, loadColumns])

  const addNewColumn = () => {
    setNewColumns(prev => [...prev, {
      label: '',
      key: '',
      type: 'text',
      required: false
    }])
  }

  const removeNewColumn = (index: number) => {
    setNewColumns(prev => prev.filter((_, i) => i !== index))
  }

  const updateNewColumn = (index: number, field: string, value: any) => {
    setNewColumns(prev => prev.map((col, i) => 
      i === index ? { ...col, [field]: value } : col
    ))
  }

  const toggleColumnVisibility = async (columnId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('column_definitions')
        .update({ is_visible: !currentVisibility })
        .eq('id', columnId)

      if (error) {
        console.error('Error updating column visibility:', error)
      } else {
        loadColumns() // Reload to show changes
      }
    } catch (error) {
      console.error('Error updating column visibility:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError('')

    try {
      // Update sheet name
      const { error: sheetError } = await supabase
        .from('sheets')
        .update({ name: name.trim() })
        .eq('id', sheetId)

      if (sheetError) {
        setError(sheetError.message)
        setLoading(false)
        return
      }

      // Add new columns if any
      if (newColumns.length > 0) {
        const maxOrder = Math.max(...columns.map(c => c.column_order), 0)
        const columnDefinitions = newColumns.map((col, index) => ({
          sheet_type: sheetType,
          column_key: col.key || col.label.toLowerCase().replace(/\s+/g, '_'),
          column_label: col.label,
          column_type: col.type,
          column_order: maxOrder + index + 1,
          is_required: col.required,
          is_visible: true,
          select_options: null
        }))

        const { error: columnError } = await supabase
          .from('column_definitions')
          .insert(columnDefinitions)

        if (columnError) {
          setError('Sheet updated but failed to add some columns: ' + columnError.message)
        }
      }

      setNewColumns([])
      onSuccess()
      onClose()
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName(currentName)
    setError('')
    setNewColumns([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Edit Sheet Settings
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Sheet Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Sheet Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                required
              />
            </div>

            {/* Current Columns */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Current Columns</h4>
              {loadingColumns ? (
                <div className="text-sm text-gray-500">Loading columns...</div>
              ) : (
                <div className="space-y-2">
                  {columns.map((column) => (
                    <div key={column.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="font-medium text-sm text-gray-900">{column.column_label}</span>
                        <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs capitalize">
                          {column.column_type}
                        </span>
                        {column.is_required && (
                          <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={column.is_visible}
                            onChange={() => toggleColumnVisibility(column.id, column.is_visible)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                          />
                          <span className="text-xs text-gray-700">Visible</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* New Columns */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Add New Columns</h4>
                <button
                  type="button"
                  onClick={addNewColumn}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Column
                </button>
              </div>

              {newColumns.length > 0 && (
                <div className="space-y-3">
                  {newColumns.map((column, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Column Label
                          </label>
                          <input
                            type="text"
                            value={column.label}
                            onChange={(e) => updateNewColumn(index, 'label', e.target.value)}
                            placeholder="e.g., Additional Notes"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Column Type
                          </label>
                          <select
                            value={column.type}
                            onChange={(e) => updateNewColumn(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          >
                            <option value="text">Text</option>
                            <option value="date">Date</option>
                            <option value="number">Number</option>
                            <option value="boolean">Yes/No</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={column.required}
                            onChange={(e) => updateNewColumn(index, 'required', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                          />
                          <span className="text-xs text-gray-700">Required field</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeNewColumn(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 