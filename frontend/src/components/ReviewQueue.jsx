import { useState, useEffect } from 'react'
import { Brain, Clock, TrendingUp, CheckCircle, AlertCircle, Flame, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { categorizeReviewQueue, getStudyStats, getEstimatedStudyTime } from '../utils/spacedRepetition'

function ReviewQueue({ mistakes, onStartReview, onQuestionClick }) {
  const [activeFilter, setActiveFilter] = useState('all') // all, overdue, today, week
  const [sortBy, setSortBy] = useState('priority') // priority, date, subject

  // Categorize questions
  const categorized = categorizeReviewQueue(mistakes)
  const stats = getStudyStats(mistakes)

  // Combine and filter questions
  const getFilteredQuestions = () => {
    let questions = []

    switch(activeFilter) {
      case 'overdue':
        questions = categorized.overdue
        break
      case 'today':
        questions = [...categorized.overdue, ...categorized.dueToday]
        break
      case 'week':
        questions = [...categorized.overdue, ...categorized.dueToday, ...categorized.dueSoon]
        break
      default:
        questions = [...categorized.overdue, ...categorized.dueToday, ...categorized.dueSoon, ...categorized.upcoming]
    }

    // Sort
    if (sortBy === 'date') {
      questions.sort((a, b) => new Date(a.next_review_date) - new Date(b.next_review_date))
    } else if (sortBy === 'subject') {
      questions.sort((a, b) => a.subject.localeCompare(b.subject))
    }
    // Priority sorting is already done in categorizeReviewQueue

    return questions
  }

  const filteredQuestions = getFilteredQuestions()
  const estimatedTime = getEstimatedStudyTime(filteredQuestions.length)

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  }

  return (
    <div className="space-y-6">

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800"
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">Overdue</span>
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {categorized.overdue.length}
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-orange-600 dark:text-orange-400" size={24} />
            <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">Due Today</span>
          </div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {categorized.dueToday.length}
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">Mastered</span>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.mastered}
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-blue-600 dark:text-blue-400" size={24} />
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Accuracy</span>
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.averageAccuracy}%
          </div>
        </motion.div>
      </div>

      {/* Quick Action Card */}
      {(categorized.overdue.length > 0 || categorized.dueToday.length > 0) && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Brain size={32} />
              <div>
                <h3 className="text-2xl font-bold">Ready to Review?</h3>
                <p className="text-blue-100">
                  {categorized.overdue.length + categorized.dueToday.length} questions waiting for you
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Clock size={20} />
                <span className="text-sm">~{estimatedTime} min</span>
              </div>
              <div className="flex items-center gap-2">
                <Flame size={20} />
                <span className="text-sm">Keep your streak!</span>
              </div>
            </div>

            <button
              onClick={() => onStartReview(filteredQuestions)}
              className="px-8 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Start Review Session
            </button>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === 'all'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All ({mistakes.length})
          </button>
          <button
            onClick={() => setActiveFilter('overdue')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === 'overdue'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Overdue ({categorized.overdue.length})
          </button>
          <button
            onClick={() => setActiveFilter('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === 'today'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Due Today ({categorized.overdue.length + categorized.dueToday.length})
          </button>
          <button
            onClick={() => setActiveFilter('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeFilter === 'week'
                ? 'bg-yellow-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            This Week ({stats.dueThisWeek})
          </button>
        </div>

        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
          >
            <option value="priority">Sort by Priority</option>
            <option value="date">Sort by Date</option>
            <option value="subject">Sort by Subject</option>
          </select>
        </div>
      </div>

      {/* Question List */}
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500 opacity-50" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            All Caught Up! 🎉
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No questions to review right now. Keep up the great work!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q, index) => {
            const reviewDate = new Date(q.next_review_date)
            const now = new Date()
            const isOverdue = reviewDate < now
            const daysUntil = Math.ceil((reviewDate - now) / (1000 * 60 * 60 * 24))

            return (
              <motion.div
                key={q.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
                onClick={() => onQuestionClick(q)}
                className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {/* Priority Indicator */}
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    isOverdue ? 'bg-red-500' :
                    daysUntil <= 0 ? 'bg-orange-500' :
                    daysUntil <= 3 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />

                  {/* Question Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                        {q.subject}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        q.mastery_level === 'new' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
                        q.mastery_level === 'learning' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                        q.mastery_level === 'reviewing' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                        'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      }`}>
                        {q.mastery_level}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-gray-800 dark:text-white mb-1 truncate">
                      {q.question_text.substring(0, 100)}...
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {isOverdue ? '🔴 Overdue' :
                         daysUntil === 0 ? '🟠 Due today' :
                         daysUntil === 1 ? '🟡 Due tomorrow' :
                         `📅 Due in ${daysUntil} days`}
                      </span>
                      {q.times_attempted > 0 && (
                        <span>
                          Accuracy: {Math.round((q.times_correct / q.times_attempted) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">
                      {q.times_attempted || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      attempts
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ReviewQueue