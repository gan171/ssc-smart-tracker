import { FileText, Loader2, X } from 'lucide-react'

function BulkUploadModal({ isOpen, onClose, onUpload, loading, progress }) {
  if (!isOpen) return null

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      onUpload(files)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full relative">
        <button
          onClick={() => !loading && onClose()}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all disabled:opacity-50"
          disabled={loading}
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Bulk Upload
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Upload multiple screenshots at once
        </p>

        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl cursor-pointer bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:border-purple-400 transition-all">
          <input
            type="file"
            hidden
            onChange={handleFileChange}
            accept="image/*"
            multiple
            disabled={loading}
          />
          <div className="flex flex-col items-center gap-4">
            {loading ? (
              <>
                <Loader2 className="animate-spin text-purple-500" size={48} />
                <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  {progress.current} / {progress.total}
                </span>
                <span className="text-sm text-gray-500">Processing...</span>
              </>
            ) : (
              <>
                <FileText size={48} className="text-purple-400" />
                <span className="text-lg font-medium text-purple-600 dark:text-purple-400">
                  Select Multiple Files
                </span>
                <span className="text-sm text-gray-500">Hold Ctrl/Cmd to select multiple</span>
              </>
            )}
          </div>
        </label>
      </div>
    </div>
  )
}

export default BulkUploadModal