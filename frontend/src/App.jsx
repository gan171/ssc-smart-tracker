import { useState, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Upload, Loader2, BookOpen, Brain, History } from 'lucide-react'
import './App.css'

function App() {
    const API_BASE_URL = 'https://ssc-smart-tracker.onrender.com';
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [mistakes, setMistakes] = useState([]) // Store history
  const [error, setError] = useState(null)

  // 1. Fetch History on Load
  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      // Use the template literal correctly with backticks
      const res = await axios.get(`${API_BASE_URL}/mistakes/`)

      // SAFETY CHECK: Only set mistakes if the response is actually an Array
      if (Array.isArray(res.data)) {
        setMistakes(res.data)
      } else {
        console.error("API returned non-array data:", res.data)
        setMistakes([]) // Fallback to empty list so app doesn't crash
      }
    } catch (err) {
      console.error("Failed to fetch history", err)
      setMistakes([]) // Fallback on error
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
      const response = await axios.post(`\${API_BASE_URL}/upload-screenshot/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setAnalysis(response.data.data)
      fetchHistory() // Refresh the list after upload!
    } catch (err) {
      setError("Failed to analyze image. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  // Helper to render math text
  const RenderText = ({ content }) => (
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {content}
    </ReactMarkdown>
  )

  return (
    <div className="container">
      <h1>SSC CGL Smart Tracker 🎯</h1>

      {/* --- UPLOAD SECTION --- */}
      <div className="card">
        <label className="upload-box">
          <input type="file" hidden onChange={handleFileUpload} accept="image/*" />
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'}}>
            {loading ? <Loader2 className="animate-spin" size={48} color="#3b82f6"/> : <Upload size={48} color="#9ca3af" />}
            <span style={{fontSize: '1.2rem', fontWeight: 500}}>
              {loading ? "Asking the Cocky Teacher..." : "Click to Upload Screenshot"}
            </span>
          </div>
        </label>
      </div>

      {error && <div className="card" style={{color: 'red', textAlign: 'center'}}>{error}</div>}

      {/* --- CURRENT ANALYSIS --- */}
      {analysis && (
        <div className="results fade-in">
          <div className="card" style={{borderLeft: '5px solid #3b82f6'}}>
            <span className="tag" style={{background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '4px'}}>
              {analysis.subject}
            </span>
            <h2>Question</h2>
            <RenderText content={analysis.question_text} />
          </div>

          <div className="card">
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem'}}>
              <Brain color="#ea580c" />
              <h2>Gemini's Analysis</h2>
            </div>
            <div style={{lineHeight: '1.6'}}>
              <RenderText content={analysis.detailed_analysis} />
            </div>
          </div>
        </div>
      )}

      {/* --- MISTAKE BANK (HISTORY) --- */}
      <div style={{marginTop: '3rem', paddingBottom: '2rem'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem'}}>
          <History size={24} />
          <h2>Your Mistake Bank ({mistakes.length})</h2>
        </div>

        <div className="grid">
          {Array.isArray(mistakes) && mistakes.map((m) => (
            <div
              key={m.id}
              className="card history-card"
              onClick={() => {
                // 1. Check if content exists before setting
                if (m.content) {
                  setAnalysis(m.content)
                  // 2. AUTO-SCROLL TO TOP so you can see the result!
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                  alert("This old mistake doesn't have the full analysis saved.")
                }
              }}
              style={{cursor: 'pointer'}} // Make it obvious it's clickable
            >
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <span style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#6b7280'}}>
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
                <span style={{background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'}}>
                  {m.subject}
                </span>
              </div>

              {/* 3. FIX: Use RenderText to show Math ($x^2$) properly */}
              <div style={{
                fontSize: '0.95rem',
                color: '#374151',
                maxHeight: '80px',       // Limit height
                overflow: 'hidden',      // Hide extra text
                position: 'relative'
              }}>
                <RenderText content={m.question_text} />

                {/* Fade out effect at the bottom of the card */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '30px', background: 'linear-gradient(transparent, white)'
                }} />
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App