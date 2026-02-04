import { useState, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Upload, Loader2, Brain, History, Moon, Sun } from 'lucide-react'

function App() {
  const API_BASE_URL = 'https://ssc-smart-tracker.onrender.com';

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [mistakes, setMistakes] = useState([])
  const [error, setError] = useState(null)

  // 1. Theme Effect: Tailwind v4 watches for the 'dark' class on <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // 2. Fetch History on Load
  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/mistakes/`)
      if (Array.isArray(res.data)) {
        setMistakes(res.data)
      } else {
        setMistakes([])
      }
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
      const response = await axios.post(`${API_BASE_URL}/upload-screenshot/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setAnalysis(response.data.data)
      fetchHistory()
    } catch (err) {
      setError("Failed to analyze image. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  const RenderText = ({ content }) => (
    // 'prose' comes from @tailwindcss/typography (optional), but we use standard classes for now to keep it simple
    <div className="text-gray-800 dark:text-gray-200 leading-relaxed space-y-2">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-950 transition-colors duration-300 py-8 px-4 flex justify-center">
      <div className="w-full max-w-3xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
            SSC Smart Tracker 🎯
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:shadow-md transition-all cursor-pointer"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
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
                {loading ? "Asking the Cocky Teacher..." : "Click to Upload Screenshot"}
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
              Mistake Bank <span className="text-gray-400 text-lg">({mistakes.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.isArray(mistakes) && mistakes.map((m) => (
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
                  {/* Fade out effect */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default App