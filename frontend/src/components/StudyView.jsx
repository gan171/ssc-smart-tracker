import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Pencil, Save, X, Plus, Minus, Maximize2, Minimize2, BookOpen, StickyNote, Sparkles, Eye, EyeOff } from 'lucide-react'

// KaTeX for LaTeX rendering
const KATEX_CDN = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'
const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'

const TOPICS = {
  Math: ['Percentage', 'Ratio and Proportion', 'Algebra', 'Geometry', 'Trigonometry'],
  English: ['Grammar', 'Vocabulary', 'Comprehension', 'Error Spotting', 'Cloze Test'],
  Reasoning: ['Analogy', 'Series', 'Coding-Decoding', 'Syllogism', 'Puzzle'],
  GK: ['History', 'Geography', 'Polity', 'Economy', 'Current Affairs'],
  Computer: ['Hardware', 'Software', 'Networking', 'MS Office', 'Internet']
}

const OPTION_COLORS = {
  A: { bg: 'bg-violet-500/15', border: 'border-violet-500/40', text: 'text-violet-300', badge: 'bg-violet-500' },
  B: { bg: 'bg-sky-500/15',    border: 'border-sky-500/40',    text: 'text-sky-300',    badge: 'bg-sky-500' },
  C: { bg: 'bg-amber-500/15',  border: 'border-amber-500/40',  text: 'text-amber-300',  badge: 'bg-amber-500' },
  D: { bg: 'bg-rose-500/15',   border: 'border-rose-500/40',   text: 'text-rose-300',   badge: 'bg-rose-500' },
}

// ── KaTeX loader (singleton) ──────────────────────────────────────────────────
let katexLoaded = false
let katexLoading = null

