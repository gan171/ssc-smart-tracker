import { useState } from 'react'
import {
  Upload, Target, TrendingUp, Flame, Award,
  PlayCircle, BarChart3, Clock, CheckCircle, Circle,
  Sparkles, Zap, BookOpen, FileText, Edit3, Save, Filter,
  Brain, Download
} from 'lucide-react'
import { motion } from 'framer-motion'
import ReviewQueue from './components/ReviewQueue'
import AnalyticsDashboard from './components/AnalyticsDashboard'

function Dashboard({
  mistakes,
  onUploadClick,
  onBulkUploadClick,
  onMockTestClick,
  onQuestionClick,
  onAddNote,
  onExportClick,
  darkMode
}) {
  const [activeTab, setActiveTab] = useState('recent') // recent, bank, review, analytics
  const [editingNote, setEditingNote] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [bankFilter, setBankFilter] = useState('All')

  // Calculate stats
  const totalQuestions = mistakes.length
  const analyzedCount = mistakes.filter(m => m.status === 'analyzed').length

  const attemptedQuestions = mistakes.filter(m => m.times_attempted > 0)
  const totalAttempts = attemptedQuestions.reduce((sum, q) => sum + q.times_attempted, 0)
  const correctAttempts = attemptedQuestions.reduce((sum, q) => sum + q.times_correct, 0)
  const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0

  const streak = 7

  // Calculate review stats
  const now = new Date()
  const dueToday = mistakes.filter(m => {
    if (!m.next_review_date) return false
    const reviewDate = new Date(m.next_review_date)
    return reviewDate.toDateString() === now.toDateString()
  }).length

  const overdue = mistakes.filter(m => {
    if (!m.next_review_date) return false
    const reviewDate = new Date(m.next_review_date)
    return reviewDate < now
  }).length

  const subjectCounts = mistakes.reduce((acc, m) => {
    acc[m.subject] = (acc[m.subject] || 0) + 1
    return acc
  }, {})

  const recentUploads = mistakes.slice(0, 5)

  // Filtered mistakes for bank view
  const filteredBank = bankFilter === 'All'
    ? mistakes
    : mistakes.filter(m => m.subject === bankFilter)

  const handleSaveNote = async (questionId) => {
    if (onAddNote) {
      await onAddNote(questionId, noteText)
    }
    setEditingNote(null)
    setNoteText('')
  }

  const handleStartEditNote = (question) => {
    setEditingNote(question.id)
    setNoteText(question.manual_notes || '')
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100 }
    }
  }

  const QuestionCard = ({ q }) => (
    <div className="group">
      <div
        onClick={() => onQuestionClick && onQuestionClick(q)}
        className="flex items-center gap-4 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          q.status === 'analyzed'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
        }`}>
          {q.status === 'analyzed' ? <CheckCircle size={20} /> : <Circle size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-800 dark:text-white truncate">
            {q.question_text.substring(0, 80)}...
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              {q.subject}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(q.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {q.has_visual_elements && (
          <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded flex-shrink-0">
            Visual
          </div>
        )}
      </div>

      {/* Notes Section */}
      {q.manual_notes || editingNote === q.id ? (
        <div className="mt-2 ml-14 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          {editingNote === q.id ? (
            <div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                rows={3}
                placeholder="Add your notes..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSaveNote(q.id)}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded flex items-center gap-1"
                >
                  <Save size={14} />
                  Save
                </button>
                <button
                  onClick={() => setEditingNote(null)}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                📝 {q.manual_notes}
              </div>
              <button
                onClick={() => handleStartEditNote(q)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => handleStartEditNote(q)}
          className="mt-2 ml-14 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
        >
          <Edit3 size={12} />
          Add note
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">

      {/* Stats Bar */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{totalQuestions}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Questions</div>
              </div>
            </motion.div>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Target size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{accuracy}%</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
              </div>
            </motion.div>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Flame size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{streak}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Day Streak</div>
              </div>
            </motion.div>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{analyzedCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Analyzed</div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Hero Action Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">

          {/* Upload Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="group relative overflow-hidden rounded-2xl p-8 cursor-pointer transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onClick={onUploadClick}
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl group-hover:bg-blue-500/50 transition-all" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all">
                <Upload size={32} className="text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Upload
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                Single question upload
              </p>

              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold group-hover:gap-3 transition-all">
                Upload
                <Zap size={16} />
              </div>
            </div>
          </motion.div>

          {/* Bulk Upload Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="group relative overflow-hidden rounded-2xl p-8 cursor-pointer transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onClick={onBulkUploadClick}
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl group-hover:bg-purple-500/50 transition-all" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all">
                <FileText size={32} className="text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Bulk
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                Multiple questions
              </p>

              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold group-hover:gap-3 transition-all">
                Batch
                <Sparkles size={16} />
              </div>
            </div>
          </motion.div>

          {/* Mock Test Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="group relative overflow-hidden rounded-2xl p-8 cursor-pointer transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onClick={onMockTestClick}
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/30 rounded-full blur-3xl group-hover:bg-green-500/50 transition-all" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6 shadow-xl shadow-green-500/30 group-hover:shadow-green-500/50 transition-all">
                <PlayCircle size={32} className="text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Mock Test
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                Practice questions
              </p>

              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold group-hover:gap-3 transition-all">
                {totalQuestions} Ready
                <PlayCircle size={16} />
              </div>
            </div>
          </motion.div>

          {/* Export Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
            className="group relative overflow-hidden rounded-2xl p-8 cursor-pointer transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onClick={onExportClick}
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/30 rounded-full blur-3xl group-hover:bg-orange-500/50 transition-all" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-xl shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-all">
                <Download size={32} className="text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Export
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                Download PDF
              </p>

              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold group-hover:gap-3 transition-all">
                Export
                <Download size={16} />
              </div>
            </div>
          </motion.div>

        </div>

        {/* Tabs Section */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">

          {/* Tab Headers */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 min-w-[120px] px-6 py-4 font-semibold transition-all ${
                activeTab === 'recent'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock size={20} />
                <span className="hidden sm:inline">Recent</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`flex-1 min-w-[120px] px-6 py-4 font-semibold transition-all relative ${
                activeTab === 'review'
                  ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400 bg-orange-50/50 dark:bg-orange-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Brain size={20} />
                <span className="hidden sm:inline">Review</span>
                {(overdue + dueToday) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {overdue + dueToday}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('bank')}
              className={`flex-1 min-w-[120px] px-6 py-4 font-semibold transition-all ${
                activeTab === 'bank'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50/50 dark:bg-purple-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <BookOpen size={20} />
                <span className="hidden sm:inline">Bank</span>
                <span className="text-xs">({totalQuestions})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 min-w-[120px] px-6 py-4 font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50/50 dark:bg-green-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart3 size={20} />
                <span className="hidden sm:inline">Analytics</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">

            {/* Recent Activity Tab */}
            {activeTab === 'recent' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Recent Uploads
                </h3>

                {recentUploads.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Upload size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No questions uploaded yet. Start by uploading your first mistake!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentUploads.map(q => (
                      <QuestionCard key={q.id} q={q} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Review Queue Tab */}
            {activeTab === 'review' && (
              <ReviewQueue
                mistakes={mistakes}
                onQuestionClick={onQuestionClick}
              />
            )}

            {/* Mistake Bank Tab */}
            {activeTab === 'bank' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    All Questions
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredBank.length} questions
                  </div>
                </div>

                {/* Subject Filter Pills */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setBankFilter('All')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      bankFilter === 'All'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                    }`}
                  >
                    All: {totalQuestions}
                  </button>
                  {Object.entries(subjectCounts).map(([subject, count]) => (
                    <button
                      key={subject}
                      onClick={() => setBankFilter(subject)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        bankFilter === subject
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                      }`}
                    >
                      {subject}: {count}
                    </button>
                  ))}
                </div>

                {/* Questions Grid */}
                {filteredBank.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No questions in this category yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBank.map(q => (
                      <QuestionCard key={q.id} q={q} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <AnalyticsDashboard mistakes={mistakes} />
            )}

          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard