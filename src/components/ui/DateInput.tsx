'use client'

import { Calendar } from 'lucide-react'

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  placeholder?: string
}

export default function DateInput({
  value,
  onChange,
  label,
  required = false,
  placeholder = "Select date..."
}: DateInputProps) {
  const handleTodayClick = () => {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    onChange(today)
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative flex">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
            required={required}
          />
        </div>
        <button
          type="button"
          onClick={handleTodayClick}
          className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm font-medium border border-l-0 border-blue-600"
        >
          Today
        </button>
      </div>
    </div>
  )
} 