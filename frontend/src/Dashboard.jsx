import { useMemo, useState, useEffect } from 'react'
import {
  Upload, Zap, PlayCircle, Download, Flame, Trophy, Target, TrendingUp,
  CheckCircle, Circle, Edit3, Save, BookOpen, Radar, Clock, Sparkles
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
  onExportClick
}) {
  const [activeTab, setActiveTab] = useState('recent')
  const [editingNote, setEditingNote] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [counter, setCounter] = useState({ total: 0, accuracy: 0, streak: 0, xp: 0 })

  const stats = useMemo(() => {
    const totalQuestions = mistakes.length
    const attemptedQuestions = mistakes.filter((m) => (m.times_attempted || 0) > 0)
    const totalAttempts = attemptedQuestions.reduce((s, q) => s + (q.times_attempted || 0), 0)
    const correctAttempts = attemptedQuestions.reduce((s, q) => s + (q.times_correct || 0), 0)
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0

    const today = new Date()
    const practicedDates = new Set(
      mistakes
        .map((m) => m.last_attempted_at || m.created_at)
        .filter(Boolean)
        .map((d) => new Date(d).toDateString())
    )

    let streak = 0
    const cursor = new Date(today)
    while (practicedDates.has(cursor.toDateString())) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    const xp = Math.round(correctAttempts * 8 + totalQuestions * 3 + streak * 10)

    const dueToday = mistakes.filter((m) => {
      if (!m.next_review_date) return false
      return new Date(m.next_review_date).toDateString() === today.toDateString()
    }).length

    const overdue = mistakes.filter((m) => {
      if (!m.next_review_date) return false
      return new Date(m.next_review_date) < today
    }).length

    const weakTopics = Object.entries(
      mistakes.reduce((acc, q) => {
        const key = q.topic || q.subject || 'General'
        const attempts = q.times_attempted || 0
        const correct = q.times_correct || 0
        const misses = Math.max(attempts - correct, 0)
        if (misses > 0) acc[key] = (acc[key] || 0) + misses
        return acc
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5)

    return {
      totalQuestions,
      accuracy,
      streak,
      xp,
      dueToday,
      overdue,
      weakTopics,
      todayMission: Math.max(10, Math.min(35, dueToday + 10))
    }
  }, [mistakes])

  useEffect(() => {
    const target = {
      total: stats.totalQuestions,
      accuracy: Math.round(stats.accuracy),
      streak: stats.streak,
      xp: stats.xp
    }
    let frame
    const start = performance.now()
    const duration = 700

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setCounter({
        total: Math.round(target.total * ease),
        accuracy: Math.round(target.accuracy * ease),
        streak: Math.round(target.streak * ease),
        xp: Math.round(target.xp * ease)
      })
      if (p < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [stats.totalQuestions, stats.accuracy, stats.streak, stats.xp])

  const recent = mistakes.slice(0, 8)

  const handleStartEditNote = (question) => {
    setEditingNote(question.id)
    setNoteText(question.manual_notes || '')
  }

  const handleSaveNote = async (questionId) => {
    if (onAddNote) await onAddNote(questionId, noteText)
    setEditingNote(null)
    setNoteText('')
  }

  const isMilestone = stats.streak > 0 && stats.streak % 7 === 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-8">
      {isMilestone && (
          <div className="mb-4 rounded-2xl p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg animate-pulse-slow">
            <div className="flex items-center gap-2 font-semibold"><Sparkles size={16} /> Streak Milestone Unlocked</div>
            <div className="text-sm text-amber-100">{stats.streak}-day streak! You are building unstoppable exam momentum.</div>
          </div>
        )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard icon={<BookOpen size={18} />} label="Total" value={counter.total} color="from-blue-500 to-indigo-500" />
        <StatCard icon={<Target size={18} />} label="Accuracy" value={`${counter.accuracy}%`} color="from-green-500 to-emerald-500" />
        <StatCard icon={<Flame size={18} />} label="Streak" value={counter.streak} color="from-orange-500 to-red-500" />
        <StatCard icon={<Trophy size={18} />} label="XP" value={counter.xp} color="from-purple-500 to-fuchsia-500" />
      </section>

      <section className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 hover:-translate-y-0.5 transition-transform rounded-3xl p-5 md:p-6 border border-blue-200/60 dark:border-blue-800 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:to-gray-900 shadow-lg">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300 font-semibold">Daily Mission</div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Crack {stats.todayMission} revision points today</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stats.dueToday} due today · {stats.overdue} overdue · ~{Math.ceil(stats.todayMission * 1.8)} min</p>
            </div>
            <Clock className="text-blue-600" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <ActionButton icon={<Zap size={16} />} label="Quick Review" onClick={() => setActiveTab('review')} />
            <ActionButton icon={<PlayCircle size={16} />} label="10Q Sprint" onClick={onMockTestClick} />
            <ActionButton icon={<Upload size={16} />} label="Upload Mistake" onClick={onUploadClick} />
          </div>
        </div>

        <div className="rounded-3xl p-5 hover:-translate-y-0.5 transition-transform border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/70 shadow-md">
          <div className="flex items-center gap-2 mb-3 text-gray-900 dark:text-white font-semibold"><Radar size={16} /> Weak Topic Radar</div>
          <div className="space-y-3">
            {stats.weakTopics.length > 0 ? stats.weakTopics.map(([topic, misses], i) => (
              <div key={topic}>
                <div className="flex justify-between text-xs mb-1 text-gray-600 dark:text-gray-300"><span>{topic}</span><span>{misses}</span></div>
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div style={{ width: `${Math.max(12, 100 - i * 18)}%` }} className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-700" />
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">No weak topics yet. Start attempting mocks.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-2 mb-6 shadow-sm">
        <div className="grid grid-cols-4 gap-1 text-xs sm:text-sm">
          {[
            ['recent', 'Recent'],
            ['review', 'Review'],
            ['analytics', 'Analytics'],
            ['profile', 'Bank']
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`py-2.5 rounded-xl font-semibold transition ${activeTab === key ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'recent' && (
        <section className="space-y-3">
          {loading ? (
            <SkeletonList />
          ) : recent.length > 0 ? recent.map((q) => (
            <div
              key={q.id}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/85 dark:bg-gray-900/75 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <button onClick={() => onQuestionClick?.(q)} className="mt-0.5">
                  {q.status === 'analyzed' ? <CheckCircle className="text-green-500" size={18} /> : <Circle className="text-gray-400" size={18} />}
                </button>
                <div className="flex-1 min-w-0" onClick={() => onQuestionClick?.(q)}>
                  <div className="font-semibold text-gray-900 dark:text-white truncate">{q.question_text || 'Untitled question'}</div>
                  <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">{q.subject || 'General'} · {new Date(q.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => handleStartEditNote(q)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><Edit3 size={14} /></button>
              </div>

              {(editingNote === q.id || q.manual_notes) && (
                <div className="mt-3 ml-7">
                  {editingNote === q.id ? (
                    <div>
                      <textarea
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
                        rows={3}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                      />
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => handleSaveNote(q.id)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm inline-flex items-center gap-1"><Save size={12} /> Save</button>
                        <button onClick={() => setEditingNote(null)} className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 p-3 text-gray-700 dark:text-gray-300">📝 {q.manual_notes}</div>
                  )}
                </div>
              )}
            </div>
          )) : <EmptyState />}
        </section>
      )}

      {activeTab === 'review' && <ReviewQueue mistakes={mistakes} onQuestionClick={onQuestionClick} />}
      {activeTab === 'analytics' && <AnalyticsDashboard mistakes={mistakes} />}
      {activeTab === 'profile' && (
        <section className="grid md:grid-cols-3 gap-3">
          <button onClick={onUploadClick} className="premium-btn"><Upload size={16} /> Upload Single</button>
          <button onClick={onBulkUploadClick} className="premium-btn"><Zap size={16} /> Bulk Upload</button>
          <button onClick={onMockTestClick} className="premium-btn"><PlayCircle size={16} /> Start Mock Test</button>
          <button onClick={onExportClick} className="premium-btn md:col-span-3"><Download size={16} /> Export Revision PDF</button>
        </section>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg px-2 py-2">
        <div className="grid grid-cols-4 gap-1">
          <BottomTab active={activeTab === 'recent'} label="Recent" onClick={() => setActiveTab('recent')} />
          <BottomTab active={activeTab === 'review'} label="Review" onClick={() => setActiveTab('review')} />
          <BottomTab active={activeTab === 'analytics'} label="Mock" onClick={() => setActiveTab('analytics')} />
          <BottomTab active={activeTab === 'profile'} label="Profile" onClick={() => setActiveTab('profile')} />
        </div>
      </nav>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="rounded-2xl hover:-translate-y-0.5 transition-transform bg-white/90 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} text-white flex items-center justify-center mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}

function ActionButton({ icon, label, onClick }) {
  return <button onClick={onClick} className="rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:shadow-md inline-flex items-center justify-center gap-2">{icon} {label}</button>
}

function BottomTab({ active, label, onClick }) {
  return <button onClick={onClick} className={`rounded-lg py-2 text-xs font-semibold ${active ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-300'}`}>{label}</button>
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/85 dark:bg-gray-900/75 p-4 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
      <TrendingUp className="mx-auto mb-2" size={20} />
      No mistakes saved yet. Upload your first screenshot to begin tracking.
    </div>
  )
}

export default Dashboard
