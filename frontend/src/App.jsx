import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import Auth from './Auth'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import {
  Upload, Loader2, Brain, History, Moon, Sun, LogOut, User,
  Filter, CheckCircle, Circle, XCircle, FileText, TrendingUp
} from 'lucide-react'

function App() {
  const API_BASE_URL = 'http://127.0.0.1:8000'; // Change back to Render URL for production
  const { user, signOut, loading: authLoading } = useAuth()

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Data States
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [mistakes, setMistakes] = useState([])
  const [error, setError] = useState(null)

  // Filter States
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  // Bulk Upload States
  const [bulkFiles, setBulkFiles] = useState([])
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [isBulkUploading, setIsBulkUploading] = useState(false)

  const SUBJECTS = ['All', 'English', 'GK', 'Math', 'Reasoning']

  // Theme Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Fetch History when user logs in
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
        .limit(100)

      if (error) throw error

      console.log('📊 Fetched questions:', data.length)
      console.log('📊 Questions with null user_id:', data.filter(q => !q.user_id).length)

      setMistakes(data || [])
    } catch (err) {
      console.error("Failed to fetch history", err)
      setMistakes([])
    }
  }

  // Single File Upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setAnalysis(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Get fresh session for this upload
      const { data: { session } } = await supabase.auth.getSession()

      console.log('🔐 Session for upload:', {
        hasToken: !!session?.access_token,
        userId: session?.user?.id
      })

      const response = await fetch(`${API_BASE_URL}/upload-screenshot/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed:', errorText)
        throw new Error('Upload failed')
      }

      const result = await response.json()
      console.log('✅ Upload result:', result)
      setAnalysis(result.data)

      // Wait a bit before fetching to ensure DB is updated
      setTimeout(fetchHistory, 500)
    } catch (err) {
      setError("Failed to analyze image. Please try again.")
      console.error('Upload error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Bulk Upload Handler - IMPROVED
  const handleBulkUpload = async (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    console.log(`📤 Starting bulk upload of ${files.length} files`)

    setBulkFiles(files)
    setIsBulkUploading(true)
    setBulkProgress({ current: 0, total: files.length })
    setError(null)

    const results = {
      success: 0,
      failed: 0,
      errors: []
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        setBulkProgress({ current: i + 1, total: files.length })
        console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name}`)

        // Get FRESH session for EACH upload
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.access_token) {
          console.error('❌ Session error:', sessionError)
          throw new Error('Authentication failed')
        }

        console.log('🔐 Using token for file', i + 1, '- User:', session.user.id)

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_BASE_URL}/upload-screenshot/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}` // Fresh token for each request
          },
          body: formData
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ Failed to upload ${file.name}:`, errorText)
          results.failed++
          results.errors.push({ file: file.name, error: errorText })
        } else {
          const result = await response.json()
          console.log(`✅ Successfully uploaded ${file.name}, ID:`, result.id)
          results.success++
        }

        // Longer delay between uploads to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (err) {
        console.error(`❌ Error uploading ${file.name}:`, err)
        results.failed++
        results.errors.push({ file: file.name, error: err.message })
      }
    }

    console.log('📊 Bulk upload complete:', results)

    if (results.failed > 0) {
      setError(`Upload complete: ${results.success} succeeded, ${results.failed} failed`)
    }

    setIsBulkUploading(false)
    setBulkFiles([])

    // Wait for DB to settle before fetching
    setTimeout(fetchHistory, 1500)
  }

  // Toggle Analysis Status
  const toggleAnalysisStatus = async (questionId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'analyzed' ? 'unanalyzed' : 'analyzed'

      const { error } = await supabase
        .from('questions')
        .update({ status: newStatus })
        .eq('id', questionId)
        .eq('user_id', user.id)

      if (error) throw error

      fetchHistory()
    } catch (err) {
      console.error('Failed to update status:', err)
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

  // Filter mistakes
  const filteredMistakes = mistakes.filter(m => {
    const subjectMatch = selectedSubject === 'All' || m.subject === selectedSubject
    const statusMatch = selectedStatus === 'All' || m.status === selectedStatus
    return subjectMatch && statusMatch
  })

  // Subject counts
  const subjectCounts = SUBJECTS.reduce((acc, subject) => {
    if (subject === 'All') {
      acc[subject] = mistakes.length
    } else {
      acc[subject] = mistakes.filter(m => m.subject === subject).length
    }
    return acc
  }, {})

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
      <div className="w-full max-w-6xl">

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

        {/* UPLOAD SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

          {/* Single Upload */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Upload size={20} />
              Single Upload
            </h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-gray-800 hover:border-blue-400 transition-all group">
              <input type="file" hidden onChange={handleFileUpload} accept="image/*" />
              <div className="flex flex-col items-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Click to Upload
                    </span>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Bulk Upload */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <FileText size={20} />
              Bulk Upload
            </h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl cursor-pointer bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:border-purple-400 transition-all group">
              <input type="file" hidden onChange={handleBulkUpload} accept="image/*" multiple disabled={isBulkUploading} />
              <div className="flex flex-col items-center gap-2">
                {isBulkUploading ? (
                  <>
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                    <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      {bulkProgress.current} / {bulkProgress.total}
                    </span>
                  </>
                ) : (
                  <>
                    <FileText size={32} className="text-purple-400 group-hover:text-purple-500 transition-colors" />
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                      Upload Multiple
                    </span>
                  </>
                )}
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-center mb-8">
            {error}
          </div>
        )}

        {/* CURRENT ANALYSIS */}
        {analysis && (
          <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

        {/* SUBJECT TABS */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <History className="text-gray-400" size={24} />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Your Mistake Bank
            </h2>
          </div>

          {/* Subject Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {SUBJECTS.map(subject => (
              <button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedSubject === subject
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                {subject} <span className="text-sm opacity-75">({subjectCounts[subject] || 0})</span>
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStatus('All')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedStatus === 'All'
                  ? 'bg-gray-700 dark:bg-gray-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('analyzed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                selectedStatus === 'analyzed'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <CheckCircle size={16} />
              Analyzed
            </button>
            <button
              onClick={() => setSelectedStatus('unanalyzed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                selectedStatus === 'unanalyzed'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Circle size={16} />
              Unanalyzed
            </button>
          </div>
        </div>

        {/* MISTAKE CARDS */}
        {filteredMistakes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <History size={48} className="mx-auto mb-4 opacity-50" />
            <p>
              {selectedSubject === 'All' && selectedStatus === 'All'
                ? 'No mistakes logged yet. Upload your first screenshot! 📸'
                : `No ${selectedStatus !== 'All' ? selectedStatus : ''} mistakes found in ${selectedSubject}.`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {filteredMistakes.map((m) => (
              <div
                key={m.id}
                className="group bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 h-52 flex flex-col"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-medium text-gray-400">
                    {new Date(m.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-700">
                      {m.subject}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleAnalysisStatus(m.id, m.status)
                      }}
                      className="hover:scale-110 transition-transform"
                      title={m.status === 'analyzed' ? 'Mark as Unanalyzed' : 'Mark as Analyzed'}
                    >
                      {m.status === 'analyzed' ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <Circle size={18} className="text-orange-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => {
                    if (m.content) {
                      setAnalysis(m.content)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  }}
                  className="relative flex-1 overflow-hidden cursor-pointer"
                >
                  <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-5">
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
  )
}

export default App