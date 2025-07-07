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
      <div className="relative flex flex-col sm:flex-row">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 pr-3 py-3 lg:py-2 border border-gray-300 sm:rounded-l-md sm:rounded-r-none rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 text-base lg:text-sm"
            required={required}
          />
        </div>
        <button
          type="button"
          onClick={handleTodayClick}
          className="px-4 py-3 lg:py-2 bg-blue-600 text-white sm:rounded-r-md sm:rounded-l-none rounded-md sm:rounded-t-none mt-2 sm:mt-0 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm font-medium border border-l-0 border-blue-600"
        >
          Today
        </button>
      </div>
    </div>
  )
} 