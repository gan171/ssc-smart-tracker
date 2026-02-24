import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Upload, Target, TrendingUp, Flame,
  PlayCircle, BarChart3, Clock, CheckCircle, Circle,
  Sparkles, Zap, BookOpen, FileText, Edit3, Save,
  Brain, Download, Radar, Trophy
} from 'lucide-react'
import ReviewQueue from './components/ReviewQueue'
import AnalyticsDashboard from './components/AnalyticsDashboard'

function Dashboard({
  mistakes,
  loading,
  onUploadClick,
  onBulkUploadClick,
  onMockTestClick,
  onQuestionClick,
  onAddNote,
  onExportClick,
  onDeleteQuestion,
  onManualEntryClick,
  onLoadMore,
  hasMore,
  loadingMore
}) {
  const [activeTab, setActiveTab] = useState('recent')
  const [editingNote, setEditingNote] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [bankFilter, setBankFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [animatedStats, setAnimatedStats] = useState({ total: 0, accuracy: 0, streak: 0, xp: 0 })

  const stats = useMemo(() => {
    const totalQuestions = mistakes.length
    const analyzedCount = mistakes.filter((m) => m.status === 'analyzed').length

    const attemptedQuestions = mistakes.filter((m) => (m.times_attempted || 0) > 0)
    const totalAttempts = attemptedQuestions.reduce((sum, q) => sum + (q.times_attempted || 0), 0)
    const correctAttempts = attemptedQuestions.reduce((sum, q) => sum + (q.times_correct || 0), 0)
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0

    const now = new Date()
    const dueToday = mistakes.filter((m) => {
      if (!m.next_review_date) return false
      const reviewDate = new Date(m.next_review_date)
      return reviewDate.toDateString() === now.toDateString()
    }).length

    const overdue = mistakes.filter((m) => {
      if (!m.next_review_date) return false
      const reviewDate = new Date(m.next_review_date)
      return reviewDate < now
    }).length

    const practicedDates = new Set(
      mistakes
        .map((m) => m.last_attempted_at || m.created_at)
        .filter(Boolean)
        .map((d) => new Date(d).toDateString())
    )
    let streak = 0
    const cursor = new Date(now)
    while (practicedDates.has(cursor.toDateString())) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    const xp = Math.round(correctAttempts * 8 + totalQuestions * 3 + streak * 10)

    const weakTopics = Object.entries(
      mistakes.reduce((acc, q) => {
        const topic = q.topic || q.subject || 'General'
        const misses = Math.max((q.times_attempted || 0) - (q.times_correct || 0), 0)
        if (misses > 0) acc[topic] = (acc[topic] || 0) + misses
        return acc
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const todayMission = Math.max(10, Math.min(35, dueToday + overdue + 8))

    return {
      totalQuestions,
      analyzedCount,
      accuracy,
      streak,
      xp,
      dueToday,
      overdue,
      weakTopics,
      todayMission
    }
  }, [mistakes])

  useEffect(() => {
    const target = {
      total: stats.totalQuestions,
      accuracy: Number(stats.accuracy.toFixed(1)),
      streak: stats.streak,
      xp: stats.xp
    }
    const start = performance.now()
    const duration = 800
    let frame

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - p) ** 3
      setAnimatedStats({
        total: Math.round(target.total * eased),
        accuracy: Number((target.accuracy * eased).toFixed(1)),
        streak: Math.round(target.streak * eased),
        xp: Math.round(target.xp * eased)
      })
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [stats.totalQuestions, stats.accuracy, stats.streak, stats.xp])

  const subjectCounts = mistakes.reduce((acc, m) => {
    acc[m.subject] = (acc[m.subject] || 0) + 1
    return acc
  }, {})

  const subjectFiltered = bankFilter === 'All'
    ? mistakes
    : mistakes.filter((m) => m.subject === bankFilter)
  const filteredBank = subjectFiltered.filter((m) => {
    const haystack = `${m.question_text || ''} ${m.topic || ''}`.toLowerCase()
    return haystack.includes(searchTerm.toLowerCase())
  })

  const recentUploads = mistakes.slice(0, 8)

  const handleStartEditNote = (question) => {
    setEditingNote(question.id)
    setNoteText(question.manual_notes || '')
  }

  const handleSaveNote = (question) => {
    if (onAddNote) {
      onAddNote(question.id, noteText)
    }
    setEditingNote(null)
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100 }
    }
  }

  const QuestionCard = ({ q }) => (
    <div className="group mb-4">
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
            {(q.question_text || 'Untitled question').substring(0, 80)}...
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              {q.subject || 'General'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(q.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {q.manual_notes || editingNote === q.id ? (
        <div className="mt-2 ml-14 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          {editingNote === q.id ? (
            <div className="flex items-start gap-2">
              <textarea
                autoFocus
                value={noteText}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setNoteText(e.target.value)}
                className="flex-1 text-sm p-2 border rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Type your notes here..."
              />
              <div className="flex flex-col gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleSaveNote(q) }} className="p-1.5 bg-green-100 text-green-600 rounded-md hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                  <Save size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setEditingNote(null) }} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">📝 {q.manual_notes}</div>
              <button
                onClick={(e) => { e.stopPropagation(); handleStartEditNote(q) }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700"
              >
                <Edit3 size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDeleteQuestion && onDeleteQuestion(q) }} className="text-red-600 hover:text-red-700"><Circle size={14} /></button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); handleStartEditNote(q) }}
          className="mt-2 ml-14 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
        >
          <Edit3 size={12} />
          Add note
        </button>
      )}
    </div>
  )

  const SkeletonList = () => (
    <div className="space-y-3">
      {[...Array(4)].map((_, idx) => (
        <div key={idx} className="p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  )

  const isMilestone = stats.streak > 0 && stats.streak % 7 === 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BookOpen size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{animatedStats.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Questions</div>
              </div>
            </motion.div>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <Target size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{animatedStats.accuracy}%</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
              </div>
            </motion.div>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Flame size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{animatedStats.streak}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Day Streak</div>
              </div>
            </motion.div>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Trophy size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800 dark:text-white">{animatedStats.xp}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">XP Points</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 pb-24 md:pb-8">
        {isMilestone && (
          <div className="mb-6 rounded-2xl p-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg animate-pulse-slow">
            <div className="flex items-center gap-2 font-semibold"><Sparkles size={16} /> Streak Milestone Unlocked</div>
            <div className="text-sm text-yellow-100">{stats.streak}-day streak! Keep going champion.</div>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" className="group relative overflow-hidden rounded-2xl p-8 cursor-pointer transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)' }} onClick={onUploadClick}>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl group-hover:bg-blue-500/50 transition-all" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all"><Upload size={32} className="text-white" /></div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Upload</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Single question upload</p>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold group-hover:gap-3 transition-all">Upload <Zap size={16} /></div>
            </div>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }} className="group relative overflow-hidden rounded-2xl p-8 cursor-pointer transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)' }} onClick={onBulkUploadClick}>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl group-hover:bg-purple-500/50 transition-all" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all"><FileText size={32} className="text-white" /></div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Bulk</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Multiple questions</p>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold group-hover:gap-3 transition-all">Batch <Sparkles size={16} /></div>
            </div>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }} className="group relative overflow-hidden rounded-2xl p-8 cursor-pointer transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)' }} onClick={onMockTestClick}>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-500/30 rounded-full blur-3xl group-hover:bg-green-500/50 transition-all" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6 shadow-xl shadow-green-500/30 group-hover:shadow-green-500/50 transition-all"><PlayCircle size={32} className="text-white" /></div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Mock Test</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Practice questions</p>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold group-hover:gap-3 transition-all">{stats.totalQuestions} Ready <PlayCircle size={16} /></div>
            </div>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }} className="group relative overflow-hidden rounded-2xl p-8 cursor-pointer transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)' }} onClick={onExportClick}>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/30 rounded-full blur-3xl group-hover:bg-orange-500/50 transition-all" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-xl shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-all"><Download size={32} className="text-white" /></div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Export</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Download PDF</p>
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold group-hover:gap-3 transition-all">Export <Download size={16} /></div>
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 mb-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 rounded-2xl glass p-6">
            <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-300 text-xs font-semibold uppercase tracking-wide">
              <Clock size={14} /> Daily Mission
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Crack {stats.todayMission} revision points today</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{stats.dueToday} due today · {stats.overdue} overdue · ~{Math.ceil(stats.todayMission * 1.7)} min focus sprint</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setActiveTab('review')} className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Start Quick Review</button>
              <button onClick={onMockTestClick} className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Start 10Q Sprint</button>
              <button onClick={onUploadClick} className="px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700">Upload Mistake</button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 rounded-2xl glass p-6">
            <div className="flex items-center gap-2 mb-3 font-semibold text-gray-800 dark:text-white"><Radar size={16} /> Weak Topic Radar</div>
            {stats.weakTopics.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No weak areas yet. Attempt more questions to unlock radar.</p>
            ) : (
              <div className="space-y-3">
                {stats.weakTopics.map(([topic, misses], idx) => (
                  <div key={topic}>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1"><span>{topic}</span><span>{misses} misses</span></div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-700" style={{ width: `${Math.max(16, 100 - idx * 15)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button onClick={() => setActiveTab('recent')} className={`flex-1 min-w-[120px] px-6 py-4 font-semibold transition-all ${activeTab === 'recent' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><div className="flex items-center justify-center gap-2"><Clock size={20} /><span className="hidden sm:inline">Recent</span></div></button>
            <button onClick={() => setActiveTab('review')} className={`relative flex-1 min-w-[120px] px-6 py-4 font-semibold transition-all ${activeTab === 'review' ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400 bg-red-50/50 dark:bg-red-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><div className="flex items-center justify-center gap-2"><Brain size={20} /><span className="hidden sm:inline">Review</span>{(stats.overdue + stats.dueToday) > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{stats.overdue + stats.dueToday}</span>}</div></button>
            <button onClick={() => setActiveTab('bank')} className={`flex-1 min-w-[120px] px-6 py-4 font-semibold transition-all ${activeTab === 'bank' ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50/50 dark:bg-purple-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><div className="flex items-center justify-center gap-2"><BookOpen size={20} /><span className="hidden sm:inline">Bank</span><span className="text-xs">({stats.totalQuestions})</span></div></button>
            <button onClick={() => setActiveTab('analytics')} className={`flex-1 min-w-[120px] px-6 py-4 font-semibold transition-all ${activeTab === 'analytics' ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50/50 dark:bg-green-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}><div className="flex items-center justify-center gap-2"><BarChart3 size={20} /><span className="hidden sm:inline">Analytics</span></div></button>
          </div>

          <div className="p-6">
            {activeTab === 'recent' && (
              <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Uploads</h3>
                <button onClick={onManualEntryClick} className="mb-4 px-3 py-2 rounded bg-indigo-600 text-white text-sm">Manual Entry</button>
                {loading ? <SkeletonList /> : recentUploads.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400"><Upload size={48} className="mx-auto mb-4 opacity-50" /><p>No questions uploaded yet. Start by uploading your first mistake!</p></div>
                ) : (
                  <div className="space-y-3">{recentUploads.map((q) => <QuestionCard key={q.id} q={q} />)}</div>
                )}
              </div>
            )}

            {activeTab === 'review' && (
              <ReviewQueue mistakes={mistakes} onQuestionClick={onQuestionClick} />
            )}

            {activeTab === 'bank' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">All Questions</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{filteredBank.length} questions</div>
                </div>

                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by question text or topic"
                  className="w-full mb-4 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
                />

                <div className="flex flex-wrap gap-2 mb-6">
                  <button onClick={() => setBankFilter('All')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${bankFilter === 'All' ? 'bg-blue-500 text-white shadow-md' : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 text-gray-700 dark:text-gray-300 hover:border-blue-400'}`}>All: {stats.totalQuestions}</button>
                  {Object.entries(subjectCounts).map(([subject, count]) => (
                    <button key={subject} onClick={() => setBankFilter(subject)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${bankFilter === subject ? 'bg-purple-500 text-white shadow-md' : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 text-gray-700 dark:text-gray-300 hover:border-purple-400'}`}>{subject}: {count}</button>
                  ))}
                </div>

                {loading ? <SkeletonList /> : filteredBank.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400"><BookOpen size={48} className="mx-auto mb-4 opacity-50" /><p>No questions in this category yet.</p></div>
                ) : (
                  <div className="space-y-3">{filteredBank.map((q) => <QuestionCard key={q.id} q={q} />)}</div>
                )}

                {hasMore && (
                  <div className="mt-5 text-center">
                    <button onClick={onLoadMore} disabled={loadingMore} className="px-4 py-2 rounded-lg border">
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard mistakes={mistakes} />
            )}
          </div>
        </div>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg px-2 py-2">
        <div className="grid grid-cols-4 gap-1">
          <BottomTab active={activeTab === 'recent'} label="Recent" onClick={() => setActiveTab('recent')} />
          <BottomTab active={activeTab === 'review'} label="Review" onClick={() => setActiveTab('review')} />
          <BottomTab active={false} label="Mock" onClick={onMockTestClick} />
          <BottomTab active={activeTab === 'bank'} label="Profile" onClick={() => setActiveTab('bank')} />
        </div>
      </nav>
    </div>
  )
}

function BottomTab({ active, label, onClick }) {
  return (
    <button onClick={onClick} className={`rounded-lg py-2 text-xs font-semibold transition ${active ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-300'}`}>
      {label}
    </button>
  )
}

export default Dashboard
