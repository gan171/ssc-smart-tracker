import { useState } from 'react'

const SUBJECTS = ['Math', 'English', 'Reasoning', 'GK', 'Computer']

function ManualEntryModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_option: 'A',
    subject: 'Math',
    topic: ''
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-xl p-5 space-y-3">
        <h2 className="text-xl font-semibold">Manual Question Entry</h2>
        <textarea className="w-full border p-2 rounded" rows={4} placeholder="Question" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
        {['A', 'B', 'C', 'D'].map((label, idx) => (
          <input key={label} className="w-full border p-2 rounded" placeholder={`Option ${label}`} value={form.options[idx]} onChange={(e) => {
            const next = [...form.options]
            next[idx] = e.target.value
            setForm({ ...form, options: next })
          }} />
        ))}
        <div className="grid grid-cols-3 gap-2">
          <select className="border rounded p-2" value={form.correct_option} onChange={(e) => setForm({ ...form, correct_option: e.target.value })}>{['A','B','C','D'].map((v)=><option key={v} value={v}>{v}</option>)}</select>
          <select className="border rounded p-2" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>{SUBJECTS.map((v)=><option key={v} value={v}>{v}</option>)}</select>
          <input className="border rounded p-2" placeholder="Topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={async () => {
            await onSubmit(form)
            onClose()
          }} className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  )
}

export default ManualEntryModal
