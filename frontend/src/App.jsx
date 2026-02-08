import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import Auth from './Auth'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Upload, Loader2, Brain, History, Moon, Sun, LogOut, User } from 'lucide-react'

function App() {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ssc-smart-tracker.onrender.com';
  const { user, signOut, loading: authLoading } = useAuth()

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [mistakes, setMistakes] = useState([])
  const [error, setError] = useState(null)

  // 1. Theme Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // 2. Fetch History when user logs in
  useEffect(() => {
    if (user) {
      fetchHistory()
    }
  }, [user])

  const fetchHistory = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setMistakes(data || [])
    } catch (err) {
      console.error("Failed to fetch history", err)
      setMistakes([])
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setAnalysis(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      // 🔍 ADD THESE DEBUG LOGS:
        console.log('=== DEBUG ===')
        console.log('Session:', session)
        console.log('Token exists:', !!session?.access_token)
        console.log('Token preview:', session?.access_token?.substring(0, 30))
        console.log('=============')

      const response = await fetch(`${API_BASE_URL}/upload-screenshot/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const result = await response.json()
      setAnalysis(result.data)
      fetchHistory()
    } catch (err) {
      setError("Failed to analyze image. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setMistakes([])
      setAnalysis(null)
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  const RenderText = ({ content }) => (
    <div className="text-gray-800 dark:text-gray-200 leading-relaxed space-y-2">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  )

  // Show auth screen if not logged in
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950 transition-colors duration-300 py-8 px-4 flex justify-center">
      <div className="w-full max-w-3xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
              SSC Smart Tracker 🎯
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <User size={14} />
              {user.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:shadow-md transition-all cursor-pointer"
            >
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:shadow-md hover:text-red-500 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>

        {/* --- UPLOAD SECTION --- */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-gray-800 hover:border-blue-400 transition-all group">
            <input type="file" hidden onChange={handleFileUpload} accept="image/*" />
            <div className="flex flex-col items-center gap-3">
              {loading ? (
                <Loader2 className="animate-spin text-blue-500" size={48} />
              ) : (
                <Upload size={48} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              )}
              <span className="text-lg font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {loading ? "Analyzing with Gemini..." : "Click to Upload Screenshot"}
              </span>
            </div>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-center mb-8">
            {error}
          </div>
        )}

        {/* --- CURRENT ANALYSIS --- */}
        {analysis && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Question Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border-l-8 border-blue-500 p-6">
              <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm font-semibold rounded-md">
                  {analysis.subject}
                </span>
                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-md border border-gray-200 dark:border-gray-700">
                  {analysis.topic}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Question</h2>
              <div className="text-gray-700 dark:text-gray-200 text-lg">
                <RenderText content={analysis.question_text} />
              </div>
            </div>

            {/* Analysis Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                <Brain className="text-orange-500" size={28} />
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Gemini's Analysis</h2>
              </div>
              <div className="leading-relaxed">
                <RenderText content={analysis.detailed_analysis} />
              </div>
            </div>
          </div>
        )}

        {/* --- MISTAKE BANK --- */}
        <div className="mt-16 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <History className="text-gray-400" size={24} />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Your Mistake Bank <span className="text-gray-400 text-lg">({mistakes.length})</span>
            </h2>
          </div>

          {mistakes.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <History size={48} className="mx-auto mb-4 opacity-50" />
              <p>No mistakes logged yet. Upload your first screenshot! 📸</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mistakes.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    if (m.content) {
                      setAnalysis(m.content)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    } else {
                      alert("Old format - no analysis saved")
                    }
                  }}
                  className="group bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-200 h-44 flex flex-col"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium text-gray-400">
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-700">
                      {m.subject}
                    </span>
                  </div>

                  <div className="relative flex-1 overflow-hidden">
                    <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4">
                      <RenderText content={m.question_text} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default App