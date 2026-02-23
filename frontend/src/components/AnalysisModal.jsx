import { ChevronLeft, ChevronRight, X, Brain, CheckCircle, Lightbulb, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { normalizeMathText, formatAnalysisText } from '../utils/mathText';

function AnalysisModal({ isOpen, analysis, question, onClose, onPrev, onNext, hasPrev = false, hasNext = false }) {
  if (!isOpen) return null;

  const data = analysis || (question?.content ?
    (typeof question.content === 'string' ? JSON.parse(question.content) : question.content)
    : null);

  if (!data && !question) return null;

  const displayData = data || {
    subject: question?.subject,
    topic: question?.topic,
    question_text: question?.question_text,
    options: question?.options,
    correct_answer: question?.correct_option,
    detailed_analysis: question?.content?.detailed_analysis || 'Analysis not available'
  };

  const RenderText = ({ content, wrapExpression = false, className = '' }) => (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-8 mb-4 border-b-2 border-blue-100 dark:border-blue-900 pb-2 flex items-center gap-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-6 mb-3 flex items-center gap-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h5 className="text-base font-bold text-gray-700 dark:text-gray-300 mt-4 mb-2 uppercase tracking-wide" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <span className="font-bold text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/30 px-1 rounded mx-0.5" {...props} />
          ),
          ul: ({ node, ...props }) => <ul className="list-none space-y-2 my-4" {...props} />,
          li: ({ node, ...props }) => (
            <li className="flex gap-2 text-gray-700 dark:text-gray-300">
              <span className="text-blue-500 mt-1.5">•</span>
              <span className="flex-1" {...props} />
            </li>
          ),
          blockquote: ({ node, ...props }) => (
            <div className="my-6 border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-900/10 p-4 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2 text-orange-700 dark:text-orange-400 font-bold text-sm uppercase tracking-wider">
                <Lightbulb size={16} /> Important Note
              </div>
              <div className="italic text-gray-700 dark:text-gray-300" {...props} />
            </div>
          ),
          hr: ({ node, ...props }) => <hr className="my-8 border-gray-200 dark:border-gray-700 border-dashed" {...props} />,
          p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300 text-[15px]" {...props} />
        }}
      >
        {normalizeMathText(content, { wrapExpression })}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl border border-gray-200 dark:border-gray-800">

        <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <div className="flex gap-2">
            {displayData.subject && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-bold uppercase tracking-wider rounded-full">
                {displayData.subject}
              </span>
            )}
            {displayData.topic && (
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider rounded-full">
                {displayData.topic}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="p-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous question"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="p-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next question"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Original Question</h2>

            {question?.image_url ? (
              <div className="mb-6">
                <img
                  src={question.image_url}
                  alt="Question"
                  className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                />
              </div>
            ) : (
              <div className="mb-6 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg px-3 py-2">
                Screenshot preview unavailable for this upload. This usually happens when storage upload is blocked.
              </div>
            )}

            <div className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              <RenderText content={displayData.question_text} />
            </div>

            {displayData.options && displayData.options.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayData.options.map(opt => (
                  <div
                    key={opt.label}
                    className={`p-4 rounded-xl border transition-all ${
                      opt.label === displayData.correct_answer
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm ring-1 ring-green-500/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        opt.label === displayData.correct_answer
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {opt.label}
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        <RenderText content={opt.text} wrapExpression />
                      </span>
                      {opt.label === displayData.correct_answer && (
                        <CheckCircle className="text-green-500 ml-auto flex-shrink-0" size={18} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {displayData.detailed_analysis && (
            <div className="relative">
              <div className="absolute left-4 -top-8 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-blue-200 to-transparent dark:from-gray-700 dark:via-blue-900 hidden md:block"></div>

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400 shadow-sm">
                  <Brain size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Smart Analysis</h2>
              </div>

              <div className="pl-0 md:pl-4">
                <RenderText
                  content={formatAnalysisText(displayData.detailed_analysis)}
                  className="text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
          )}

          {question?.manual_notes && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="p-1 bg-yellow-100 dark:bg-yellow-900/50 rounded text-yellow-600">
                  <AlertTriangle size={14} />
                </span>
                Your Notes
              </h3>
              <div className="p-5 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl text-gray-800 dark:text-gray-200 italic leading-relaxed shadow-sm">
                "{question.manual_notes}"
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalysisModal;
