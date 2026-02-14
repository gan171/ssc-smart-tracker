import { X, Brain, CheckCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { normalizeMathText } from '../utils/mathText'

function AnalysisModal({ isOpen, analysis, question, onClose }) {
  if (!isOpen) return null

  // Get analysis data from either new upload or existing question
  const data = analysis || (question?.content ?
    (typeof question.content === 'string' ? JSON.parse(question.content) : question.content)
    : null)

  if (!data && !question) return null

  // Use question data if analysis data not available
  const displayData = data || {
    subject: question?.subject,
    topic: question?.topic,
    question_text: question?.question_text,
    options: question?.options,
    correct_answer: question?.correct_option,
    detailed_analysis: question?.content?.detailed_analysis || "Analysis not available"
  }

  const RenderText = ({ content }) => (
    <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMathText(content)}
      </ReactMarkdown>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* FIXED: Make entire modal scrollable */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">

        {/* Sticky header with close button */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <div className="flex gap-2">
            {displayData.subject && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm font-semibold rounded-md">
                {displayData.subject}
              </span>
            )}
            {displayData.topic && (
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-md">
                {displayData.topic}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-8 space-y-6">

          {/* Question Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Question</h2>

            {/* Show image if available */}
            {question?.image_url && (
              <div className="mb-4">
                <img
                  src={question.image_url}
                  alt="Question"
                  className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
            )}

            {/* Question text - ALWAYS show */}
            <div className="text-gray-700 dark:text-gray-200 mb-4">
              <RenderText content={displayData.question_text} />
            </div>

            {/* Options - FIXED: Render LaTeX properly */}
            {displayData.options && displayData.options.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Options:</h3>
                <div className="space-y-2">
                  {displayData.options.map(opt => (
                    <div
                      key={opt.label}
                      className={`p-3 rounded-lg border ${
                        opt.label === displayData.correct_answer
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-800 dark:text-gray-200 flex-shrink-0">
                          {opt.label}.
                        </span>
                        <span className="flex-1 text-gray-800 dark:text-gray-200">
                          {/* FIXED: Render option text with LaTeX */}
                          <RenderText content={opt.text} />
                        </span>
                        {opt.label === displayData.correct_answer && (
                          <CheckCircle className="text-green-500 flex-shrink-0" size={16} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {displayData.correct_answer && (
                  <div className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                    ✓ Correct Answer: {displayData.correct_answer}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Analysis Section */}
          {displayData.detailed_analysis && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="text-orange-500" size={28} />
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Gemini's Analysis</h2>
              </div>
              <div className="leading-relaxed prose dark:prose-invert max-w-none">
                <RenderText content={displayData.detailed_analysis} />
              </div>
            </div>
          )}

          {/* Show user's note if exists */}
          {question?.manual_notes && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                📝 Your Notes
              </h3>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-gray-700 dark:text-gray-300">
                {question.manual_notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnalysisModal