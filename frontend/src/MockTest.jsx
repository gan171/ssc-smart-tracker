import { useState, useEffect } from 'react'
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { normalizeMathText } from './utils/mathText'

function MockTest({ questions, onComplete, onExit, timeLimit }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [marked, setMarked] = useState(new Set())
  const [timeRemaining, setTimeRemaining] = useState(timeLimit)
  const [showResults, setShowResults] = useState(false)
  const [showImageDescriptions, setShowImageDescriptions] = useState(false)

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || showResults) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, showResults])

  const formatTime = (seconds) => {
    if (seconds === null) return '∞'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswer = (option) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }))
  }

  const toggleMark = () => {
    setMarked(prev => {
      const newMarked = new Set(prev)
      if (newMarked.has(currentQuestion.id)) {
        newMarked.delete(currentQuestion.id)
      } else {
        newMarked.add(currentQuestion.id)
      }
      return newMarked
    })
  }

  const goToQuestion = (index) => setCurrentIndex(index)
  const nextQuestion = () => currentIndex < totalQuestions - 1 && setCurrentIndex(currentIndex + 1)
  const previousQuestion = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1)
  const handleSubmit = () => setShowResults(true)

  const calculateResults = () => {
    let correct = 0, incorrect = 0, unanswered = 0
    questions.forEach(q => {
      const userAnswer = answers[q.id]
      if (!userAnswer) unanswered++
      else if (userAnswer === q.correct_option) correct++
      else incorrect++
    })
    return { correct, incorrect, unanswered }
  }

  const RenderText = ({ content }) => (
    <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMathText(content)}
      </ReactMarkdown>
    </div>
  )

  if (showResults) {
    const results = calculateResults()
    const percentage = ((results.correct / totalQuestions) * 100).toFixed(1)

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
        <div className="max-w-4xl mx-auto">

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 mb-6">
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
              Test Complete! 🎉
            </h1>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{results.correct}</div>
                <div className="text-sm text-green-700 dark:text-green-300">Correct</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{results.incorrect}</div>
                <div className="text-sm text-red-700 dark:text-red-300">Incorrect</div>
              </div>
              <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <div className="text-3xl font-bold text-gray-600 dark:text-gray-300">{results.unanswered}</div>
                <div className="text-sm text-gray-700 dark:text-gray-400">Unanswered</div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">{percentage}%</div>
              <div className="text-gray-600 dark:text-gray-400">{results.correct} out of {totalQuestions} questions</div>
            </div>
          </div>

          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowImageDescriptions(!showImageDescriptions)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-all"
            >
              {showImageDescriptions ? <EyeOff size={16} /> : <Eye size={16} />}
              {showImageDescriptions ? 'Hide' : 'Show'} AI Descriptions
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const userAnswer = answers[q.id]
              const isCorrect = userAnswer === q.correct_option
              const wasAnswered = !!userAnswer

              return (
                <div key={q.id} className={`bg-white dark:bg-gray-900 rounded-xl p-6 border-l-4 ${
                  !wasAnswered ? 'border-gray-400' : isCorrect ? 'border-green-500' : 'border-red-500'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {!wasAnswered ? <AlertCircle className="text-gray-400" size={24} /> :
                       isCorrect ? <CheckCircle className="text-green-500" size={24} /> :
                       <XCircle className="text-red-500" size={24} />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-800 dark:text-white">Question {idx + 1}</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs rounded">{q.subject}</span>
                      </div>

                      {q.image_url && (
                        <div className="mb-4">
                          <img src={q.image_url} alt="Question" className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700" />
                        </div>
                      )}

                      {showImageDescriptions && q.question_context && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">AI Description:</div>
                          <div className="text-sm text-blue-800 dark:text-blue-200"><RenderText content={q.question_context} /></div>
                        </div>
                      )}

                      <div className="space-y-2 mb-3">
                        {q.options?.map(opt => (
                          <div key={opt.label} className={`p-3 rounded-lg border ${
                            opt.label === q.correct_option ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                            opt.label === userAnswer && !isCorrect ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                            'border-gray-200 dark:border-gray-700'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{opt.label}.</span>
                              <span className="flex-1 text-gray-800 dark:text-gray-200"><RenderText content={opt.text} /></span>
                              {opt.label === q.correct_option && <CheckCircle className="text-green-500 flex-shrink-0" size={16} />}
                              {opt.label === userAnswer && !isCorrect && <XCircle className="text-red-500 flex-shrink-0" size={16} />}
                            </div>
                            {showImageDescriptions && opt.is_visual && opt.visual_description && (
                              <div className="mt-2 ml-6 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                <span className="font-semibold text-blue-700 dark:text-blue-300">AI: </span>
                                <span className="text-blue-800 dark:text-blue-200"><RenderText content={opt.visual_description} /></span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="text-sm">
                        {!wasAnswered ? <span className="text-gray-500 dark:text-gray-400">Not answered</span> :
                         isCorrect ? <span className="text-green-600 dark:text-green-400 font-medium">✓ Correct!</span> :
                         <span className="text-red-600 dark:text-red-400 font-medium">Your answer: {userAnswer} | Correct answer: {q.correct_option}</span>}
                      </div>

                      {/* Show AI Analysis when toggle is ON */}
                      {showImageDescriptions && q.content?.detailed_analysis && (
                        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-orange-600 dark:text-orange-400 font-semibold text-sm">
                              🤖 AI Solution:
                            </span>
                          </div>
                          <div className="text-sm text-gray-800 dark:text-gray-200">
                            <RenderText content={q.content.detailed_analysis} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6">
            <button onClick={() => onComplete(answers)} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all">
              Save & Exit
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-4 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onExit} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-all text-gray-700 dark:text-gray-200">
              Exit Test
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-400">Question {currentIndex + 1} of {totalQuestions}</div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowImageDescriptions(!showImageDescriptions)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-all text-gray-700 dark:text-gray-300"
              title={showImageDescriptions ? 'Hide AI descriptions' : 'Show AI descriptions'}
            >
              {showImageDescriptions ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>

            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                timeRemaining < 60 ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                timeRemaining < 300 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
              }`}>
                <Clock size={20} />
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">

              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm font-semibold rounded-md">{currentQuestion.subject}</span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm rounded-md">{currentQuestion.topic}</span>
                </div>
                <button
                  onClick={toggleMark}
                  className={`p-2 rounded-lg transition-all ${
                    marked.has(currentQuestion.id)
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 hover:text-orange-500'
                  }`}
                  title="Mark for review"
                >
                  <Flag size={20} />
                </button>
              </div>

              {/* Image */}
              {currentQuestion.image_url && (
                <div className="mb-6">
                  <img src={currentQuestion.image_url} alt="Question" className="max-w-full h-auto rounded-lg border-2 border-gray-200 dark:border-gray-700" />
                </div>
              )}

              {/* ALWAYS show question text for readability */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Question {currentIndex + 1}:</h2>
                <div className="text-gray-700 dark:text-gray-200">
                  <RenderText content={currentQuestion.question_text} />
                </div>
              </div>

              {/* AI Context - ONLY when toggled */}
              {showImageDescriptions && currentQuestion.question_context && (
                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                  <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">AI Description:</div>
                  <div className="text-sm text-blue-800 dark:text-blue-200"><RenderText content={currentQuestion.question_context} /></div>
                </div>
              )}

              <div className="space-y-3 mb-6">
                {currentQuestion.options?.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => handleAnswer(opt.label)}
                    className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
                      answers[currentQuestion.id] === opt.label
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        answers[currentQuestion.id] === opt.label ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>{opt.label}</div>
                      <div className="flex-1 pt-1">
                        <div className="text-gray-800 dark:text-gray-200"><RenderText content={opt.text} /></div>
                        {showImageDescriptions && opt.is_visual && opt.visual_description && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                            <span className="font-semibold text-blue-700 dark:text-blue-300">AI: </span>
                            <span className="text-blue-800 dark:text-blue-200"><RenderText content={opt.visual_description} /></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button onClick={previousQuestion} disabled={currentIndex === 0} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  <ChevronLeft size={20} />Previous
                </button>
                {currentIndex === totalQuestions - 1 ? (
                  <button onClick={handleSubmit} className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-all">Submit Test</button>
                ) : (
                  <button onClick={nextQuestion} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">Next<ChevronRight size={20} /></button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 sticky top-4">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Question Palette</h3>

              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2 mb-4">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id]
                  const isMarked = marked.has(q.id)
                  const isCurrent = idx === currentIndex
                  return (
                    <button key={q.id} onClick={() => goToQuestion(idx)} className={`aspect-square rounded-lg font-semibold text-sm transition-all ${
                      isCurrent ? 'bg-blue-500 text-white shadow-md' :
                      isMarked ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-400' :
                      isAnswered ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>{idx + 1}</button>
                  )
                })}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2"><div className="w-6 h-6 bg-green-100 dark:bg-green-900/20 rounded"></div><span className="text-gray-600 dark:text-gray-400">Answered</span></div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded"></div><span className="text-gray-600 dark:text-gray-400">Not Answered</span></div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/20 rounded border border-orange-400"></div><span className="text-gray-600 dark:text-gray-400">Marked</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MockTest