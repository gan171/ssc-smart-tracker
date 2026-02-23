import { AlertCircle, CheckCircle2, FileText, Loader2, X } from 'lucide-react'

function BulkUploadModal({ isOpen, onClose, onUpload, loading, progress, summary }) {
  if (!isOpen) return null

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      onUpload(files)
    }
  }

  const hasSummary = Boolean(summary && !loading)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto">
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

        <label className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl cursor-pointer bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:border-purple-400 transition-all">
          <input
            type="file"
            hidden
            onChange={handleFileChange}
            accept="image/*"
            multiple
            disabled={loading}
          />
          <div className="flex flex-col items-center gap-4 px-4 text-center">
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

        {hasSummary && (
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/40">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold mb-3">
              <CheckCircle2 size={16} className="text-green-500" />
              Upload summary
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total: <strong>{summary.total}</strong></div>
              <div>Successful: <strong className="text-green-600 dark:text-green-400">{summary.success}</strong></div>
              <div>Failed: <strong className="text-red-600 dark:text-red-400">{summary.failed}</strong></div>
              <div>Duplicates: <strong>{summary.duplicates}</strong></div>
              <div>No image saved: <strong>{summary.storageFailed}</strong></div>
              <div>Skipped: <strong>{summary.skipped}</strong></div>
            </div>

            {summary.failedFiles?.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-red-600 dark:text-red-400 font-semibold mb-2">
                  <AlertCircle size={14} />
                  Failed files
                </div>
                <ul className="text-xs space-y-1 max-h-28 overflow-y-auto">
                  {summary.failedFiles.slice(0, 8).map((item) => (
                    <li key={`${item.file}-${item.error}`} className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{item.file}:</span> {item.error}
                    </li>
                  ))}
                  {summary.failedFiles.length > 8 && (
                    <li className="text-gray-500">+{summary.failedFiles.length - 8} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BulkUploadModal
