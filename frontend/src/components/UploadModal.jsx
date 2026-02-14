import { Upload, Loader2, X } from 'lucide-react'

function UploadModal({ isOpen, onClose, onUpload, loading, error }) {
  if (!isOpen) return null

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      onUpload(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          disabled={loading}
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Upload Question
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Upload a screenshot of a question you got wrong
        </p>

        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-gray-800 hover:border-blue-400 transition-all">
          <input
            type="file"
            hidden
            onChange={handleFileChange}
            accept="image/*"
            disabled={loading}
          />
          <div className="flex flex-col items-center gap-4">
            {loading ? (
              <>
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <span className="text-gray-500 dark:text-gray-400">Analyzing...</span>
              </>
            ) : (
              <>
                <Upload size={48} className="text-gray-400" />
                <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
                  Click to Upload
                </span>
                <span className="text-sm text-gray-500">PNG, JPG up to 10MB</span>
              </>
            )}
          </div>
        </label>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadModal