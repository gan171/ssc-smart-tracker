import { useEffect, useMemo, useState } from 'react'
import { MessageSquareWarning, ThumbsUp, Trophy, Users, Swords, Shield } from 'lucide-react'

const seedPosts = [
  {
    id: 'post-1',
    questionText: 'A train crosses a pole in 12s and a platform in 20s. Find platform length if speed is 54 km/h.',
    topic: 'Quant',
    scope: 'global',
    author: 'Arjuna_17',
    createdAt: new Date().toISOString(),
    answers: [
      {
        id: 'ans-1',
        author: 'Dronacharya_Math',
        title: 'Dronacharya',
        text: '54 km/h = 15 m/s. Train length = 12×15 = 180m. Platform+train = 20×15 = 300m. Platform = 120m.',
        upvotes: 12
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
  const [questionText, setQuestionText] = useState('')
  const [topic, setTopic] = useState('General')
  const [scope, setScope] = useState('global')
  const [draftAnswers, setDraftAnswers] = useState({})


  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(posts))
  }, [posts, storageKey])

  const leaderboard = useMemo(() => {
    const pointsByUser = {}
    posts.forEach((post) => {
      post.answers.forEach((answer) => {
        pointsByUser[answer.author] = (pointsByUser[answer.author] || 0) + answer.upvotes
      })
    })

    return Object.entries(pointsByUser)
      .map(([name, points]) => ({ name, points }))
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
      createdAt: new Date().toISOString(),
      answers: []
    }

    setPosts((prev) => [newPost, ...prev])
    setQuestionText('')
    setTopic('General')
    setScope('global')
  }

  const addAnswer = (postId) => {
    const text = (draftAnswers[postId] || '').trim()
    if (!text) return

    const currentUser = user?.email?.split('@')[0] || 'Yoddha'
    const title = 'Yoddha'

    setPosts((prev) => prev.map((post) => {
      if (post.id !== postId) return post
      return {
        ...post,
        answers: [
          {
            id: crypto.randomUUID(),
            author: currentUser,
            title,
            text,
            upvotes: 0
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20 p-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquareWarning size={22} /> Community Tab · Sankat Mochan
        </h1>
        <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-2">
          AI-free zone: only human discussions, shortcuts (Divyastra), upvotes, and Sena collaboration.
        </p>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Raise a Sankat Flare</h2>
          <form onSubmit={addSankatPost} className="space-y-3">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
              rows={3}
              placeholder="Post your stuck question..."
            />
            <div className="grid sm:grid-cols-3 gap-3">
              <select value={topic} onChange={(e) => setTopic(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                <option>General</option>
                <option>Quant</option>
                <option>Reasoning</option>
                <option>English</option>
                <option>GK</option>
              </select>
              <select value={scope} onChange={(e) => setScope(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                <option value="global">Global feed</option>
                <option value="sena">Only my Sena</option>
              </select>
              <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Ask Community</button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Trophy size={17} /> Insight Leaderboard</h2>
          <div className="mt-3 space-y-2 text-sm">
            {leaderboard.length > 0 ? leaderboard.map((entry, idx) => (
              <div key={entry.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <span>#{idx + 1} {entry.name}</span>
                <strong>{entry.points} IP</strong>
              </div>
            )) : <p className="text-gray-500">No points yet. Be the first mentor.</p>}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Live Sankat Feed</h2>
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{post.scope === 'sena' ? 'Sena-only' : 'Global'} · {post.topic}</span>
                <span>{new Date(post.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">{post.questionText}</p>
              <p className="text-xs text-gray-500 mt-1">Asked by {post.author}</p>

              <div className="mt-3 space-y-2">
                {post.answers.map((answer) => (
                  <div
                    key={answer.id}
                    className={`rounded-lg border p-3 ${answer.title === 'Dronacharya' ? 'border-yellow-400 bg-yellow-50/70 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{answer.author} · {answer.title}</span>
                      <button onClick={() => upvoteAnswer(post.id, answer.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700">
                        <ThumbsUp size={12} /> {answer.upvotes}
                      </button>
                    </div>
                    <p className="text-sm mt-1 text-gray-800 dark:text-gray-200">{answer.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={draftAnswers[post.id] || ''}
                  onChange={(e) => setDraftAnswers((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm"
                  placeholder="Share your shortcut / handwritten logic text"
                />
                <button onClick={() => addAnswer(post.id)} className="px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 text-sm">Post</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Swords size={16} /> Chakravyuh (Daily Gauntlet)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Nightly 2-minute challenge and clan score battles. Event scheduling hooks can be connected next.</p>
        </section>
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Shield size={16} /> Sena Hub</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Create/join a Sena, run private Sankat support, and climb weekly clan rankings.</p>
          <div className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
            <Users size={12} /> Max 50 members per Sena
          </div>
        </section>
      </div>
    </div>
  )
}

export default CommunityPage
