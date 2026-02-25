import { useEffect, useMemo, useState } from 'react'
import {
  Flame, Shield, Swords, Trophy, Users, Crown,
  Sparkles, Target, Zap, Star, Award, Flag
} from 'lucide-react'

// Warrior rank system with Mahabharata-inspired progression
const WARRIOR_RANKS = [
  { name: 'Yoddha', minPoints: 0, color: 'gray', glow: 'gray-400' },
  { name: 'Scholar', minPoints: 50, color: 'blue', glow: 'blue-400' },
  { name: 'Ekalavya', minPoints: 150, color: 'purple', glow: 'purple-400' },
  { name: 'Karna', minPoints: 300, color: 'orange', glow: 'orange-400' },
  { name: 'Arjuna', minPoints: 500, color: 'cyan', glow: 'cyan-400' },
  { name: 'Dronacharya', minPoints: 1000, color: 'yellow', glow: 'yellow-400' }
]

const getRank = (points) => {
  return [...WARRIOR_RANKS].reverse().find(r => points >= r.minPoints) || WARRIOR_RANKS[0]
}

const seedPosts = [
  {
    id: 'post-1',
    questionText: 'A train crosses a pole in 12s and a platform in 20s. Find platform length if speed is 54 km/h.',
    topic: 'Quant',
    scope: 'global',
    author: 'Arjuna_17',
    authorPoints: 520,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    answers: [
      {
        id: 'ans-1',
        author: 'Dronacharya_Math',
        authorPoints: 1250,
        text: '54 km/h = 15 m/s. Train length = 12×15 = 180m. Platform+train = 20×15 = 300m. Platform = 120m.',
        isDivyastra: true,
        upvotes: 12,
        workedCount: 8
      }
    ]
  }
]

