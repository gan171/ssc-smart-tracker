import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Pencil, Save, X, Plus, Minus, Maximize, Minimize } from 'lucide-react'

const TOPICS = {
  Math: ['Percentage', 'Ratio and Proportion', 'Algebra', 'Geometry', 'Trigonometry'],
  English: ['Grammar', 'Vocabulary', 'Comprehension', 'Error Spotting', 'Cloze Test'],
  Reasoning: ['Analogy', 'Series', 'Coding-Decoding', 'Syllogism', 'Puzzle'],
  GK: ['History', 'Geography', 'Polity', 'Economy', 'Current Affairs'],
  Computer: ['Hardware', 'Software', 'Networking', 'MS Office', 'Internet']
}

function StudyView({ question, isOpen, onClose, onPrev, onNext, hasPrev, hasNext, onDelete, onSave, onAddNote }) {
  const [editMode, setEditMode] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [imgFullscreen, setImgFullscreen] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(true)
  const [showNotes, setShowNotes] = useState(true)
  const [draftNote, setDraftNote] = useState('')
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (!question) return
    setDraftNote(question.manual_notes || '')
    setForm({
      question_text: question.question_text || '',
      options: (question.options || []).map((opt) => opt.text || ''),
      correct_option: question.correct_option || 'A',
      subject: question.subject || 'Math',
      topic: question.topic || ''
    })
    setEditMode(false)
  }, [question])

  if (!isOpen || !question || !form) return null

  const imageClass = imgFullscreen
    ? 'fixed inset-0 z-[70] bg-black/95 p-6 flex items-center justify-center'
    : 'mb-4'

  const options = ['A', 'B', 'C', 'D']

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 overflow-y-auto">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 border-b p-4 flex justify-between">
        <div className="flex gap-2 items-center">
          <button onClick={onPrev} disabled={!hasPrev}><ChevronLeft /></button>
          <button onClick={onNext} disabled={!hasNext}><ChevronRight /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditMode((v) => !v)} className="px-3 py-1 border rounded flex items-center gap-1"><Pencil size={14}/>Edit</button>
          <button onClick={() => onDelete(question)} className="px-3 py-1 border rounded text-red-600 flex items-center gap-1"><Trash2 size={14}/>Delete</button>
          <button onClick={onClose}><X /></button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {editMode ? (
          <div className="space-y-3 border rounded-xl p-4">
            <textarea className="w-full border rounded p-2" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} rows={4} />
            {options.map((label, idx) => (
              <input key={label} className="w-full border rounded p-2" value={form.options[idx] || ''} onChange={(e) => {
                const next = [...form.options]
                next[idx] = e.target.value
                setForm({ ...form, options: next })
              }} placeholder={`Option ${label}`} />
            ))}
            <div className="grid md:grid-cols-3 gap-3">
              <select value={form.correct_option} onChange={(e) => setForm({ ...form, correct_option: e.target.value })} className="border rounded p-2">
                {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="border rounded p-2">
                {Object.keys(TOPICS).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <>
                <input list="topic-list" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="border rounded p-2" placeholder="Topic" />
                <datalist id="topic-list">
                  {(TOPICS[form.subject] || []).map((t) => <option key={t} value={t} />)}
                </datalist>
              </>
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-1" onClick={async () => {
                await onSave(question.id, {
                  ...form,
                  options: form.options.map((text, idx) => ({ label: options[idx], text }))
                })
                setEditMode(false)
              }}><Save size={14}/>Save</button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{question.question_text}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(question.options || []).map((opt) => <div key={opt.label} className={`p-3 border rounded ${question.correct_option === opt.label ? 'border-green-500' : ''}`}>{opt.label}. {opt.text}</div>)}
            </div>
          </>
        )}

        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Screenshot</h3>
            {question.image_url && <div className="flex gap-2"><button onClick={() => setZoom((z) => z + 0.2)}><Plus size={14}/></button><button onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}><Minus size={14}/></button><button onClick={() => setImgFullscreen((v) => !v)}>{imgFullscreen ? <Minimize size={14}/> : <Maximize size={14}/>}</button></div>}
          </div>
          {question.image_url ? (
            <div className={imageClass}>
              <img src={question.image_url} alt="question" style={{ transform: `scale(${zoom})` }} className="max-w-full transition-transform" />
            </div>
          ) : (
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = async () => onSave(question.id, { image_url: reader.result })
              reader.readAsDataURL(file)
            }} />
          )}
        </div>

        <div className="border rounded-xl p-4">
          <button className="font-semibold mb-2" onClick={() => setShowAnalysis((v) => !v)}>Gemini Analysis {showAnalysis ? '▾' : '▸'}</button>
          {showAnalysis && <div className="text-sm whitespace-pre-wrap">{question?.content?.detailed_analysis || 'No analysis available.'}</div>}
        </div>

        <div className="border rounded-xl p-4">
          <button className="font-semibold mb-2" onClick={() => setShowNotes((v) => !v)}>Notes {showNotes ? '▾' : '▸'}</button>
          {showNotes && <div className="space-y-2"><textarea value={draftNote} onChange={(e) => setDraftNote(e.target.value)} rows={4} className="w-full border rounded p-2" /><button className="px-3 py-1 bg-yellow-500 text-white rounded" onClick={() => onAddNote(question.id, draftNote)}>Save note</button></div>}
        </div>
      </div>
    </div>
  )
}

export default StudyView