function loadKatex() {
  if (katexLoaded) return Promise.resolve()
  if (katexLoading) return katexLoading

  katexLoading = new Promise((resolve) => {
    // Load CSS
    if (!document.querySelector(`link[href="${KATEX_CSS}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = KATEX_CSS
      document.head.appendChild(link)
    }
    // Load JS
    const script = document.createElement('script')
    script.src = KATEX_CDN
    script.onload = () => { katexLoaded = true; resolve() }
    script.onerror = () => resolve() // graceful fail
    document.head.appendChild(script)
  })
  return katexLoading
}

// ── LaTeX renderer ────────────────────────────────────────────────────────────
function LatexText({ text, className = '' }) {
  const ref = useRef(null)
  const [rendered, setRendered] = useState('')

  useEffect(() => {
    if (!text) return
    loadKatex().then(() => {
      if (!window.katex) { setRendered(text); return }
      try {
        // Replace $...$ and $$...$$ with rendered HTML
        let html = text
          .replace(/\$\$(.+?)\$\$/gs, (_, expr) => {
            try { return window.katex.renderToString(expr, { displayMode: true, throwOnError: false }) }
            catch { return `<code>${expr}</code>` }
          })
          .replace(/\$(.+?)\$/g, (_, expr) => {
            try { return window.katex.renderToString(expr, { displayMode: false, throwOnError: false }) }
            catch { return `<code>${expr}</code>` }
          })
          // Also handle \(...\) and \[...\]
          .replace(/\\\[(.+?)\\\]/gs, (_, expr) => {
            try { return window.katex.renderToString(expr, { displayMode: true, throwOnError: false }) }
            catch { return `<code>${expr}</code>` }
          })
          .replace(/\\\((.+?)\\\)/g, (_, expr) => {
            try { return window.katex.renderToString(expr, { displayMode: false, throwOnError: false }) }
            catch { return `<code>${expr}</code>` }
          })
        setRendered(html)
      } catch {
        setRendered(text)
      }
    })
  }, [text])

  if (!rendered) return <span className={className}>{text}</span>
  return <span className={className} dangerouslySetInnerHTML={{ __html: rendered }} />
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, accent = 'amber', defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const accentMap = {
    amber: 'text-amber-400 border-amber-400/30',
    violet: 'text-violet-400 border-violet-400/30',
    sky: 'text-sky-400 border-sky-400/30',
    emerald: 'text-emerald-400 border-emerald-400/30',
  }
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors group"
      >
        <Icon size={16} className={accentMap[accent].split(' ')[0]} />
        <span className="font-semibold text-slate-200 tracking-wide text-sm uppercase flex-1">{title}</span>
        <span className={`text-xs font-mono transition-transform duration-200 text-slate-500 ${open ? 'rotate-0' : '-rotate-90'}`}>▾</span>
      </button>
      {open && <div className={`border-t border-white/8 ${accentMap[accent].split(' ')[1]}`}>{children}</div>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
function StudyView({ question, isOpen, onClose, onPrev, onNext, hasPrev, hasNext, onDelete, onSave, onAddNote }) {
  const [editMode, setEditMode] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [imgFullscreen, setImgFullscreen] = useState(false)
  const [draftNote, setDraftNote] = useState('')
  const [form, setForm] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!question) return
    setDraftNote(question.manual_notes || '')
    setForm({
      question_text: question.question_text || '',
      options: (question.options || []).map(opt => opt.text || ''),
      correct_option: question.correct_option || 'A',
      subject: question.subject || 'Math',
      topic: question.topic || ''
    })
    setEditMode(false)
    setShowAnswer(false)
  }, [question])

  if (!isOpen || !question || !form) return null

  const options = ['A', 'B', 'C', 'D']
  const subjectColors = {
    Math: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    English: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    Reasoning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    GK: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Computer: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  }
  const subjectColor = subjectColors[question.subject] || subjectColors.Math

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0f1623 50%, #0d1117 100%)' }}>

      {/* Subtle grain overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

      {/* Top nav bar */}
      <div className="sticky top-0 z-20 border-b border-white/8 backdrop-blur-xl"
        style={{ background: 'rgba(13, 17, 23, 0.85)' }}>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">

          {/* Left: nav + meta */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={onPrev} disabled={!hasPrev}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={18} />
              </button>
              <button onClick={onNext} disabled={!hasNext}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="h-5 w-px bg-white/10" />
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${subjectColor}`}>
              {question.subject}
            </span>
            {question.topic && (
              <span className="text-xs text-slate-500 font-mono">{question.topic}</span>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setEditMode(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                editMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/8 border border-transparent'
              }`}>
              <Pencil size={12} />{editMode ? 'Editing' : 'Edit'}
            </button>
            <button onClick={() => onDelete(question)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent transition-all">
              <Trash2 size={12} />Delete
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-5 py-8 space-y-5">

        {/* ── Question card ── */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">Question</span>
            </div>

            {editMode ? (
              <div className="space-y-4">
                <textarea
                  className="w-full bg-white/5 border border-white/12 rounded-xl p-4 text-slate-200 text-base leading-relaxed resize-none focus:outline-none focus:border-amber-400/50 focus:bg-white/8 transition-all font-mono text-sm"
                  value={form.question_text}
                  onChange={e => setForm({ ...form, question_text: e.target.value })}
                  rows={5}
                  placeholder="Enter question text (LaTeX supported: use $...$ or $$...$$)"
                />
                <div className="space-y-2">
                  {options.map((label, idx) => {
                    const c = OPTION_COLORS[label]
                    return (
                      <div key={label} className={`flex items-center gap-3 border ${c.border} ${c.bg} rounded-xl px-4 py-2`}>
                        <span className={`text-xs font-bold w-5 text-center ${c.text}`}>{label}</span>
                        <div className="w-px h-4 bg-white/10" />
                        <input
                          className="flex-1 bg-transparent text-slate-200 text-sm outline-none placeholder-slate-600"
                          value={form.options[idx] || ''}
                          onChange={e => {
                            const next = [...form.options]
                            next[idx] = e.target.value
                            setForm({ ...form, options: next })
                          }}
                          placeholder={`Option ${label}`}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Correct Answer', key: 'correct_option', opts: options },
                    { label: 'Subject', key: 'subject', opts: Object.keys(TOPICS) },
                  ].map(({ label, key, opts }) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-500 mb-1">{label}</label>
                      <select
                        value={form[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-amber-400/50"
                      >
                        {opts.map(o => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Topic</label>
                    <input
                      list="topic-list"
                      value={form.topic}
                      onChange={e => setForm({ ...form, topic: e.target.value })}
                      className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-amber-400/50"
                      placeholder="Topic"
                    />
                    <datalist id="topic-list">
                      {(TOPICS[form.subject] || []).map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-semibold rounded-xl text-sm transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                    onClick={async () => {
                      setSaving(true)
                      await onSave(question.id, {
                        ...form,
                        options: form.options.map((text, idx) => ({ label: options[idx], text }))
                      })
                      setSaving(false)
                      setEditMode(false)
                    }}
                  >
                    <Save size={13} />{saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-slate-100 text-[17px] leading-relaxed font-medium mb-6">
                  <LatexText text={question.question_text} />
                </p>

                {/* Options grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {(question.options || []).map(opt => {
                    const c = OPTION_COLORS[opt.label] || OPTION_COLORS.A
                    const isCorrect = question.correct_option === opt.label
                    const isRevealed = showAnswer && isCorrect
                    return (
                      <div key={opt.label}
                        className={`relative flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all duration-300 ${
                          isRevealed
                            ? 'border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.08)]'
                            : `${c.border} ${c.bg} hover:border-opacity-60`
                        }`}>
                        <span className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white mt-0.5 ${
                          isRevealed ? 'bg-emerald-500' : c.badge
                        }`}>
                          {opt.label}
                        </span>
                        <span className={`text-sm leading-relaxed ${isRevealed ? 'text-emerald-200' : 'text-slate-300'}`}>
                          <LatexText text={opt.text} />
                        </span>
                        {isRevealed && (
                          <span className="ml-auto flex-shrink-0 text-emerald-400 text-lg">✓</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Reveal answer toggle */}
                <button
                  onClick={() => setShowAnswer(v => !v)}
                  className={`flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg border transition-all ${
                    showAnswer
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/12 text-slate-500 hover:border-white/20 hover:text-slate-300'
                  }`}>
                  {showAnswer ? <><EyeOff size={12} />Hide Answer</> : <><Eye size={12} />Reveal Answer</>}
                </button>
              </div>
            )}
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent mx-5 my-3" />
        </div>

        {/* ── Screenshot card ── */}
        <SectionCard icon={BookOpen} title="Screenshot" accent="sky">
          <div className="p-5">
            {question.image_url ? (
              <div>
                <div className="flex justify-end gap-2 mb-3">
                  {[
                    { icon: Minus, action: () => setZoom(z => Math.max(0.4, z - 0.2)), label: 'Zoom out' },
                    { icon: Plus, action: () => setZoom(z => Math.min(3, z + 0.2)), label: 'Zoom in' },
                    { icon: imgFullscreen ? Minimize2 : Maximize2, action: () => setImgFullscreen(v => !v), label: 'Fullscreen' },
                  ].map(({ icon: Icon, action, label }) => (
                    <button key={label} onClick={action} title={label}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all">
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
                <div className={`overflow-auto rounded-xl ${imgFullscreen ? 'fixed inset-6 z-[70] bg-black/95 flex items-center justify-center p-6' : ''}`}>
                  <img
                    src={question.image_url}
                    alt="question screenshot"
                    style={{ transform: `scale(${zoom})`, transformOrigin: imgFullscreen ? 'center' : 'top left', transition: 'transform 0.2s' }}
                    className="max-w-full rounded-lg"
                  />
                  {imgFullscreen && (
                    <button onClick={() => setImgFullscreen(false)}
                      className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-3 py-10 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-sky-400/40 hover:bg-sky-500/5 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-sky-500/10 transition-all">
                  <Plus size={20} className="text-slate-500 group-hover:text-sky-400" />
                </div>
                <span className="text-sm text-slate-500 group-hover:text-sky-400 transition-colors">Click to attach screenshot</span>
                <input type="file" className="hidden" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = async () => onSave(question.id, { image_url: reader.result })
                  reader.readAsDataURL(file)
                }} />
              </label>
            )}
          </div>
        </SectionCard>

        {/* ── Gemini Analysis card ── */}
        <SectionCard icon={Sparkles} title="Gemini Analysis" accent="violet">
          <div className="p-5">
            {question?.content?.detailed_analysis ? (
              <div className="text-slate-300 text-sm leading-relaxed">
                <LatexText text={question.content.detailed_analysis} />
              </div>
            ) : (
              <p className="text-slate-600 text-sm italic">No analysis available for this question.</p>
            )}
          </div>
        </SectionCard>

        {/* ── Notes card ── */}
        <SectionCard icon={StickyNote} title="My Notes" accent="emerald">
          <div className="p-5 space-y-3">
            <textarea
              value={draftNote}
              onChange={e => setDraftNote(e.target.value)}
              rows={4}
              placeholder="Add your notes, mnemonics, or observations here…"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-slate-200 text-sm leading-relaxed resize-none focus:outline-none focus:border-emerald-400/40 focus:bg-white/7 transition-all placeholder-slate-700"
            />
            <div className="flex justify-end">
              <button
                onClick={() => onAddNote(question.id, draftNote)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm font-medium transition-all">
                <Save size={12} />Save Note
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Bottom spacing */}
        <div className="h-12" />
      </div>
    </div>
  )
}

export default StudyView