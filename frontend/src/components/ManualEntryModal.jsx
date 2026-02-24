import { useState, useEffect, useRef } from 'react'
import { X, Save, ChevronDown, Sparkles } from 'lucide-react'

const SUBJECTS = ['Math', 'English', 'Reasoning', 'GK', 'Computer']

const TOPICS = {
  Math: ['Percentage', 'Ratio and Proportion', 'Algebra', 'Geometry', 'Trigonometry'],
  English: ['Grammar', 'Vocabulary', 'Comprehension', 'Error Spotting', 'Cloze Test'],
  Reasoning: ['Analogy', 'Series', 'Coding-Decoding', 'Syllogism', 'Puzzle'],
  GK: ['History', 'Geography', 'Polity', 'Economy', 'Current Affairs'],
  Computer: ['Hardware', 'Software', 'Networking', 'MS Office', 'Internet']
}

const OPTION_STYLES = {
  A: { ring: 'ring-violet-500', bg: 'bg-violet-500/15', border: 'border-violet-500/40', badge: 'bg-violet-500', label: 'text-violet-300' },
  B: { ring: 'ring-sky-500',    bg: 'bg-sky-500/15',    border: 'border-sky-500/40',    badge: 'bg-sky-500',    label: 'text-sky-300' },
  C: { ring: 'ring-amber-500',  bg: 'bg-amber-500/15',  border: 'border-amber-500/40',  badge: 'bg-amber-500',  label: 'text-amber-300' },
  D: { ring: 'ring-rose-500',   bg: 'bg-rose-500/15',   border: 'border-rose-500/40',   badge: 'bg-rose-500',   label: 'text-rose-300' },
}

const SUBJECT_ACCENTS = {
  Math:      { pill: 'bg-violet-500/15 text-violet-300 border-violet-500/30', dot: 'bg-violet-400' },
  English:   { pill: 'bg-sky-500/15 text-sky-300 border-sky-500/30',          dot: 'bg-sky-400' },
  Reasoning: { pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',    dot: 'bg-amber-400' },
  GK:        { pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  Computer:  { pill: 'bg-rose-500/15 text-rose-300 border-rose-500/30',       dot: 'bg-rose-400' },
}

// ── Minimal custom select ─────────────────────────────────────────────────────
function StyledSelect({ value, onChange, options, label, renderOption }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find(o => (o.value ?? o) === value)
  const displayLabel = renderOption ? renderOption(selected?.value ?? selected) : (selected?.label ?? selected?.value ?? selected)

  return (
    <div className="relative" ref={ref}>
      {label && <label className="block text-xs text-slate-500 mb-1.5 font-medium">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm text-slate-200 transition-all focus:outline-none focus:border-amber-400/50"
      >
        <span>{displayLabel}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50">
          {options.map(opt => {
            const val = opt.value ?? opt
            const lbl = renderOption ? renderOption(val) : (opt.label ?? val)
            return (
              <button
                key={val}
                type="button"
                onClick={() => { onChange(val); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/8 ${value === val ? 'text-amber-300 bg-amber-500/10' : 'text-slate-300'}`}
              >
                {lbl}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
function ManualEntryModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_option: 'A',
    subject: 'Math',
    topic: ''
  })
  const [saving, setSaving] = useState(false)
  const [activeField, setActiveField] = useState(null)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setForm({ question_text: '', options: ['', '', '', ''], correct_option: 'A', subject: 'Math', topic: '' })
      setSaving(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const accent = SUBJECT_ACCENTS[form.subject] || SUBJECT_ACCENTS.Math
  const labels = ['A', 'B', 'C', 'D']

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
        style={{
          background: 'linear-gradient(145deg, #0f1623 0%, #0d1117 100%)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Sparkles size={14} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Add Question</h2>
              <p className="text-xs text-slate-500 mt-0.5">LaTeX supported — use <code className="text-amber-400/80 bg-white/5 px-1 rounded">$...$</code> for inline math</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Question text */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Question</label>
            <textarea
              rows={4}
              value={form.question_text}
              onChange={e => setForm({ ...form, question_text: e.target.value })}
              onFocus={() => setActiveField('q')}
              onBlur={() => setActiveField(null)}
              placeholder="Type the question here… ($x^2 + y^2 = z^2$ for math)"
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-slate-200 text-sm leading-relaxed resize-none focus:outline-none transition-all placeholder-slate-700 ${
                activeField === 'q' ? 'border-amber-400/50 bg-white/7' : 'border-white/10 hover:border-white/15'
              }`}
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs text-slate-500 mb-2 font-medium">Options</label>
            <div className="space-y-2">
              {labels.map((label, idx) => {
                const s = OPTION_STYLES[label]
                const isCorrect = form.correct_option === label
                return (
                  <div key={label}
                    className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 transition-all duration-200 ${
                      isCorrect
                        ? `${s.border} ${s.bg} ring-1 ${s.ring}/30`
                        : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                    }`}>
                    {/* Correct answer toggle */}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, correct_option: label })}
                      title={`Mark ${label} as correct`}
                      className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white transition-all ${
                        isCorrect ? `${s.badge} shadow-md` : 'bg-white/10 hover:bg-white/15'
                      }`}>
                      {isCorrect ? '✓' : label}
                    </button>
                    <div className="w-px h-4 bg-white/8" />
                    <input
                      value={form.options[idx]}
                      onChange={e => {
                        const next = [...form.options]
                        next[idx] = e.target.value
                        setForm({ ...form, options: next })
                      }}
                      placeholder={`Option ${label}`}
                      className="flex-1 bg-transparent text-slate-200 text-sm outline-none placeholder-slate-700"
                    />
                  </div>
                )
              })}
              <p className="text-xs text-slate-600 pl-1">Click the letter badge to mark the correct answer</p>
            </div>
          </div>

          {/* Subject + Topic */}
          <div className="grid grid-cols-2 gap-3">
            <StyledSelect
              label="Subject"
              value={form.subject}
              onChange={val => setForm({ ...form, subject: val, topic: '' })}
              options={SUBJECTS}
              renderOption={s => (
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${SUBJECT_ACCENTS[s]?.dot}`} />
                  {s}
                </span>
              )}
            />
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Topic</label>
              <input
                list="topic-suggestions"
                value={form.topic}
                onChange={e => setForm({ ...form, topic: e.target.value })}
                placeholder="Select or type…"
                className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-amber-400/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none transition-all placeholder-slate-700"
              />
              <datalist id="topic-suggestions">
                {(TOPICS[form.subject] || []).map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
          </div>

          {/* Preview pill */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs w-fit ${accent.pill}`}>
            <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
            {form.subject}{form.topic ? ` · ${form.topic}` : ''} · Answer: <strong>{form.correct_option}</strong>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/8 border border-transparent transition-all">
            Cancel
          </button>
          <button
            disabled={saving || !form.question_text.trim()}
            onClick={async () => {
              setSaving(true)
              await onSubmit({
                ...form,
                options: form.options.map((text, idx) => ({ label: labels[idx], text }))
              })
              setSaving(false)
              onClose()
            }}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManualEntryModal