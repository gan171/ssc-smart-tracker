import { useEffect, useMemo, useState } from 'react'
import { User, Target, Timer, Brain, Award, Activity, Sparkles, Users, ThumbsUp, PenLine, Trophy, Upload, X } from 'lucide-react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

const PROFILE_DEFAULTS = {
  name: '',
  examTarget: 'SSC CGL',
  goalScore: '160+',
  preferredTopics: '',
  avatarDataUrl: '',
  achievements: []
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function ProfilePage({ user, mistakes }) {
  const storageKey = `ssc-profile-${user?.id || 'guest'}`
  const [profile, setProfile] = useState(PROFILE_DEFAULTS)
  const [newAchievement, setNewAchievement] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setProfile({ ...PROFILE_DEFAULTS, ...JSON.parse(saved) })
        return
      } catch {
        // ignore parse failures
      }
    }

    setProfile((prev) => ({
      ...prev,
      name: user?.user_metadata?.name || user?.email?.split('@')[0] || ''
    }))
  }, [storageKey, user])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(profile))
  }, [profile, storageKey])

  const snapshot = useMemo(() => {
    const attemptedQuestions = mistakes.filter((m) => (m.times_attempted || 0) > 0)
    const totalAttempts = attemptedQuestions.reduce((sum, q) => sum + (q.times_attempted || 0), 0)
    const correctAttempts = attemptedQuestions.reduce((sum, q) => sum + (q.times_correct || 0), 0)

    const avgSolveTime = attemptedQuestions
      .map((q) => q.average_time_seconds || q.avg_time_seconds || q.solve_time_seconds)
      .filter((value) => Number.isFinite(value) && value > 0)

    const practicedDates = new Set(
      mistakes
        .map((m) => m.last_attempted_at || m.created_at)
        .filter(Boolean)
        .map((d) => new Date(d).toDateString())
    )

    let streak = 0
    const cursor = new Date()
    while (practicedDates.has(cursor.toDateString())) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return {
      attemptedQuestions: attemptedQuestions.length,
      averageSolveTime: avgSolveTime.length
        ? `${Math.round(avgSolveTime.reduce((sum, sec) => sum + sec, 0) / avgSolveTime.length)} sec`
        : 'Not enough data',
      accuracy: totalAttempts > 0 ? `${Math.round((correctAttempts / totalAttempts) * 100)}%` : '0%',
      streak
    }
  }, [mistakes])

  const radarData = useMemo(() => {
    const topicMap = mistakes.reduce((acc, q) => {
      const topic = q.topic || q.subject || 'General'
      const attempts = q.times_attempted || 0
      const correct = q.times_correct || 0

      if (!acc[topic]) {
        acc[topic] = { attempts: 0, correct: 0 }
      }

      acc[topic].attempts += attempts
      acc[topic].correct += correct
      return acc
    }, {})

    return Object.entries(topicMap)
      .map(([topic, values]) => ({
        topic,
        score: values.attempts > 0 ? Math.round((values.correct / values.attempts) * 100) : 30
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  }, [mistakes])

  const contributionStats = useMemo(() => {
    const notesAdded = mistakes.filter((q) => (q.manual_notes || '').trim().length > 0).length
    return {
      tricksPosted: 0,
      upvotesReceived: 0,
      acceptedTricks: 0,
      notesAdded
    }
  }, [mistakes])

  const recentActivity = useMemo(() => {
    const solved = mistakes
      .filter((q) => q.last_attempted_at)
      .sort((a, b) => new Date(b.last_attempted_at) - new Date(a.last_attempted_at))
      .slice(0, 3)
      .map((q) => ({
        type: 'Solved',
        icon: <Brain size={14} />,
        label: q.topic || q.subject || 'Question practiced',
        date: q.last_attempted_at
      }))

    const posted = contributionStats.notesAdded > 0
      ? [{
        type: 'Posted',
        icon: <PenLine size={14} />,
        label: `${contributionStats.notesAdded} personal note${contributionStats.notesAdded > 1 ? 's' : ''} added`,
        date: new Date().toISOString()
      }]
      : []

    const upcoming = [
      { type: 'Upvoted', icon: <ThumbsUp size={14} />, label: 'Ninja trick voting launches soon', date: new Date().toISOString() },
      { type: 'Clan Joined', icon: <Users size={14} />, label: 'Clan system launching soon', date: new Date().toISOString() }
    ]

    return [...solved, ...posted, ...upcoming].slice(0, 6)
  }, [mistakes, contributionStats.notesAdded])

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, avatarDataUrl: String(reader.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  const addAchievement = (e) => {
    e.preventDefault()
    if (!newAchievement.trim()) return
    setProfile((prev) => ({
      ...prev,
      achievements: [newAchievement.trim(), ...prev.achievements]
    }))
    setNewAchievement('')
  }

  const removeAchievement = (item) => {
    setProfile((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((achievement) => achievement !== item)
    }))
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60 p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><User size={22} /> Learner Profile</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">A dedicated space for identity, performance, and community contribution.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Target size={18} /> Identity</h2>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 overflow-hidden flex items-center justify-center">
              {profile.avatarDataUrl ? (
                <img src={profile.avatarDataUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-gray-500" />
              )}
            </div>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-sm">
              <Upload size={14} /> Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} />
            </label>
          </div>

          <div className="grid gap-3">
            <input value={profile.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Name" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            <input value={profile.examTarget} onChange={(e) => updateField('examTarget', e.target.value)} placeholder="Exam target" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            <input value={profile.goalScore} onChange={(e) => updateField('goalScore', e.target.value)} placeholder="Goal score" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            <input value={profile.preferredTopics} onChange={(e) => updateField('preferredTopics', e.target.value)} placeholder="Preferred topics (comma separated)" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Activity size={18} /> Performance Snapshot</h2>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20"><div className="text-gray-500">Attempted questions</div><div className="font-bold text-xl">{snapshot.attemptedQuestions}</div></div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20"><div className="text-gray-500">Avg solve time</div><div className="font-bold text-xl">{snapshot.averageSolveTime}</div></div>
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20"><div className="text-gray-500">Accuracy</div><div className="font-bold text-xl">{snapshot.accuracy}</div></div>
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20"><div className="text-gray-500">Streak</div><div className="font-bold text-xl">{snapshot.streak}d</div></div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Trophy size={18} /> Achievement Showcase</h2>
        <form onSubmit={addAchievement} className="mt-4 flex gap-2">
          <input
            value={newAchievement}
            onChange={(e) => setNewAchievement(e.target.value)}
            placeholder="Add exam or milestone (e.g., SSC CHSL 2024 cleared)"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Add</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.achievements.length > 0 ? profile.achievements.map((item) => (
            <span key={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 text-sm">
              <Award size={12} /> {item}
              <button onClick={() => removeAchievement(item)}><X size={12} /></button>
            </span>
          )) : <p className="text-sm text-gray-500">No achievements added yet.</p>}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Sparkles size={18} /> Strength / Weakness Radar</h2>
          <div className="h-72 mt-4">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#94a3b8" strokeOpacity={0.3} />
                  <PolarAngleAxis dataKey="topic" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Accuracy" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">Attempt questions to unlock your topic radar.</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Award size={18} /> Contribution Stats</h2>
          <div className="space-y-3 mt-4 text-sm">
            <div className="flex justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"><span>Tricks posted</span><strong>{contributionStats.tricksPosted}</strong></div>
            <div className="flex justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"><span>Upvotes received</span><strong>{contributionStats.upvotesReceived}</strong></div>
            <div className="flex justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"><span>Accepted / top tricks</span><strong>{contributionStats.acceptedTricks}</strong></div>
            <div className="flex justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"><span>Study notes posted</span><strong>{contributionStats.notesAdded}</strong></div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Ninja Trick posting + voting stats will auto-populate after community shortcuts launch.</p>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Timer size={18} /> Recent Activity</h2>
        <div className="mt-4 space-y-2">
          {recentActivity.map((item, idx) => (
            <div key={`${item.type}-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                <span className="text-indigo-500">{item.icon}</span>
                <div>
                  <div className="font-medium">{item.type}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">{formatDate(item.date)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ProfilePage
