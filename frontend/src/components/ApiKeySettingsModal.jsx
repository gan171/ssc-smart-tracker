import { useEffect, useState } from 'react'
import { KeyRound, Save, Trash2, X } from 'lucide-react'

export const GEMINI_API_KEY_STORAGE_KEY = 'ssc_gemini_api_key'

function ApiKeySettingsModal({ isOpen, onClose }) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setValue(localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '')
  }, [isOpen])

  const handleSave = () => {
    const normalized = value.trim()
    if (normalized) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, normalized)
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY)
    }
    onClose()
  }

  const handleRemove = () => {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY)
    setValue('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2"><KeyRound size={18} /> Gemini API Key</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Stored only in this browser for your uploads. We do not save your key in our database.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste Gemini API key"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">Tip: remove this key when using shared/public computers.</p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={handleRemove} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm flex items-center gap-2"><Trash2 size={14} /> Remove</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm flex items-center gap-2"><Save size={14} /> Save Key</button>
        </div>
      </div>
    </div>
  )
}

export default ApiKeySettingsModal
