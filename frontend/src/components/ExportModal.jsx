import { useMemo, useState } from 'react'
import { FileDown, Loader2, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

const API_BASE_URL = 'http://127.0.0.1:8000'

function ExportModal({ isOpen, onClose, mistakes = [] }) {
  const [filters, setFilters] = useState({
    subject: 'all',
    topic: 'all',
    question_source: 'all',
    date_range: 'all_time',
    quantity: 50
  })

  const [options, setOptions] = useState({
    include_solution: true,
    include_user_notes: true,
    include_ai_analysis: true,
    include_answer_key: false
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subjects = useMemo(() => {
    return [...new Set(mistakes.map(m => m.subject).filter(Boolean))]
  }, [mistakes])

  const topics = useMemo(() => {
    if (filters.subject === 'all') return []
    return [...new Set(mistakes.filter(m => m.subject === filters.subject).map(m => m.topic).filter(Boolean))]
  }, [mistakes, filters.subject])

  if (!isOpen) return null

  const handleExport = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${API_BASE_URL}/api/generate-custom-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filters, options })
      })

      if (!response.ok) {
        throw new Error('Failed to generate export PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'ssc-revision-export.pdf'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      setError(err.message || 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ultimate Custom Export</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X /></button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="font-semibold mb-3 text-gray-800 dark:text-white">Content Filters</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-sm text-gray-600 dark:text-gray-300">Subject
                <select value={filters.subject} onChange={e => setFilters(f => ({ ...f, subject: e.target.value, topic: 'all' }))} className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-gray-800">
                  <option value="all">All</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className="text-sm text-gray-600 dark:text-gray-300">Topic
                <select disabled={filters.subject === 'all'} value={filters.topic} onChange={e => setFilters(f => ({ ...f, topic: e.target.value }))} className="mt-1 w-full rounded-lg border p-2 disabled:opacity-50 bg-white dark:bg-gray-800">
                  <option value="all">All</option>
                  {topics.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="text-sm text-gray-600 dark:text-gray-300">Question Source
                <select value={filters.question_source} onChange={e => setFilters(f => ({ ...f, question_source: e.target.value }))} className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-gray-800">
                  <option value="all">All</option>
                  <option value="mock_tests">Mock Tests</option>
                  <option value="manual_uploads">Manual Uploads</option>
                </select>
              </label>

              <label className="text-sm text-gray-600 dark:text-gray-300">Date Range
                <select value={filters.date_range} onChange={e => setFilters(f => ({ ...f, date_range: e.target.value }))} className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-gray-800">
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_month">Last Month</option>
                  <option value="all_time">All Time</option>
                </select>
              </label>

              <label className="text-sm text-gray-600 dark:text-gray-300">Quantity
                <input type="number" min={1} max={500} value={filters.quantity} onChange={e => setFilters(f => ({ ...f, quantity: Math.min(500, Math.max(1, Number(e.target.value) || 1)) }))} className="mt-1 w-full rounded-lg border p-2 bg-white dark:bg-gray-800" />
              </label>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-gray-800 dark:text-white">Display Toggles</h3>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={options.include_solution} onChange={e => setOptions(o => ({ ...o, include_solution: e.target.checked }))} /> Show Solution/Explanation</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={options.include_user_notes} onChange={e => setOptions(o => ({ ...o, include_user_notes: e.target.checked }))} /> Show My Notes</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={options.include_ai_analysis} onChange={e => setOptions(o => ({ ...o, include_ai_analysis: e.target.checked }))} /> Show AI Analysis</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={options.include_answer_key} disabled={options.include_solution} onChange={e => setOptions(o => ({ ...o, include_answer_key: e.target.checked }))} /> Show Correct Answer Key</label>
            </div>
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Cancel</button>
          <button onClick={handleExport} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {loading ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
