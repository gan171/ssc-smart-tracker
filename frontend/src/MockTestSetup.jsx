import { useState } from 'react'
import { PlayCircle, Filter, Clock, Shuffle, ListChecks } from 'lucide-react'

function MockTestSetup({ mistakes, onStartTest, onCancel }) {
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [numQuestions, setNumQuestions] = useState(10)
  const [timeLimit, setTimeLimit] = useState(15) // minutes
  const [enableTimer, setEnableTimer] = useState(true)
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [onlyIncorrect, setOnlyIncorrect] = useState(false)

  const SUBJECTS = ['All', 'English', 'GK', 'Math', 'Reasoning']

  // Filter available questions
  const availableQuestions = mistakes.filter(m => {
    // Filter by subject
    if (selectedSubject !== 'All' && m.subject !== selectedSubject) return false

    // Filter by status
    if (selectedStatus === 'analyzed' && m.status !== 'analyzed') return false
    if (selectedStatus === 'unanalyzed' && m.status !== 'unanalyzed') return false

    // Filter by incorrectly answered
    if (onlyIncorrect) {
      const accuracy = m.times_attempted > 0
        ? (m.times_correct / m.times_attempted) * 100
        : null
      if (accuracy === null || accuracy >= 100) return false
    }

    // Must have options to be testable
    if (!m.options || m.options.length === 0) return false

    return true
  })

  const handleStartTest = () => {
    if (availableQuestions.length === 0) return

    // Select questions
    let selectedQuestions = [...availableQuestions]

    // Shuffle if enabled
    if (shuffleQuestions) {
      selectedQuestions = selectedQuestions.sort(() => Math.random() - 0.5)
    }

    // Limit number
    selectedQuestions = selectedQuestions.slice(0, Math.min(numQuestions, selectedQuestions.length))

    // Start test with configuration
    onStartTest({
      questions: selectedQuestions,
      timeLimit: enableTimer ? timeLimit * 60 : null, // convert to seconds
      shuffled: shuffleQuestions
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Create Mock Test 📝
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your test settings and start practicing
          </p>
        </div>

        {/* Filter Section */}
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800 dark:text-white">Filter Questions</h3>
          </div>

          {/* Subject Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(subject => {
                const count = subject === 'All'
                  ? mistakes.length
                  : mistakes.filter(m => m.subject === subject && m.options?.length > 0).length

                return (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedSubject === subject
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {subject} <span className="text-sm opacity-75">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedStatus('All')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedStatus === 'All'
                    ? 'bg-gray-700 dark:bg-gray-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedStatus('analyzed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedStatus === 'analyzed'
                    ? 'bg-green-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                }`}
              >
                Analyzed
              </button>
              <button
                onClick={() => setSelectedStatus('unanalyzed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedStatus === 'unanalyzed'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                }`}
              >
                Unanalyzed
              </button>
            </div>
          </div>

          {/* Only Incorrect */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyIncorrect}
                onChange={(e) => setOnlyIncorrect(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Only include questions I got wrong before
              </span>
            </label>
          </div>
        </div>

        {/* Test Configuration */}
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks size={20} className="text-purple-500" />
            <h3 className="font-semibold text-gray-800 dark:text-white">Test Settings</h3>
          </div>

          {/* Number of Questions */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Questions: <span className="text-blue-600 dark:text-blue-400">{numQuestions}</span>
            </label>
            <input
              type="range"
              min="5"
              max={Math.min(50, availableQuestions.length)}
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>5</span>
              <span>{Math.min(50, availableQuestions.length)} (max available)</span>
            </div>
          </div>

          {/* Timer */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={enableTimer}
                onChange={(e) => setEnableTimer(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <Clock size={18} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Timer
              </span>
            </label>

            {enableTimer && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Time Limit: <span className="text-blue-600 dark:text-blue-400">{timeLimit} minutes</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>5 min</span>
                  <span>60 min</span>
                </div>
              </div>
            )}
          </div>

          {/* Shuffle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <Shuffle size={18} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Shuffle question order
              </span>
            </label>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Test Summary</h4>
          <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
            <p>• {availableQuestions.length} questions available with your filters</p>
            <p>• Test will have {Math.min(numQuestions, availableQuestions.length)} questions</p>
            {enableTimer && <p>• Time limit: {timeLimit} minutes</p>}
            {!enableTimer && <p>• No time limit (practice mode)</p>}
            {shuffleQuestions && <p>• Questions will be randomized</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleStartTest}
            disabled={availableQuestions.length === 0}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayCircle size={20} />
            Start Test ({Math.min(numQuestions, availableQuestions.length)} Questions)
          </button>
        </div>

        {availableQuestions.length === 0 && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center text-red-600 dark:text-red-400">
            No questions available with current filters. Try adjusting your selection.
          </div>
        )}
      </div>
    </div>
  )
}

export default MockTestSetup