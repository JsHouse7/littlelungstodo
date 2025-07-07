'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { X, Calendar, Plus, Trash2 } from 'lucide-react'

type SheetType = 'monthly' | 'ongoing_admin' | 'personal_todo'

interface CreateSheetModalProps {
  isOpen: boolean
  onClose: () => void
  sheetType: SheetType
  userId: string
  onSuccess: () => void
}

export default function CreateSheetModal({
  isOpen,
  onClose,
  sheetType,
  userId,
  onSuccess
}: CreateSheetModalProps) {
  const [name, setName] = useState('')
  const [monthYear, setMonthYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customColumns, setCustomColumns] = useState<Array<{
    label: string
    key: string
    type: 'text' | 'date' | 'number' | 'boolean'
    required: boolean
  }>>([])
  const [showCustomColumns, setShowCustomColumns] = useState(false)
  
  // Create supabase client once to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])

  // Auto-generate name based on type and current date
  const generateDefaultName = () => {
    const now = new Date()
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    
    switch (sheetType) {
      case 'monthly':
        return `${currentMonth} Tasks`
      case 'ongoing_admin':
        return 'Practice Administration'
      case 'personal_todo':
        return 'My Personal Tasks'
      default:
        return 'New Sheet'
    }
  }

  const getCurrentMonthYear = () => {
    const now = new Date()
    return now.toISOString().slice(0, 7) // YYYY-MM format
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError('')

    try {
      const sheetData: any = {
        name: name.trim(),
        type: sheetType,
        is_active: true
      }

      // Add month_year for monthly sheets
      if (sheetType === 'monthly') {
        sheetData.month_year = monthYear || getCurrentMonthYear()
      }

      // Add owner_id for personal todos
      if (sheetType === 'personal_todo') {
        sheetData.owner_id = userId
      }

      const { data: sheetResult, error } = await supabase
        .from('sheets')
        .insert([sheetData])
        .select()
        .single()

      if (error) {
        setError(error.message)
      } else {
        // Save custom columns if any
        if (customColumns.length > 0) {
          const columnDefinitions = customColumns.map((col, index) => ({
            sheet_type: sheetType,
            column_key: col.key || col.label.toLowerCase().replace(/\s+/g, '_'),
            column_label: col.label,
            column_type: col.type,
            column_order: 100 + index, // Start after default columns
            is_required: col.required,
            is_visible: true,
            select_options: null
          }))

          const { error: columnError } = await supabase
            .from('column_definitions')
            .insert(columnDefinitions)

          if (columnError) {
            console.error('Error creating custom columns:', columnError)
          }
        }

        setName('')
        setMonthYear('')
        setCustomColumns([])
        setShowCustomColumns(false)
        onSuccess()
        onClose()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const addCustomColumn = () => {
    setCustomColumns(prev => [...prev, {
      label: '',
      key: '',
      type: 'text',
      required: false
    }])
  }

  const removeCustomColumn = (index: number) => {
    setCustomColumns(prev => prev.filter((_, i) => i !== index))
  }

  const updateCustomColumn = (index: number, field: string, value: any) => {
    setCustomColumns(prev => prev.map((col, i) => 
      i === index ? { ...col, [field]: value } : col
    ))
  }

  const resetForm = () => {
    setName('')
    setMonthYear('')
    setError('')
    setCustomColumns([])
    setShowCustomColumns(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Create New {' '}
            {sheetType === 'monthly' && 'Monthly Tasks Sheet'}
            {sheetType === 'ongoing_admin' && 'Practice Admin Sheet'}
            {sheetType === 'personal_todo' && 'Personal Todo List'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2"
          >
            <X className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 lg:p-6">
          <div className="space-y-4">
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
                placeholder={generateDefaultName()}
                className="w-full px-3 py-3 lg:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 text-base lg:text-sm"
                required
              />
            </div>

            {/* Month/Year for Monthly Tasks */}
            {sheetType === 'monthly' && (
              <div>
                <label htmlFor="monthYear" className="block text-sm font-medium text-gray-700 mb-2">
                  Month & Year
                </label>
                <input
                  type="month"
                  id="monthYear"
                  value={monthYear || getCurrentMonthYear()}
                  onChange={(e) => setMonthYear(e.target.value)}
                  className="w-full px-3 py-3 lg:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 text-base lg:text-sm"
                />
              </div>
            )}

            {/* Sheet Type Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  {sheetType === 'monthly' && 'This sheet will include columns: Date, File Nr/Acc nr, Patient Name, Query, Parents Name, Cell Number, To be actioned by, Executed, Message Take BY'}
                  {sheetType === 'ongoing_admin' && 'This sheet will include columns: Date, Query, Cell Number, To be actioned by'}
                  {sheetType === 'personal_todo' && 'This sheet will include columns: Date, To Do, Done?'}
                </div>
              </div>
            </div>

            {/* Custom Columns Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Custom Columns</h4>
                <button
                  type="button"
                  onClick={() => setShowCustomColumns(!showCustomColumns)}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors p-2 -m-2"
                >
                  {showCustomColumns ? 'Hide' : 'Add Custom Columns'}
                </button>
              </div>

              {showCustomColumns && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Add additional columns beyond the default ones for this sheet type.
                  </p>
                  
                  {customColumns.map((column, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Column Label
                          </label>
                          <input
                            type="text"
                            value={column.label}
                            onChange={(e) => updateCustomColumn(index, 'label', e.target.value)}
                            placeholder="e.g., Additional Notes"
                            className="w-full px-3 py-3 lg:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Column Type
                          </label>
                          <select
                            value={column.type}
                            onChange={(e) => updateCustomColumn(index, 'type', e.target.value)}
                            className="w-full px-3 py-3 lg:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                            onChange={(e) => updateCustomColumn(index, 'required', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                          />
                          <span className="text-xs text-gray-700">Required field</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeCustomColumn(index)}
                          className="text-red-600 hover:text-red-800 transition-colors p-2 -m-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCustomColumn}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Column
                  </button>
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
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-3 lg:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full sm:w-auto px-4 py-3 lg:py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Creating...' : 'Create Sheet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 