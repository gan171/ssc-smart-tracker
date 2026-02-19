import { Trophy, Target, AlertCircle, CircleCheck, X, Sparkles } from 'lucide-react'

function MockSummaryModal({ isOpen, summary, onClose, onStartNextMock }) {
  if (!isOpen || !summary) return null

  const isGreat = summary.score >= 75

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700 overflow-hidden animate-in">
        <div className="p-6 md:p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white relative">
          <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-lg hover:bg-white/15">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={20} />
            <span className="text-sm uppercase tracking-wider font-semibold">Mock Post Analysis</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">Score: {summary.score}%</h2>
          <p className="text-blue-100 mt-2">
            {isGreat ? 'Excellent momentum. Keep this streak alive!' : 'Good effort. Let\'s convert mistakes into marks.'}
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={<Target size={16} />} label="Total" value={summary.total} />
            <Stat icon={<CircleCheck size={16} />} label="Correct" value={summary.correct} />
            <Stat icon={<AlertCircle size={16} />} label="Incorrect" value={summary.incorrect} />
            <Stat icon={<Trophy size={16} />} label="Skipped" value={summary.skipped} />
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-800/40">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Focus subjects for next session</h3>
            {summary.focusTopics?.length > 0 ? (
              <div className="space-y-2">
                {summary.focusTopics.map(([topic, misses]) => (
                  <div key={topic} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{topic}</span>
                    <span className="px-2 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{misses} misses</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">No major weak area this round 🎉</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onStartNextMock}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Start Another Mock
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">{icon} {label}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}

export default MockSummaryModal