function CommunityPage({ user }) {
  const storageKey = `ssc-community-${user?.id || 'guest'}`
  const [posts, setPosts] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return seedPosts
    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed : seedPosts
    } catch {
      return seedPosts
    }
  })

  const [activeTab, setActiveTab] = useState('sankat')
  const [questionText, setQuestionText] = useState('')
  const [topic, setTopic] = useState('Quant')
  const [scope, setScope] = useState('global')
  const [draftAnswers, setDraftAnswers] = useState({})
  const [userPoints] = useState(120) // Mock user points

  const currentUserRank = getRank(userPoints)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(posts))
  }, [posts, storageKey])

  const leaderboard = useMemo(() => {
    const pointsByUser = {}
    posts.forEach((post) => {
      post.answers.forEach((answer) => {
        pointsByUser[answer.author] = (pointsByUser[answer.author] || 0) + answer.upvotes * 2 + (answer.workedCount || 0)
      })
    })

    return Object.entries(pointsByUser)
      .map(([name, points]) => ({ name, points, rank: getRank(points) }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
  }, [posts])

  const addSankatPost = (e) => {
    e.preventDefault()
    if (!questionText.trim()) return

    const newPost = {
      id: crypto.randomUUID(),
      questionText: questionText.trim(),
      topic,
      scope,
      author: user?.email?.split('@')[0] || 'Yoddha',
      authorPoints: userPoints,
      createdAt: new Date().toISOString(),
      answers: []
    }

    setPosts((prev) => [newPost, ...prev])
    setQuestionText('')
    setTopic('Quant')
    setScope('global')
  }

  const addAnswer = (postId) => {
    const text = (draftAnswers[postId] || '').trim()
    if (!text) return

    const currentUser = user?.email?.split('@')[0] || 'Yoddha'

    setPosts((prev) => prev.map((post) => {
      if (post.id !== postId) return post
      return {
        ...post,
        answers: [
          {
            id: crypto.randomUUID(),
            author: currentUser,
            authorPoints: userPoints,
            text,
            upvotes: 0,
            workedCount: 0,
            isDivyastra: false
          },
          ...post.answers
        ]
      }
    }))

    setDraftAnswers((prev) => ({ ...prev, [postId]: '' }))
  }

  const upvoteAnswer = (postId, answerId) => {
    setPosts((prev) => prev.map((post) => {
      if (post.id !== postId) return post
      return {
        ...post,
        answers: post.answers.map((answer) => answer.id === answerId
          ? { ...answer, upvotes: answer.upvotes + 1 }
          : answer)
      }
    }))
  }

  const markWorked = (postId, answerId) => {
    setPosts((prev) => prev.map((post) => {
      if (post.id !== postId) return post
      return {
        ...post,
        answers: post.answers.map((answer) => answer.id === answerId
          ? { ...answer, workedCount: (answer.workedCount || 0) + 1 }
          : answer)
      }
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-orange-950 dark:to-red-950">
      {/* Epic Header Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-red-600/20 to-yellow-600/20 dark:from-orange-900/40 dark:via-red-900/40 dark:to-yellow-900/40" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-red-600 to-yellow-600 dark:from-orange-400 dark:via-red-400 dark:to-yellow-400 mb-2">
                ⚔️ Kurukshetra Community
              </h1>
              <p className="text-lg text-orange-800 dark:text-orange-200 font-medium">
                Where Warriors Share Divyastras • AI-Free Zone
              </p>
            </div>

            {/* User Rank Badge */}
            <div className="flex flex-col items-end gap-2">
              <div className={`px-6 py-3 rounded-2xl bg-gradient-to-br from-${currentUserRank.color}-500 to-${currentUserRank.color}-600 shadow-lg shadow-${currentUserRank.glow}/50 border-2 border-${currentUserRank.color}-400`}>
                <div className="flex items-center gap-2">
                  <Shield className="text-white" size={20} />
                  <div className="text-white">
                    <div className="text-xs opacity-90">Your Rank</div>
                    <div className="text-lg font-bold">{currentUserRank.name}</div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                {userPoints} Insight Points
              </div>
            </div>
          </div>

          {/* Rank Progress Bar */}
          <div className="mt-6 p-4 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Next Rank: {WARRIOR_RANKS[WARRIOR_RANKS.findIndex(r => r.name === currentUserRank.name) + 1]?.name || 'MAX'}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {WARRIOR_RANKS[WARRIOR_RANKS.findIndex(r => r.name === currentUserRank.name) + 1]?.minPoints - userPoints || 0} IP to go
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-${currentUserRank.color}-500 to-${currentUserRank.color}-600 transition-all duration-500`}
                style={{
                  width: `${Math.min(100, (userPoints / (WARRIOR_RANKS[WARRIOR_RANKS.findIndex(r => r.name === currentUserRank.name) + 1]?.minPoints || userPoints)) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-orange-200 dark:border-orange-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {[
              { id: 'sankat', label: 'Sankat Mochan', icon: Flame },
              { id: 'divyastra', label: 'Divyastra Vault', icon: Sparkles },
              { id: 'leaderboard', label: 'Hall of Warriors', icon: Trophy },
              { id: 'sena', label: 'Sena Hub', icon: Flag },
              { id: 'chakravyuh', label: 'Chakravyuh', icon: Target }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400 bg-orange-50 dark:bg-orange-950'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Sankat Mochan Tab */}
        {activeTab === 'sankat' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Raise Sankat Card */}
              <div className="rounded-2xl border-2 border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Flame size={22} />
                    Raise Your Sankat Flare
                  </h2>
                  <p className="text-orange-100 text-sm mt-1">
                    Stuck on a question? Signal for backup from fellow warriors
                  </p>
                </div>

                <form onSubmit={addSankatPost} className="p-6 space-y-4">
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 transition-all"
                    rows={4}
                    placeholder="Describe the question you're stuck on... Include relevant details for better help."
                  />

                  <div className="grid sm:grid-cols-3 gap-3">
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900"
                    >
                      <option>Quant</option>
                      <option>Reasoning</option>
                      <option>English</option>
                      <option>GK</option>
                      <option>General</option>
                    </select>

                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      className="px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900"
                    >
                      <option value="global">🌍 Global Army</option>
                      <option value="sena">🛡️ My Sena Only</option>
                    </select>

                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold hover:from-orange-700 hover:to-red-700 shadow-lg shadow-orange-500/30 transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      <Flame size={18} />
                      Call for Help
                    </button>
                  </div>
                </form>
              </div>

              {/* Active Sankats Feed */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Swords size={20} className="text-orange-600" />
                  Battlefield Updates
                </h3>

                <div className="space-y-4">
                  {posts.map((post) => (
                    <article
                      key={post.id}
                      className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-all overflow-hidden"
                    >
                      {/* Post Header */}
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-orange-50 dark:from-gray-800 dark:to-orange-950 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-${getRank(post.authorPoints).color}-500 to-${getRank(post.authorPoints).color}-600 flex items-center justify-center text-white font-bold shadow-lg`}>
                              {post.author[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white">{post.author}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white bg-${getRank(post.authorPoints).color}-500`}>
                                  {getRank(post.authorPoints).name}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <span>{new Date(post.createdAt).toLocaleString()}</span>
                                <span>•</span>
                                <span className={`font-medium ${post.scope === 'sena' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                  {post.scope === 'sena' ? '🛡️ Sena' : '🌍 Global'}
                                </span>
                                <span>•</span>
                                <span className="text-orange-600 dark:text-orange-400 font-medium">{post.topic}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="p-6">
                        <p className="text-gray-900 dark:text-gray-100 text-lg leading-relaxed">
                          {post.questionText}
                        </p>
                      </div>

                      {/* Answers */}
                      {post.answers.length > 0 && (
                        <div className="px-6 pb-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            <Sparkles size={16} className="text-yellow-500" />
                            Divyastra Solutions ({post.answers.length})
                          </div>

                          {post.answers.map((answer, idx) => (
                            <div
                              key={answer.id}
                              className={`rounded-xl border-2 p-4 ${
                                answer.isDivyastra || getRank(answer.authorPoints).name === 'Dronacharya'
                                  ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 shadow-lg shadow-yellow-500/20'
                                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                              }`}
                            >
                              {/* Answer Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-${getRank(answer.authorPoints).color}-500 to-${getRank(answer.authorPoints).color}-600 flex items-center justify-center text-white text-sm font-bold`}>
                                    {answer.author[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-gray-900 dark:text-white">{answer.author}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white bg-${getRank(answer.authorPoints).color}-500`}>
                                        {getRank(answer.authorPoints).name}
                                      </span>
                                      {(answer.isDivyastra || getRank(answer.authorPoints).name === 'Dronacharya') && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-yellow-900 dark:text-yellow-100 bg-yellow-400">
                                          <Crown size={12} />
                                          Top Divyastra
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => upvoteAnswer(post.id, answer.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-950 font-semibold text-sm transition-all group"
                                  >
                                    <Zap size={14} className="text-orange-500 group-hover:text-orange-600" />
                                    <span className="text-orange-600 dark:text-orange-400">{answer.upvotes}</span>
                                  </button>
                                  <button
                                    onClick={() => markWorked(post.id, answer.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-green-300 dark:border-green-700 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-950 font-semibold text-sm transition-all group"
                                  >
                                    <Star size={14} className="text-green-500 group-hover:text-green-600" />
                                    <span className="text-green-600 dark:text-green-400">{answer.workedCount || 0}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Answer Content */}
                              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                                {answer.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input */}
                      <div className="p-6 pt-0">
                        <div className="flex gap-3">
                          <input
                            value={draftAnswers[post.id] || ''}
                            onChange={(e) => setDraftAnswers((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 transition-all"
                            placeholder="Share your Divyastra shortcut..."
                          />
                          <button
                            onClick={() => addAnswer(post.id)}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 text-white dark:text-gray-900 font-bold hover:scale-105 transform transition-all shadow-lg"
                          >
                            <Sparkles size={18} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="rounded-2xl border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-6">
                <h3 className="font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2 mb-4">
                  <Award size={20} />
                  Battlefield Intel
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/80 dark:bg-gray-900/80 p-4 text-center">
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{posts.length}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">Active Sankats</div>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-gray-900/80 p-4 text-center">
                    <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                      {posts.reduce((sum, p) => sum + p.answers.length, 0)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">Divyastras Shared</div>
                  </div>
                </div>
              </div>

              {/* Top Contributors */}
              <div className="rounded-2xl border-2 border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Trophy size={20} />
                    Top Warriors This Week
                  </h3>
                </div>

                <div className="p-4 space-y-2">
                  {leaderboard.length > 0 ? leaderboard.slice(0, 5).map((entry, idx) => (
                    <div
                      key={entry.name}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        idx === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-2 border-yellow-400 dark:border-yellow-600' :
                        idx === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-2 border-gray-400' :
                        idx === 2 ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-600' :
                        'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-black ${
                          idx === 0 ? 'text-yellow-500' :
                          idx === 1 ? 'text-gray-400' :
                          idx === 2 ? 'text-amber-600' :
                          'text-gray-400'
                        }`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">{entry.name}</div>
                          <div className={`text-xs font-bold text-${entry.rank.color}-600 dark:text-${entry.rank.color}-400`}>
                            {entry.rank.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-orange-600 dark:text-orange-400">{entry.points}</div>
                        <div className="text-xs text-gray-500">Insight Points</div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-gray-500 py-4">Be the first warrior to help others!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Divyastra Vault Tab */}
        {activeTab === 'divyastra' && (
          <div className="rounded-2xl border-2 border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-900 p-8 text-center shadow-xl">
            <Sparkles size={48} className="mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Divyastra Vault Coming Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              A curated collection of the most powerful shortcuts, ranked by community success rate
            </p>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-yellow-300 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 p-8">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 mb-2 flex items-center gap-3">
                <Trophy size={32} />
                Hall of Warriors
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                The most distinguished mentors of the Kurukshetra
              </p>
            </div>

            <div className="grid gap-4">
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.name}
                  className={`rounded-2xl border-2 p-6 ${
                    idx === 0 ? 'border-yellow-400 dark:border-yellow-600 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 shadow-2xl shadow-yellow-500/20' :
                    idx === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-xl' :
                    idx === 2 ? 'border-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 shadow-xl' :
                    'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl font-black ${
                        idx === 0 ? 'text-yellow-500' :
                        idx === 1 ? 'text-gray-400' :
                        idx === 2 ? 'text-amber-600' :
                        'text-gray-400'
                      }`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{entry.name}</div>
                        <div className={`inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full text-sm font-bold text-white bg-gradient-to-r from-${entry.rank.color}-500 to-${entry.rank.color}-600`}>
                          <Shield size={14} />
                          {entry.rank.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black text-orange-600 dark:text-orange-400">{entry.points}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Insight Points</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sena Hub Tab */}
        {activeTab === 'sena' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-8">
              <Flag size={48} className="text-purple-600 dark:text-purple-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Join a Sena
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Form alliances with 50 warriors. Get private doubt support, clan wars, and exclusive perks.
              </p>
              <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:scale-105 transform transition-all shadow-lg">
                Create Your Sena
              </button>
            </div>

            <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-8">
              <Users size={48} className="text-blue-600 dark:text-blue-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Sena Features
              </h2>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" />
                  Private doubt channel
                </li>
                <li className="flex items-center gap-2">
                  <Trophy size={16} className="text-blue-600" />
                  Weekly clan wars
                </li>
                <li className="flex items-center gap-2">
                  <Crown size={16} className="text-blue-600" />
                  Exclusive cosmetics
                </li>
                <li className="flex items-center gap-2">
                  <Star size={16} className="text-blue-600" />
                  Clan XP progression
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Chakravyuh Tab */}
        {activeTab === 'chakravyuh' && (
          <div className="rounded-2xl border-2 border-red-300 dark:border-red-700 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 p-8 text-center shadow-xl">
            <Target size={64} className="mx-auto text-red-600 dark:text-red-400 mb-4" />
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 mb-4">
              Daily Chakravyuh Challenge
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg">
              Nightly 2-minute challenge at midnight. Accuracy + speed = glory.
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-bold text-lg">
              <Flame size={20} />
              Event starts in 8h 45m
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CommunityPage